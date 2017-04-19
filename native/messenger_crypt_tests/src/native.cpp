#include "gtest/gtest.h"
#include "native.h"
#include "config.h"
#include "encryption.h"

TEST(NativeContext, StandardCreation)
{
	struct mc_context ctx;
	enum config_path conf = TMP;
	struct crypto_config crypto = {0};

	ASSERT_EQ(context_init(&ctx, &conf, &crypto), SUCCESS);
	context_destroy(&ctx);
}

TEST(NativeContext, NullSettings)
{
	struct mc_context ctx;
	enum config_path conf = TMP;
	struct crypto_config crypto = {0};

	EXPECT_EQ(context_init(NULL, &conf, &crypto), ERROR_UNEXPECTED_NULL);
	EXPECT_EQ(context_init(&ctx, NULL, &crypto), ERROR_UNEXPECTED_NULL);

	ASSERT_EQ(context_init(&ctx, &conf, NULL), SUCCESS);
	context_destroy(&ctx);
}
