#include <wordexp.h>
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

#define MAX_CONFIG_PATH_LEN (256)
#define RAW_CONFIG_PATH "$HOME/.config/messenger_crypt.conf"

struct config_context
{
	config_t config;
	const char *path;
	wordexp_t path_exp;
	struct setting_key_instance settings[SETTING_LAST];
};

static void parse_path(wordexp_t *exp, const char **out)
{
	// TODO WARNING: not fully tested, only currently works with a single expansion
	wordexp_t wexp;
	int result = wordexp(RAW_CONFIG_PATH, &wexp, 0);

	// uh oh
	if (result != 0 || wexp.we_wordc != 1)
	{
		*out = "/tmp/messenger_crypt.conf";
		return;
	}

	// freed at the end with wordfree
	*out = wexp.we_wordv[0];
	*exp = wexp;
}

struct config_context *config_ctx_create()
{
	struct config_context *ctx = calloc(1, sizeof(struct config_context));
	if (ctx == NULL)
		return ctx;

	config_init(&ctx->config);

	parse_path(&ctx->path_exp, &ctx->path);

	// failure ignored, defaults will be used
	config_read_file(&ctx->config, ctx->path);

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
	if (ctx->path_exp.we_wordc > 0)
		wordfree(&ctx->path_exp);

	config_destroy(&ctx->config);
	free(ctx);
}

static int get_type(enum setting_type type)
{
	switch (type)
	{
		case SETTING_TEXT:
			return CONFIG_TYPE_STRING;
		case SETTING_BOOL:
			return CONFIG_TYPE_BOOL;
		default:
			return CONFIG_TYPE_NONE;
	}
}

static int get(struct config_setting_t *s, enum setting_type type, struct setting_value *out)
{
	int success = CONFIG_TRUE;
	switch(type)
	{
		case SETTING_TEXT:
			out->value.text = config_setting_get_string(s);
			if (out->value.text == NULL)
				success = CONFIG_FALSE;
			break;
		case SETTING_BOOL:
			out->value.bool = config_setting_get_bool(s);
			break;
		default:
			success = CONFIG_FALSE;
			break;
	}

	return success;
}

void config_get_setting(struct config_context *ctx, enum setting_key key, struct setting_value *out)
{
	struct setting_key_instance *instance = &ctx->settings[key];

	config_setting_t *section = config_lookup(&ctx->config, "settings");
	if (section != NULL)
	{
		config_setting_t *s = config_setting_get_member(section, instance->key);
		if (s != NULL)
		{
			if (get(s, instance->type, out) == CONFIG_TRUE)
			{
				// true value found
				return;
			}
		}
	}

	// default
	*out = instance->default_value;
}

int config_set_setting(struct config_context *ctx, enum setting_key key, struct setting_value *value)
{
	struct setting_key_instance *instance = &ctx->settings[key];

	config_setting_t *section = config_lookup(&ctx->config, "settings");
	if (section == NULL)
	{
		section = config_setting_add(config_root_setting(&ctx->config), "settings", CONFIG_TYPE_GROUP);
		if (section == NULL)
			return 1;
	}
	config_setting_t *s = config_setting_get_member(section, instance->key);
	int key_type = get_type(instance->type);

	if (s == NULL)
	{
		s = config_setting_add(section, instance->key, key_type);
		if (s == NULL)
			return 2;
	}

	int result;
	switch(instance->type)
	{
		case SETTING_BOOL:
			result = config_setting_set_bool(s, value->value.bool);
			break;
		case SETTING_TEXT:
			result = config_setting_set_string(s, value->value.text);
			break;
		default:
			return 3;
	}

	if (result != CONFIG_TRUE)
		return 4;

	if (config_write_file(&ctx->config, ctx->path) != CONFIG_TRUE)
		return 5;

	return 0;
}
