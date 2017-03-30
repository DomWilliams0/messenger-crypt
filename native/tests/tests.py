#!/usr/bin/env python2

import errno
import sys
import subprocess
import io
import struct
import json

# declare all test modules here
import tests_protocol

failed_suite = False

class ProcessInstance(object):
    EXE_PATH = "../bin/messenger_crypt_native" # TODO ooer

    # req is json
    def send_request(self, req):
        raw = json.dumps(req)
        out = io.BytesIO()
        out.write(struct.pack("I", len(raw)))
        out.write(raw)
        out.flush()

        return self._send(out)

    # req is a string or filelike object
    def send_raw_request(self, req):
        if isinstance(req, str):
            req = io.BytesIO(req)
        return self._send(req)

    # req is a filelike object
    def _send(self, req):
        try:
            req.seek(0)
            proc = subprocess.Popen(self.EXE_PATH, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
            resp = proc.communicate(req.read())

            # bad exit code
            if proc.poll() != 0:
                return None

            return resp[0]
        except OSError as e:
            sys.stderr.write("Failed to start process: %s\n" % e)
            sys.exit(1)


    def do_assert(self, what, input, expected_out, send_raw=False):
        send_func = self.send_raw_request if send_raw else self.send_request
        sys.stdout.write("%s ... " % what)
        sys.stdout.flush()
        resp = send_func(input)
        if resp != expected_out:
            sys.stdout.write("FAIL\n")
            sys.stdout.flush()
            global failed_suite
            failed_suite = True
            return

        sys.stdout.write("PASS\n")
        sys.stdout.flush()

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

        global failed_suite
        failed_suite = False

        entry(instance)

        if failed_suite is False:
            pass_count += 1

        sys.stdout.write("===== %s TEST SUITE '%s'\n\n" % ("FAIL" if failed_suite else "PASS", name))

    sys.stdout.write("Passed %d/%d tests\n" % (pass_count, len(tests)))
    sys.exit(0 if pass_count == len(tests) else 3)


if __name__ == "__main__":
    what = None
    if len(sys.argv) >= 2:
        what = sys.argv[1]

    run_tests(what)
