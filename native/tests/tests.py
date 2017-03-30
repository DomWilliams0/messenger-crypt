#!/usr/bin/env python2

import sys
import subprocess
import io
import struct
import json

# declare all test modules here
import tests_protocol

class ProcessInstance(object):
    EXE_PATH = "../bin/messenger_crypt_native" # TODO ooer

    def __init__(self):
        try:
            self.p = subprocess.Popen(self.EXE_PATH, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
        except OSError as e:
            sys.stderr.write("Failed to start process: %s\n" % e)
            sys.exit(1)

    # req is json
    def send_request(self, req):
        raw = json.dumps(req)
        out = io.BytesIO()
        out.write(struct.pack("I", len(raw)))
        out.write(raw)
        out.flush()

        return self._send(out)

    # req is a string
    def send_raw_request(self, req):
        return self._send(io.BytesIO(req))

    # req is a filelike object
    def _send(self, req):
        req.seek(0)
        resp = self.p.communicate(req.read())
        return resp[0]


def _get_tests(what):
    import types
    modules = {k: v for (k, v) in globals().items() if isinstance(v, types.ModuleType)}

    if what is None or what == "all":
        return [m for m in modules.values() if m.__name__.startswith("tests_")]

    test = modules.get("tests_%s" % what, None)
    if test is None:
        return []

    return [test]

def run_tests(what):
    tests = _get_tests(what)
    if not tests:
        sys.stderr.write("No test suites found\n");
        sys.exit(1)

    instance = ProcessInstance()

    pass_count = 0
    for t in tests:
        name = t.__name__[len("tests_"):]

        entry = getattr(t, "run_tests", None)
        if not entry:
            sys.stderr.write("Missing entry point 'run_tests' in test module '%s'\n" % name)
            continue

        sys.stdout.write("----- BEGIN TEST SUITE '%s'\n" % name)
        success = entry(instance)

        if success is True:
            pass_count += 1

        sys.stdout.write("===== %s TEST SUITE '%s'\n\n" % ("PASS" if success else "FAIL", name))

    sys.stdout.write("Passed %d/%d tests\n" % (pass_count, len(tests)))
    sys.exit(0 if pass_count == len(tests) else 3)


if __name__ == "__main__":
    what = None
    if len(sys.argv) >= 2:
        what = sys.argv[1]

    run_tests(what)
