#include <stdio.h>
#include "messaging.h"
#include "native.h"
#include "config.h"

int context_init(struct mc_context *ctx)
{
	ctx->config = config_ctx_create();
	if (ctx->config == NULL)
		return 1;


	return 0;
}

void context_destroy(struct mc_context *ctx)
{
	config_ctx_destroy(ctx->config);
}

int main(void)
{
	struct mc_context ctx;
	int init_result = context_init(&ctx);
	if (init_result != 0)
		return init_result;


	int result;
	while (1)
	{
		result = handle_single_message();

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
  return 0;
}
