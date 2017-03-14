#ifndef MC_NATIVE_H
#define MC_NATIVE_H

struct mc_context
{
	struct config_context *config;
};

int context_init(struct mc_context *ctx);
void context_destroy(struct mc_context *ctx);

#endif
