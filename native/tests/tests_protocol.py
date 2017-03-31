import struct
import io
import json

def null_predicate(input, resp):
    return resp == ""

def test_raw(process):
    process.do_assert("Bad junk", "thisisnotvalid", null_predicate, send_raw=True)
    process.do_assert("Empty json", {}, null_predicate)

    test_data = {"a": "b", "c": 50}
    process.do_assert("Silly json", test_data, null_predicate)

    serialised = json.dumps(test_data)
    ser_len = len(serialised)
    bad_buf = io.BytesIO()
    bad_buf.write(struct.pack("I", 0))
    bad_buf.write(serialised)

    process.do_assert("Size 0", bad_buf, null_predicate, send_raw=True)

    bad_buf.seek(0)
    bad_buf.write(struct.pack("I", ser_len / 2))
    process.do_assert("Size too small", bad_buf, null_predicate, send_raw=True)

    bad_buf.seek(0)
    bad_buf.write(struct.pack("I", ser_len * 2))
    process.do_assert("Size too big", bad_buf, null_predicate, send_raw=True)

def test_json(process):
    msg = { "what": "something or other" }
    process.do_assert("Bad what", msg, null_predicate)

    msg["what"] = 5
    process.do_assert("Bad what type", msg, null_predicate)

    msg["content"] = { 1: 2, 3: 4 }
    process.do_assert("Bad content", msg, null_predicate)

    msg["content"] = "this isnt right"
    process.do_assert("Bad content type", msg, null_predicate)


def run_tests(process):
    test_raw(process)
    test_json(process)
