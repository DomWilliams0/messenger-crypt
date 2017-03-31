import struct
import io
import json

def test_invalid(process):
    pass

def settings_checker(input, resp):
    try:
        content = resp["content"]
        if len(content) > 0:
            option = content[0]
            required_keys = ["value", "type", "description", "title"]
            return all(x in option for x in required_keys)
    except KeyError:
        return False

def test_get(process):
    msg = { "what": "settings", "content": { "get": True } }
    process.do_assert("Get settings", msg, settings_checker)
    # TODO more needed

def run_tests(process):
    test_get(process)
