#ifndef MC_NATIVE_H
#define MC_NATIVE_H

#ifdef __cplusplus
extern "C" {
#endif

#include "error.h"
#include "config.h"

struct mc_context
{
	struct config_context *config;
	struct crypto_context *crypto;
};


struct crypto_config;

RESULT context_init(struct mc_context *ctx, enum config_path *config_path, struct crypto_config *crypto_config);
void context_destroy(struct mc_context *ctx);


#ifdef __cplusplus
}
#endif

#endif
