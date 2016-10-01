import os
import gpgme
import io

import config

class GPGContext(object):
    INSTANCE = None

    def __init__(self):
        # create context
        self._ctx = gpgme.Context()
        self._ctx.armor = True
        print "Created GPG context"

    def __getattr__(self, attr):
        return getattr(self._ctx, attr)


if GPGContext.INSTANCE is None:
    GPGContext.INSTANCE = GPGContext()


class Message(object):
    def __init__(self, js_dict):
        self.sender    = js_dict['sender']
        self.message   = js_dict['message']
        self.id        = js_dict['id']

        self.decrypted = False
        self.signed_by = None
        self.valid_sig = False

        self.error     = None

    def serialise(self):
        return self.__dict__

def decrypt_message(msg):
    decrypt_key_id = config.get_item("keys.self")

    # find decryption key
    decrypt_key, error = get_single_key(decrypt_key_id, True)
    if error:
        return error

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

    print "Decrypted message #%d: %s" % (msg.id, msg.message)

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
