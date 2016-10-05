import os
import json
import gpgme
import io
from urllib import quote_plus, unquote
from threading import Lock

import config
from constants import join_list

class GPGContext(object):
    INSTANCE = None
    LOCK     = Lock()

    def __init__(self):
        # create context
        self._ctx = gpgme.Context()
        self._ctx.armor = True
        print "Created GPG context"

    def __getattr__(self, attr):
        return getattr(self._ctx, attr)


if GPGContext.INSTANCE is None:
    GPGContext.INSTANCE = GPGContext()


class DecryptedMessage(object):
    def __init__(self, json_string):
        js_dict         = json.loads(json_string)

        self.sender     = js_dict['sender']
        self.message    = js_dict['message']
        self.id         = js_dict['id']

        self.decrypted  = False
        self.signed_by  = None
        self.valid_sig  = False

        self.error      = None

    def serialise(self):
        return self.__dict__

class EncryptedMessage(object):
    def __init__(self, json_string):
        js_dict         = json.loads(json_string)

        self.message    = js_dict['message']
        self.recipients = js_dict['recipients']

        self.encrypted  = False
        self.signed     = None

        self.error      = None

    def serialise(self):
        return self.__dict__

def _get_secret_key():
    seckey_id = config.get_item("keys.self")
    return get_single_key(seckey_id, True)


def decrypt_message(msg):
    with GPGContext.LOCK:
        config.reload()

        # find decryption key
        decrypt_key, error = _get_secret_key()
        if error:
            msg.error = error
            return

        # attempt decryption
        in_buf  = io.BytesIO(msg.message.encode("utf8"))
        out_buf = io.BytesIO()

        try:
            signing_sigs  = GPGContext.INSTANCE.decrypt_verify(in_buf, out_buf)
            msg.message   = out_buf.getvalue().decode("utf8").rstrip('\n')
            msg.decrypted = True
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
        sig = signing_sigs[0]
        msg.signed_by = sig.fpr[-8:]
        # TODO also get identity and master key if possible

        # invalid signature
        if sig.status is not None:
            msg.error = "Failed to verify signature by '%s': %s" % (by, sig.status)
            return

        msg.valid_sig = True


def encrypt_message(msg):
    # ensure all recipients have corresponding keys
    enc_key_ids  = []
    missing_keys = []
    config.reload()
    contacts     = config.get_item("keys.contacts")
    for r in msg.recipients:
        try:
            user = contacts[r['fbid']]
            enc_key_ids.append(user['key'])
        except KeyError:
            missing_keys.append(r)

    # validate
    if missing_keys:
        names = map(lambda r: "%s (%s)" % (r['name'], r['fbid']), missing_keys)
        msg.error = "Missing %d fbid:pubkey mapping(s) required for encryption from %s" % (len(names), join_list(names))
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

        # get signing key
        sign_key, error = _get_secret_key()
        if error:
            msg.error = error
            return
        GPGContext.INSTANCE.signers = [sign_key]

        # attempt encryption
        in_buf  = io.BytesIO(unquote(msg.message.encode("utf8")))
        out_buf = io.BytesIO()

        try:
            signing_sigs  = GPGContext.INSTANCE.encrypt_sign(enc_keys, gpgme.ENCRYPT_ALWAYS_TRUST, in_buf, out_buf)
            msg.message   = quote_plus(out_buf.getvalue().decode("utf8"))
            msg.encrypted = True
            msg.signed    = len(signing_sigs) == 1
        except gpgme.GpgmeError as e:
            msg.error = "Failed to encrypt: %s" % e.message.lower()
            return


def get_single_key(keyid, secret=False):
    ret   = None
    error = None
    keys  = list(GPGContext.INSTANCE.keylist(keyid, secret))
    if not keys:
        error = "Key '%s' not found" % keyid
    elif len(keys) != 1:
        error = "Multiple keys found with id '%s', be more specific" % keyid
    else:
        ret = keys[0];

    return ret, error
