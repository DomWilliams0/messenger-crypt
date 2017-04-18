#include "gtest/gtest.h"
#include "error.h"


TEST(Dummy, DummyTest)
{
	EXPECT_NE(
			error_get_message(ERROR_MEMORY),
			"definitely not this"
			);
}
