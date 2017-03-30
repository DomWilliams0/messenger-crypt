import struct

def test_invalid(process):
    process.do_assert("Bad junk", "thisisnotvalid", "", send_raw=True)
    process.do_assert("Empty json", {}, "")

    test_data = {"a": "b", "c": 50}
    process.do_assert("Silly json", test_data, "")


def run_tests(process):
    test_invalid(process)
