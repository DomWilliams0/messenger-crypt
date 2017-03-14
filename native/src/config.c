#include <stdlib.h>
#include <libconfig.h>

#include "config.h"

#define INIT_SETTING(setting_key, key, title, desc, type, default_val) do { \
	ctx->settings[setting_key] = (struct setting_key_instance) { \
		key, title, desc, type, default_val \
	}; \
	} \
	while (0)

#define VALUE_BOOL(val) (struct setting_value) { .value = {.bool = val } }
#define VALUE_TEXT(val) (struct setting_value) { .value = {.text = val } }


struct config_context
{
	config_t config;
	struct setting_key_instance settings[SETTING_LAST];
};


struct config_context *config_ctx_create()
{
	struct config_context *ctx = calloc(1, sizeof(struct config_context));
	if (ctx == NULL)
		return ctx;

	config_init(&ctx->config);

	// failure ignored, defaults will be used
	config_read_file(&ctx->config, CONFIG_PATH);

	INIT_SETTING(
			SETTING_IGNORE_REVOKED,
			"ignore-revoked",
			"Ignore revoked keys",
			"Don't use revoked public keys for encryption",
			SETTING_BOOL,
			VALUE_BOOL(1)
			);
	INIT_SETTING(
			SETTING_VERBOSE_HEADER,
			"verbose-header",
			"Show verbose message status",
			"Show decryption and signature status above every GPG message",
			SETTING_BOOL,
			VALUE_BOOL(1)
			);
	INIT_SETTING(
			SETTING_MESSAGE_COLOUR,
			"message-colour",
			"Enable message colours",
			"Indicate decryption and verification success by changing the colour of PGP messages",
			SETTING_BOOL,
			VALUE_BOOL(1)
			);
	INIT_SETTING(
			SETTING_BLOCK_FILES,
			"block-files",
			"Block attachments and images",
			"Block the sending of attachments and images, as their encryption is not currently supported",
			SETTING_BOOL,
			VALUE_BOOL(1)
			);

	return ctx;
}

void config_ctx_destroy(struct config_context *ctx)
{
	config_destroy(&ctx->config);
	free(ctx);
}

static int get(struct config_context *ctx, const char *path, enum setting_type type, struct setting_value *out)
{
	switch(type)
	{
		case SETTING_TEXT:
			return config_lookup_string(&ctx->config, path, &out->value.text);
		case SETTING_BOOL:
			return config_lookup_bool(&ctx->config, path, &out->value.bool);
		default:
			return CONFIG_FALSE;
	}
}

int config_get_setting(struct config_context *ctx, enum setting_key key, struct setting_value *out)
{
	char key_path[128] = {0};
	struct setting_key_instance *setting = &ctx->settings[key];

	if (snprintf(key_path, 128, "settings.%s", setting->key) <= 0)
		return 1;

	if (get(ctx, key_path, setting->type, out) != CONFIG_TRUE)
	{
		// default
		*out = setting->default_value;
	}

	return 0;
}
