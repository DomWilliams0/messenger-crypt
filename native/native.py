#!/usr/bin/env python2

import struct
import sys

def main():
    enforce_binary()

    # send a simple hello
    msg = '{"message": "hello"}'
    sys.stdout.write(struct.pack('I', len(msg)))
    sys.stdout.write(msg)
    sys.stdout.flush()

    # listen for hellos
    while True:
        length_bin = sys.stdin.read(4).encode("utf-8")
        if not length_bin:
            break

        length = struct.unpack("i", length_bin)[0]
        content = sys.stdin.read(length)

        # do nothing with them


def enforce_binary():
    # On Windows, the default I/O mode is O_TEXT. Set this to O_BINARY
    # to avoid unwanted modifications of the input/output streams.
    if sys.platform == "win32":
      import os, msvcrt
      msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
      msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

if __name__ == "__main__":
    main()
