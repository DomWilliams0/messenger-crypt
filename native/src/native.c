#include <stdio.h>
#include "messaging.h"
#include "native.h"
#include "config.h"
#include "encryption.h"

RESULT context_init(struct mc_context *ctx)
{
	ctx->config = config_ctx_create();
	if (ctx->config == NULL)
		return 1;

	ctx->crypto = crypto_ctx_create();
	if (ctx->crypto == NULL)
		return 2;

	return SUCCESS;
}

void context_destroy(struct mc_context *ctx)
{
	config_ctx_destroy(ctx->config);
	crypto_ctx_destroy(ctx->crypto);
}

int main(void)
{
	struct mc_context ctx;
	RESULT init_result = context_init(&ctx);
	if (init_result != 0)
		return init_result;


	RESULT result;
	while (1)
	{
		result = handle_single_message(&ctx);

		if (result != 0)
		{
#ifdef DEBUG
			fprintf(stderr, "Bad message handling: %d\n", result);
			fflush(stderr);
#else
			break;
#endif

		}
	}

	context_destroy(&ctx);

	return 0;
}
