#!/usr/bin/env python2

import sys

# declare all test modules here
import tests_protocol

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

    pass_count = 0
    for t in tests:
        name = t.__name__[len("tests_"):]

        entry = getattr(t, "run_tests", None)
        if not entry:
            sys.stderr.write("Missing entry point 'run_tests' in test module '%s'\n" % name)
            continue

        sys.stdout.write("----- BEGIN TEST SUITE '%s'\n" % name)
        success = entry()

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
