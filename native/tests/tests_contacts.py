TEST_FBID = "i-am-a-test-contact-you-shouldnt-see-me"
TEST_KEY = "6369CBC8" # TODO create temporary test key ?
TEST_NAME = "Dom Williams"

def fail_check(input, resp):
    content = resp["content"]
    return TEST_FBID not in content

def success_check(input, resp):
    content = resp["content"]
    fbid = content.get(TEST_FBID, None)
    return fbid and fbid["name"] == TEST_NAME


# TODO add tests for unknown/ambiguous key

def test_set_n_get(process):
    get_msg = { "what": "contacts", "content": { "get": True, "fbids": [TEST_FBID] } }
    process.do_assert("Missing contact", get_msg, fail_check)

    set_msg = dict(get_msg)
    set_msg["content"] = { "get": False, "fbid": TEST_FBID, "key": TEST_KEY, "secret": False }
    process.send_request(set_msg)

    process.do_assert("Set valid contact", get_msg, success_check)

    set_msg["content"] = { "get": False, "fbid": TEST_FBID, "contact": None, "secret": False }
    process.send_request(set_msg)

    process.do_assert("Remove contact", get_msg, fail_check)



def run_tests(process):
    test_set_n_get(process)
