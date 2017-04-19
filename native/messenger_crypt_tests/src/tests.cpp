#include "frozen/frozen.h"

#include "tests.hpp"
#include "native.h"
#include "messaging.h"


void BaseTest::SetUp()
{
	result = SUCCESS;
	response = nullptr;
	raw_response = nullptr;
	response_len = 0;
}

void BaseTest::TearDown()
{
	if (ctx.in)
	{
		fclose(ctx.in);
		ctx.in = nullptr;
	}
	if (ctx.out)
	{
		fclose(ctx.out);
		ctx.out = nullptr;

		free(raw_response);
		raw_response = nullptr;
		response = nullptr;
		response_len = 0;
	}
}

// TODO unix only
void BaseTest::send_raw_message(char *msg, size_t len)
{
	// create streams
	ctx.in = fmemopen(msg, len, "r");
	ctx.out = open_memstream(&raw_response, &response_len);
	ASSERT_NE(ctx.in, nullptr);
	ASSERT_NE(ctx.out, nullptr);

	result = handle_single_message_with_length(&ctx, len);

	if (raw_response != NULL)
	{
		memcpy(&response_len, raw_response, sizeof(uint32_t));
		response = raw_response + sizeof(uint32_t);
	}
}

void BaseTest::send_message(char *msg)
{
	send_raw_message(msg, strlen(msg));
}

RESULT BaseTest::get_error_code() const
{
	if (response == nullptr)
		return SUCCESS;

	RESULT error_code;
	if (json_scanf(response, response_len,
				"{content: {error_code: %d}}",
				&error_code) != 1)
		return SUCCESS;

	return error_code;
}
