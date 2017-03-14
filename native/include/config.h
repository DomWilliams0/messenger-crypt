#ifndef MC_CONFIG_H
#define MC_CONFIG_H

struct config_context;

struct config_context *config_ctx_create();
void config_ctx_destroy(struct config_context *ctx);

enum config_section
{
	SECTION_SETTINGS,
	SECTION_CONVERSATIONS,
	SECTION_KEYS
};

enum setting_type
{
	SETTING_TEXT = 0,
	SETTING_BOOL
};

struct setting_value
{
	union
	{
		const char *text;
		int bool;
	} value;
};

struct setting_key_instance
{
	const char *key;
	const char *title;
	const char *description;
	enum setting_type type;
	struct setting_value default_value;
};

enum setting_key
{
	SETTING_VERBOSE_HEADER = 0,
	SETTING_IGNORE_REVOKED,
	SETTING_MESSAGE_COLOUR,
	SETTING_BLOCK_FILES,

	SETTING_LAST
};

void config_get_setting(struct config_context *ctx, enum setting_key key, struct setting_value *out);
// TODO config_get_conversation_settings
// TODO config_get_key

int config_set_setting(struct config_context *ctx, enum setting_key key, struct setting_value *value);

#endif
