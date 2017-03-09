#!/usr/bin/env python2

import struct
import sys
import json

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
        length_bin = sys.stdin.read(4).encode("utf-8")
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

        # TODO actually decrypt
        message["message"] = "A lovely decrypted message, #%d in fact" % msg_id

        resp.append(message)

    send_response("decrypt", resp)


def handler_encrypt(content):
    pass


def enforce_binary():
    # On Windows, the default I/O mode is O_TEXT. Set this to O_BINARY
    # to avoid unwanted modifications of the input/output streams.
    if sys.platform == "win32":
      import os, msvcrt
      msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
      msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

if __name__ == "__main__":
    main()
