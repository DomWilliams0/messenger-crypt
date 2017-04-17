#ifndef MC_CONFIG_H
#define MC_CONFIG_H

#define SELF_KEY "self"

#include <stdarg.h>
#include "bool.h"
#include "error.h"

struct config_context;

enum config_path
{
	APP_DATA,
	TMP
};

RESULT config_ctx_create(struct config_context **out, enum config_path path);
void config_ctx_destroy(struct config_context *ctx);

enum setting_type
{
	SETTING_TEXT = 0,
	SETTING_BOOL,
	SETTING_KEY,
	SETTING_CONTACTS,
	SETTING_TYPE_LAST,
};

struct setting_value
{
	enum setting_type type;
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
	SETTING_PERSONAL_KEY,

	SETTING_LAST
};

struct setting_key_instance
{
	enum setting_key key;
	const char *title;
	const char *description;
	enum setting_type type;
	struct setting_value default_value;
	const char *extra_data;
};

struct conversation_state
{
	BOOL encryption;
	BOOL signing;
};

struct contact
{
	const char *name;
	const char *email;
	const char *key_fpr;
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

// memory management is handled by libconfig
RESULT config_get_contact(struct config_context *ctx, char *fbid, struct contact *out);

RESULT config_set_contact(struct config_context *ctx, char *id, struct contact *value);

struct json_out;
int json_value_printer(struct json_out *out, va_list *args);
void json_value_scanner(const char *str, int len, void *value);

#endif
