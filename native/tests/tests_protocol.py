import struct
import io
import json

def test_invalid(process):
    process.do_assert("Bad junk", "thisisnotvalid", "", send_raw=True)
    process.do_assert("Empty json", {}, "")

    test_data = {"a": "b", "c": 50}
    process.do_assert("Silly json", test_data, "")

    serialised = json.dumps(test_data)
    ser_len = len(serialised)
    bad_buf = io.BytesIO()
    bad_buf.write(struct.pack("I", 0))
    bad_buf.write(serialised)

    process.do_assert("Size 0", bad_buf, "", send_raw=True)

    bad_buf.seek(0)
    bad_buf.write(struct.pack("I", ser_len / 2))
    process.do_assert("Size too small", bad_buf, "", send_raw=True)

    bad_buf.seek(0)
    bad_buf.write(struct.pack("I", ser_len * 2))
    process.do_assert("Size too big", bad_buf, "", send_raw=True)


def run_tests(process):
    test_invalid(process)
