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
