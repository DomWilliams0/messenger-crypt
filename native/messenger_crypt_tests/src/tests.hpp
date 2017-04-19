#ifndef MC_TESTS
#define MC_TESTS

#include <cstdio>
#include "gtest/gtest.h"
#include "error.h"

#define REQUEST(what, content) \
	"{\"request_id\": 0, \"what\": \"" what "\", \"content\": {" content "}}"

extern struct mc_context ctx;

class BaseTest : public ::testing::Test
{
	protected:
		char *response;
		size_t response_len;
		RESULT result;

		BaseTest() : response(nullptr), response_len(0), result(SUCCESS)
		{
		}

		void SetUp();
		void TearDown();

		// TODO unix only
		void send_raw_message(char *msg, size_t len);
		void send_message(char *msg);

		RESULT get_error_code() const;

	private:
		char *raw_response;
};


#endif
