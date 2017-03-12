import config as conf
import gpgme
from io import BytesIO

gpg = gpgme.Context()
gpg.armor = True


class DecryptResult(object):
    def __init__(self):
        self.error = None
        self.plaintext = ""
        self.was_decrypted = False

        self.good_sig = False
        self.signer = ""

def _dummy_pgp_message(signed):
    sub = ("SIGNED MESSAGE", "SIGNATURE") if signed else ("MESSAGE", "MESSAGE")
    return "-----BEGIN PGP %s-----\n...\n...\n-----END PGP %s-----" 

def decrypt(config, message):
    result = DecryptResult()

    # what do
    is_just_signed = message.startswith("-----BEGIN PGP SIGNED");
    is_encrypted = message.startswith("-----BEGIN PGP MESSAGE");

    # nothing!
    if not is_just_signed and not is_encrypted:
        return result

    # create buffers
    buf_i = BytesIO(message.encode("utf8"))
    buf_o = BytesIO()

    try:
        # just verify
        if is_just_signed:
            sigs = gpg.verify(buf_i, None, buf_o)
            if not sigs:
                result.error = "Failed to verify message"
                result.plaintext = _dummy_pgp_message(True)
                return result

        # decrypt with possible signing
        else:
            sigs = gpg.decrypt_verify(buf_i, buf_o)

        result.plaintext = buf_o.getvalue().decode("utf8").rstrip("\n")
        result.was_decrypted = is_encrypted

    except gpgme.GpgmeError as e:
        result.error = "Failed to decrypt: %s" % e.message.lower()
        result.plaintext = _dummy_pgp_message(False)
        return result

    # only one signature allowed
    if len(sigs) > 1:
        result.error = "Multiple signatures? Surely you jest!"
        return result

    # validate signature
    if sigs:
        sig = sigs[0]
        fpr = sig.fpr
        who = fpr[-8:]

        # find key to get uid
        signing_key, error = get_single_key(fpr)
        if signing_key:
            master = signing_key.subkeys[0]
            uid = signing_key.uids[0]

            # show master key if subkey used
            if fpr != master.fpr:
                who = master.fpr[-8:]

            # get name
            who = "%s (%s)" % (uid.name, who)

        result.signer = who

        # invalid signature
        if sig.status is not None:
            result.error = "Failed to verify signature by %s: %s" % (who, sig.status.strerror)
        else:
            result.good_sig = True

    return result

class EncryptResult(object):
    def __init__(self):
        self.ciphertext = ""
        self.is_encrypted = False
        self.is_signed = False
        self.error = ""

def _join_list(l):
    length = len(l)

    if length == 0:
        return ""
    if length == 1:
        return str(l[0])

    strs = map(str, l)
    return "%s and %s" % (", ".join(strs[:-1]), strs[-1])

def encrypt(config, to_encrypt, to_sign,  message, recipients):
    result = EncryptResult()

    # nothing to do
    if not to_encrypt and not to_sign:
        result.ciphertext = message
        return result

    # find public keys for recipients
    if to_encrypt:
        pub_keys = []
        missing = []

        for r in recipients:
            user_id = r["fbid"]

            pub_key, error = get_single_key(user_id)

            if pub_key is None:
                missing.append(r)
            else:
                pub_keys.append(pub_key)

        # assert all keys were found
        if missing:
            names = map(lambda r: "%s (%s)" % (r['name'], r['fbid']), missing)
            import sys
            sys.stderr.write("names are %s" % str(names))
            result.error = "Missing %d fbid:pubkey mapping(s) required for encryption from %s" % (len(names), _join_list(names))
            return result

        # assert at least 1 key was found
        elif not pub_keys:
            result.error = "There are no keys to encrypt for, something went horribly wrong"
            return result

        # add own public key too
        self_keyid = "me@domwillia.ms" # TODO lookup in config too
        if not self_keyid:
            personal_error = "Personal public key not specified"
        else:
            self_key, personal_error = get_single_key(self_keyid)

        if personal_error:
            result.error = "Failed to get own public key: %s" % personal_error[0].lower() + personal_error[1:]
            return result

        pub_keys.append(self_key)

    # get signing key
    if to_sign:
        sign_keyid = "me@domwillia.ms" # TODO get from config
        if not sign_keyid:
            sign_error = "Personal signing key not specified"
        else:
            sign_key, sign_error = get_single_key(sign_keyid, True)

        if sign_error:
            result.error = "Failed to get own signing key: %s" % sign_error[0].lower() + sign_error[1:]
            return result

        gpg.signers = [sign_key]

    # create buffers
    buf_i = BytesIO(message.encode("utf8"))
    buf_o = BytesIO()

    try:
        if to_encrypt:
            # choose right function
            func = gpg.encrypt_sign if to_sign else gpg.encrypt
            signers = func(pub_keys, 0, buf_i, buf_o)

        # signing only
        else:
            signers = gpg.sign(buf_i, buf_o, gpgme.SIG_MODE_CLEAR)

        result.ciphertext = buf_o.getvalue().decode("utf8")
        result.is_signed = to_sign and len(signers) == 1
        result.is_encrypted = to_encrypt

    except gpgme.GpgmeError as e:
        result.error = "Failed to encrypt: %s" % e.message.lower()

    return result


# returns (key, error)
def get_single_key(keyid, secret=False):
    ret   = None
    error = None
    key_str = "Secret key" if secret else "Public key"

    filter_revoked = True # config['settings.ignore-revoked']
    keys  = [k for k in gpg.keylist(keyid, secret) if not (filter_revoked and k.revoked)]
    if keyid is None:
        error = "Null %s" % key_str.lower()
    elif not keys:
        error = "%s '%s' not found" % (key_str, keyid)
    elif len(keys) != 1:
        error = "Multiple %ss found with id '%s', be more specific" % (key_str.lower(), keyid)
    else:
        ret = keys[0]

    return ret, error
