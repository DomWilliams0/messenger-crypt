#ifndef MC_CONFIG_H
#define MC_CONFIG_H

#define CONFIG_PATH "$HOME/.config/messenger_crypt.conf"

struct config_context;

struct config_context *config_ctx_create();
void config_ctx_destroy(struct config_context *ctx);

#endif
