#!/usr/bin/env python2

import struct
import sys
import json
import os
import config as conf
import crypto

CONFIG_PATH = os.path.join(os.environ["HOME"], ".config/messenger_crypt.json")
config = conf.Config(CONFIG_PATH)

def send_raw_message(msg, stream=sys.stdout):
    stream.write(struct.pack('I', len(msg)))
    stream.write(msg)
    stream.flush()

def send_response(what, content):
    send_raw_message(json.dumps({
        "what": what,
        "content": content
    }))


def main():
    enforce_binary()

    while True:
        length_bin = sys.stdin.read(4)
        if not length_bin:
            break

        length = struct.unpack("i", length_bin)[0]
        content = sys.stdin.read(length)
        parsed = json.loads(content)

        what = parsed.get("what")
        content = parsed.get("content")
        if what is None or content is None:
            continue

        handler = globals().get("handler_%s" % what)
        if handler:
            handler(content)

def handler_decrypt(content):
    resp = []
    for message in content:
        msg_id = message.get("id")
        msg = message.get("message")
        if msg_id is None or msg is None:
            continue

        # decrypt
        dec_result = crypto.decrypt(config, msg)
        del message["message"]
        message["error"] = dec_result.error
        message["signer"] = dec_result.signer
        message["good_sig"] = dec_result.good_sig
        message["was_decrypted"] = dec_result.was_decrypted
        message["plaintext"] = dec_result.plaintext

        resp.append(message)

    send_response("decrypt", resp)


def handler_encrypt(content):
    msg = content.get("message")
    recipients = content.get("recipients")
    convo = content.get("id")
    if msg is None or recipients is None or convo is None:
        return

    # TODO lookup from settings with convo as key
    to_encrypt = True
    to_sign = True

    # TODO actually encrypt/sign as needed
    enc_result = crypto.encrypt(config, to_encrypt, to_sign,  msg, recipients)
    del content["message"]
    content["ciphertext"] = enc_result.ciphertext
    content["error"] = enc_result.error

    send_response("encrypt", content)


def enforce_binary():
    # On Windows, the default I/O mode is O_TEXT. Set this to O_BINARY
    # to avoid unwanted modifications of the input/output streams.
    if sys.platform == "win32":
      import msvcrt
      msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
      msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

if __name__ == "__main__":
    main()
