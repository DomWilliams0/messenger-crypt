#include "gtest/gtest.h"
#include "native.h"
#include "tests.hpp"

class TestEnvironment : public ::testing::Environment
{
	void SetUp()
	{
		enum config_path conf = TMP;
		ASSERT_EQ(context_init(&ctx, &conf, nullptr), SUCCESS);

		ctx.in = nullptr;
		ctx.out = nullptr;
	}

	void TearDown()
	{
		context_destroy(&ctx);
	}

};

struct mc_context ctx;

int main(int argc, char **argv)
{
	::testing::InitGoogleTest(&argc, argv);
	::testing::AddGlobalTestEnvironment(new TestEnvironment);
	return RUN_ALL_TESTS();
}
