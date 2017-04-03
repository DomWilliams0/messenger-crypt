TEST_FBID = "testfbid"

EXPECTED = { "encryption": False, "signing": False }

def conversation_checker(input, resp):
    try:
        content = resp["content"]
        return content == EXPECTED
    except KeyError:
        return False

def test_get(process):
    get_msg = { "what": "conversation", "content": { "get": True, "id": TEST_FBID} }
    process.do_assert("Get defaults", get_msg, conversation_checker)

    set_msg = dict(get_msg)
    set_msg["content"] = { "get": False, "id": TEST_FBID, "state": EXPECTED };

    EXPECTED["encryption"] = True
    process.send_request(set_msg)
    process.do_assert("Set encryption only", get_msg, conversation_checker)

    EXPECTED["encryption"] = False
    EXPECTED["signing"] = True
    process.send_request(set_msg)
    process.do_assert("Set signing only", get_msg, conversation_checker)

    EXPECTED["encryption"] = True
    process.send_request(set_msg)
    process.do_assert("Set both", get_msg, conversation_checker)

    EXPECTED["encryption"] = False
    EXPECTED["signing"] = False
    process.send_request(set_msg)
    process.do_assert("Set both to false", get_msg, conversation_checker)


def run_tests(process):
    test_get(process)
