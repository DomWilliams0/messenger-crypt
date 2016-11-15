import io
import json
import threading
from urllib import quote_plus, unquote

import gpgme

import config
import settings
from constants import join_list
import keys


class GPGContext(object):
    INSTANCE = None
    LOCK     = threading.Lock()

    def __init__(self):
        # create context
        self._ctx = gpgme.Context()
        self._ctx.armor = True
        # print "Created GPG context"

    def __getattr__(self, attr):
        return getattr(self._ctx, attr)

    def set_signing_key(self, key):
        self._ctx.signers = [key]


if GPGContext.INSTANCE is None:
    GPGContext.INSTANCE = GPGContext()


class DecryptedMessage(object):
    def __init__(self, js_dict):
        self.message    = js_dict['message']
        self.id         = js_dict['id']

        self.decrypted  = False
        self.signed_by  = None
        self.valid_sig  = False

        self.error      = None

    def serialise(self):
        return self.__dict__


class EncryptedMessage(object):
    def __init__(self, js_dict):
        self.message    = js_dict['message']
        self.recipients = js_dict['recipients']
        self.id         = js_dict['id']

        self.encrypted  = False
        self.signed     = None

        self.error      = None

    def serialise(self):
        return self.__dict__


def _get_secret_key(decrypting):
    key_user = keys.get_encryption_key() if decrypting else keys.get_signing_key()
    return get_single_key(key_user['key'], True) if key_user else (None, "Secret key not found")


def decrypt_message(msg):
    with GPGContext.LOCK:
        config.reload()

        # find what we have to do
        is_just_signed = msg.message.startswith("-----BEGIN PGP SIGNED")
        is_encrypted   = msg.message.startswith("-----BEGIN PGP MESSAGE")

        # nothing!
        if not is_just_signed and not is_encrypted:
            return

        if is_encrypted:
            # find decryption key
            decrypt_key, error = _get_secret_key(True)
            if error:
                msg.error = error
                return

        # off we go
        in_buf  = io.BytesIO(msg.message.encode("utf8"))
        out_buf = io.BytesIO()

        try:
            # no decryption needed
            if is_just_signed:
                signing_sigs = GPGContext.INSTANCE.verify(in_buf, None, out_buf)

                # something messed up
                if not signing_sigs:
                    msg.error = "Failed to verify message"
                    msg.message = "-----BEGIN PGP SIGNED MESSAGE-----\n...\n...\n-----END PGP SIGNATURE-----"
                    return


            # encryption and maybe signing too
            else:
                signing_sigs  = GPGContext.INSTANCE.decrypt_verify(in_buf, out_buf)

            msg.message   = out_buf.getvalue().decode("utf8").rstrip('\n')
            msg.decrypted = is_encrypted

        except gpgme.GpgmeError as e:
            msg.error = "Failed to decrypt: %s" % e.message.lower()
            msg.message = "-----BEGIN PGP MESSAGE-----\n...\n...\n-----END PGP MESSAGE-----"
            return

        # /how/ many signatures?
        if len(signing_sigs) > 1:
            msg.error = "Multiple signatures? Surely you jest!"
            return

        # ensure correctly signed if actually signed
        if signing_sigs:
            sig       = signing_sigs[0]
            fpr       = sig.fpr
            signed_by = fpr[-8:]

            # find key
            signing_key, error = get_single_key(fpr)
            if signing_key:
                # find master key and uid
                master_key = signing_key.subkeys[0]
                uid = signing_key.uids[0]

                # show master key if subkey used
                if fpr != master_key.fpr:
                    signed_by = master_key.fpr[-8:]

                signed_by = "%s (%s)" % (uid.name, signed_by)

            msg.signed_by = signed_by

            # invalid signature
            if sig.status is not None:
                msg.error = "Failed to verify signature by %s: %s" % (signed_by, sig.status.strerror)
                return

            msg.valid_sig = True


def decrypt_message_handler(msg):
    parsed = json.loads(msg)
    resp = []
    for message in parsed['messages']:
        dmsg = DecryptedMessage(message)
        decrypt_message(dmsg)
        resp.append(dmsg.serialise())

    return json.dumps({"messages": resp})


def encrypt_message(msg):
    # check config
    convo_config = settings.get_convo_settings(msg.id)
    pls_encrypt  = convo_config['encryption']
    pls_sign     = convo_config['signing']

    # nothing to do here
    if not pls_encrypt and not pls_sign:
        return

    # ensure all recipients have corresponding keys
    if pls_encrypt:
        enc_key_ids  = []
        missing_keys = []

        for r in msg.recipients:
            user = keys.get_key(r['fbid'])
            if user is not None:
                enc_key_ids.append(user['key'])
            else:
                missing_keys.append(r)

        # validate
        if missing_keys:
            names = map(lambda r: "%s (%s)" % (r['name'], r['fbid']), missing_keys)
            msg.error = "Missing %d fbid:pubkey mapping(s) required for encryption from %s" % (
                len(names), join_list(names))
            return

        if not enc_key_ids:
            msg.error = "There are no keys to encrypt for, something went horribly wrong"
            return

        with GPGContext.LOCK:
            # gather keys
            enc_keys     = []
            invalid_keys = []
            for kid in enc_key_ids:
                key, _ = get_single_key(kid)
                if key is not None:
                    enc_keys.append(key)
                else:
                    invalid_keys.append(kid)

            if invalid_keys:
                msg.error = "Missing public key(s) for %s" % join_list(invalid_keys)
                return

            # add self
            self_keyid = keys.get_encryption_key()
            if self_keyid is None:
                error = "Personal key not specified"
            else:
                self_key, error = get_single_key(self_keyid['key'])

            if error:
                msg.error = "Failed to get own public key: %s" % error[0].lower() + error[1:]
                return

            enc_keys.append(self_key)

    with GPGContext.LOCK:
        if pls_sign:
            # get signing key
            sign_key, error = _get_secret_key(False)
            if error:
                msg.error = error
                return

            GPGContext.INSTANCE.set_signing_key(sign_key)

        # off we go
        in_buf  = io.BytesIO(unquote(msg.message.encode("utf8")))
        out_buf = io.BytesIO()

        try:
            # encryption involved
            if pls_encrypt:

                # signing too
                if pls_sign:
                    func = GPGContext.INSTANCE.encrypt_sign
                else:
                    func = GPGContext.INSTANCE.encrypt

                # returns list of signing keys if signed
                signing_sigs = func(enc_keys, gpgme.ENCRYPT_ALWAYS_TRUST, in_buf, out_buf)

            # only signing
            else:
                signing_sigs = GPGContext.INSTANCE.sign(in_buf, out_buf, gpgme.SIG_MODE_CLEAR)

            msg.message   = quote_plus(out_buf.getvalue().decode("utf8"))
            msg.signed    = pls_sign and len(signing_sigs) == 1
            msg.encrypted = pls_encrypt

        except gpgme.GpgmeError as e:
            msg.error = "Failed to encrypt: %s" % e.message.lower()
            return

def encrypt_message_handler(msg):
    msg = EncryptedMessage(json.loads(msg))
    encrypt_message(msg)
    return json.dumps(msg.serialise())

def get_single_key(keyid, secret=False):
    ret   = None
    error = None
    key_str = "Secret key" if secret else "Public key"

    filter_revoked = config['settings.ignore-revoked']
    keys  = [k for k in GPGContext.INSTANCE.keylist(keyid, secret) if not (filter_revoked and k.revoked)]
    if keyid is None:
        error = "Null %s" % key_str.lower()
    elif not keys:
        error = "%s '%s' not found" % (key_str, keyid)
    elif len(keys) != 1:
        error = "Multiple %ss found with id '%s', be more specific" % (key_str.lower(), keyid)
    else:
        ret = keys[0]

    return ret, error
