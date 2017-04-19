#include "tests.hpp"


class SettingsHandler : public BaseTest
{
};



TEST_F(SettingsHandler, MissingGet)
{
	send_message(REQUEST("settings", ""));

	EXPECT_EQ(result, SUCCESS);
	EXPECT_EQ(get_error_code(), ERROR_BAD_CONTENT);
}

TEST_F(SettingsHandler, GoodGet)
{
	send_message(REQUEST("settings", "\"get\": true"));

	EXPECT_EQ(result, SUCCESS);
	EXPECT_EQ(get_error_code(), SUCCESS);
}

TEST_F(SettingsHandler, BadSet)
{
	send_message(REQUEST("settings", "\"get\": false"));

	EXPECT_EQ(result, SUCCESS);
	EXPECT_EQ(get_error_code(), ERROR_BAD_CONTENT);
}

TEST_F(SettingsHandler, BadSetWithoutValue)
{
	send_message(REQUEST("settings", "\"get\": false, \"key\": \"uh oh\""));

	EXPECT_EQ(result, SUCCESS);
	EXPECT_EQ(get_error_code(), ERROR_BAD_CONTENT);
}

TEST_F(SettingsHandler, BadSetKey)
{
	send_message(REQUEST("settings", "\"get\": false, \"key\": 5, \"value\": 5"));

	EXPECT_EQ(result, SUCCESS);
	EXPECT_EQ(get_error_code(), ERROR_CONFIG_INVALID_KEY);
}
