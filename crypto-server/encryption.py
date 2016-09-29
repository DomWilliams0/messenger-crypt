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
    decrypt_key_id = config['keys.decryption']

    # find decryption key
    decrypt_keys = list(GPGContext.INSTANCE.keylist(decrypt_key_id, True))
    if not decrypt_keys:
        msg.error = "Secret key '%s' not found" % decrypt_key_id
        return
    if len(decrypt_keys) != 1:
        msg.error = "Multiple secret keys found with id '%s', be more specific" % decrypt_key_id
        return

    decrypt_key = decrypt_keys[0]

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
        msg.signed_by = sig.fpr

        # invalid signature
        if sig.status is not None:
            msg.error = "Failed to verify signature by '%s': %s" % (by, sig.status)
            return

        msg.valid_sig = True
