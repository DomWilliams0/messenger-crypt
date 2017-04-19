#include "tests.hpp"
#include "native.h"
#include "messaging.h"


void BaseTest::SetUp()
{
	result = SUCCESS;
	response = nullptr;
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

		free(response);
		response = nullptr;
		response_len = 0;
	}
}

// TODO unix only
void BaseTest::send_raw_message(char *msg, size_t len)
{
	// create streams
	ctx.in = fmemopen(msg, len, "r");
	ctx.out = open_memstream(&response, &response_len);
	ASSERT_NE(ctx.in, nullptr);
	ASSERT_NE(ctx.out, nullptr);

	result = handle_single_message_with_length(&ctx, len);
}

void BaseTest::send_message(char *msg)
{
	send_raw_message(msg, strlen(msg));
}
