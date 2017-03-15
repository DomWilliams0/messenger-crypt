#ifndef MC_CONFIG_H
#define MC_CONFIG_H

#include "bool.h"

struct config_context;

struct config_context *config_ctx_create();
void config_ctx_destroy(struct config_context *ctx);

enum config_section
{
	SECTION_SETTINGS,
	SECTION_CONVERSATION,
	SECTION_KEYS
};

enum setting_type
{
	SETTING_TEXT = 0,
	SETTING_BOOL,
	SETTING_TYPE_LAST,
};

struct setting_value
{
	union
	{
		const char *text;
		BOOL bool;
	} value;
};

enum setting_key
{
	SETTING_VERBOSE_HEADER = 0,
	SETTING_IGNORE_REVOKED,
	SETTING_MESSAGE_COLOUR,
	SETTING_BLOCK_FILES,

	SETTING_LAST
};

struct setting_key_instance
{
	enum setting_key key;
	const char *title;
	const char *description;
	enum setting_type type;
	struct setting_value default_value;
};

struct conversation_state
{
	BOOL encryption;
	BOOL signing;
};

const char *config_get_key_string(enum setting_key key);

const char *config_get_type_string(enum setting_type type);

void config_get_setting(struct config_context *ctx, enum setting_key key, struct setting_value *out);
// TODO config_get_key

RESULT config_set_setting(struct config_context *ctx, enum setting_key key, struct setting_value *value);

struct setting_key_instance const *config_get_all(struct config_context *ctx);

RESULT config_parse_key(const char *s, enum setting_key *key_out);

void config_get_conversation(struct config_context *ctx, char *id, struct conversation_state *out);

RESULT config_set_conversation(struct config_context *ctx, char *id, struct conversation_state *value);

#endif
