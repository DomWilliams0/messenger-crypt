#include <stdio.h>
#include "messaging.h"
#include "native.h"
#include "config.h"
#include "encryption.h"

RESULT context_init(struct mc_context *ctx, enum config_path *config_path, struct crypto_config *crypto_config)
{
	if (ctx == NULL || config_path == NULL)
		return ERROR_UNEXPECTED_NULL;

	int err;
	if ((err = config_ctx_create(&ctx->config, *config_path)) != SUCCESS)
		return err;

	if ((err = crypto_ctx_create(&ctx->crypto, crypto_config)) != SUCCESS)
	{
		config_ctx_destroy(ctx->config);
		return err;
	}

	return SUCCESS;
}

void context_destroy(struct mc_context *ctx)
{
	config_ctx_destroy(ctx->config);
	crypto_ctx_destroy(ctx->crypto);
}

int main(void)
{
	enum config_path conf = APP_DATA;
	struct crypto_config crypto = {0};

	struct mc_context ctx;
	RESULT init_result = context_init(&ctx, &conf, &crypto);
	if (init_result != SUCCESS)
		return init_result;


	RESULT result;
	while (1)
	{
		result = handle_single_message(&ctx);

		if (result != SUCCESS)
		{
#ifdef DEBUG
			fprintf(stderr, "Bad message handling: %d\n", result);
			fflush(stderr);
#endif
			break;

		}
	}

	context_destroy(&ctx);

	return 0;
}
