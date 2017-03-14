#include <stdlib.h>
#include <libconfig.h>

#include "config.h"

struct config_context
{
	config_t config;
};

struct config_context *config_ctx_create()
{
	struct config_context *ctx = calloc(1, sizeof(struct config_context));
	if (ctx == NULL)
		return ctx;

	config_init(&ctx->config);

	if (config_read_file(&ctx->config, CONFIG_PATH) != CONFIG_TRUE)
	{
		// TODO load defaults?
	}

	return ctx;
}

void config_ctx_destroy(struct config_context *ctx)
{
	config_destroy(&ctx->config);
	free(ctx);
}
