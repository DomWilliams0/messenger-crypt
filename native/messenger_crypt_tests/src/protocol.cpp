#include <iostream>
#include <cstdio>

#include "gtest/gtest.h"
#include "messaging.h"

class Protocol : public ::testing::Test
{
	protected:
		struct mc_context ctx;
		char *response;
		size_t response_len;
		RESULT result;

		Protocol() : response(nullptr), response_len(0), result(SUCCESS)
		{
			ctx.in = ctx.out = nullptr;
		}

		void SetUp()
		{
			enum config_path conf = TMP;
			ASSERT_EQ(context_init(&ctx, &conf, nullptr), SUCCESS);

			ctx.in = nullptr;
			ctx.out = nullptr;
		}

		void TearDown()
		{
			cleanup_streams();
			context_destroy(&ctx);
		}

		void cleanup_streams()
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
		void send_raw_message(char *msg, size_t len)
		{
			// clear up from last call
			cleanup_streams();
			result = SUCCESS;

			// create streams
			ctx.in = fmemopen(msg, len, "r");
			ctx.out = open_memstream(&response, &response_len);
			ASSERT_NE(ctx.in, nullptr);
			ASSERT_NE(ctx.out, nullptr);

			result = handle_single_message_with_length(&ctx, len);
		}

		void send_message(char *msg)
		{
			send_raw_message(msg, strlen(msg));
		}

};

TEST_F(Protocol, EmptyMessage)
{
	send_message("");

	EXPECT_EQ(result, ERROR_IO);
	EXPECT_EQ(response_len, 0);
}

TEST_F(Protocol, BadLengthTooLong)
{
	send_raw_message("", 5000);

	EXPECT_EQ(result, ERROR_IO);
	EXPECT_EQ(response_len, 0);
}

TEST_F(Protocol, BadLengthTooShort)
{
	send_raw_message("{}", 1);

	EXPECT_EQ(result, ERROR_BAD_CONTENT);
	EXPECT_EQ(response_len, 0);
}

TEST_F(Protocol, NonJSONNonsense)
{
	send_message("This is not JSON");

	EXPECT_EQ(result, ERROR_BAD_CONTENT);
	EXPECT_EQ(response_len, 0);
}

TEST_F(Protocol, InvalidJSON)
{
	send_message("{\"hobbies\": [\"trail off and not finish my sentences");

	EXPECT_EQ(result, ERROR_BAD_CONTENT);
	EXPECT_EQ(response_len, 0);
}
