#ifndef MC_NATIVE_H
#define MC_NATIVE_H

#include "error.h"

struct mc_context
{
	struct config_context *config;
	struct crypto_context *crypto;
};

RESULT context_init(struct mc_context *ctx);
void context_destroy(struct mc_context *ctx);

#endif
