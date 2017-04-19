#include "tests.hpp"

class Protocol : public BaseTest
{
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

TEST_F(Protocol, BadContent)
{
	send_message("{\"request_id\": 0, \"what\": \"anything\", \"content\": []");

	EXPECT_EQ(result, ERROR_BAD_CONTENT);
	EXPECT_EQ(response_len, 0);

	send_message("{\"request_id\": 0, \"what\": \"anything\", \"content\": 5");

	EXPECT_EQ(result, ERROR_BAD_CONTENT);
	EXPECT_EQ(response_len, 0);
}

TEST_F(Protocol, UnknownMethod)
{
	send_message("{\"request_id\": 0, \"what\": \"definitely not implemented\", \"content\": {}");

	EXPECT_EQ(result, ERROR_NOT_IMPLEMENTED);
	EXPECT_EQ(response_len, 0);
}
