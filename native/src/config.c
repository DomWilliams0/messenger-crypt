#include <wordexp.h>
#include <string.h>
#include <stdlib.h>
#include <libconfig.h>

#include "error.h"
#include "config.h"
#include "frozen/frozen.h"

#define INIT_SETTING(key, title, desc, type, default_val) do { \
	ctx->settings[key] = (struct setting_key_instance) { \
		key, title, desc, type, default_val \
	}; \
	} \
	while (0)

#define VALUE_BOOL(val) (struct setting_value) { .type = SETTING_BOOL, .value = {.bool = val } }
#define VALUE_TEXT(val) (struct setting_value) { .type = SETTING_TEXT, .value = {.text = val } }

#define MAX_CONFIG_PATH_LEN (256)
#define RAW_CONFIG_PATH "$HOME/.config/messenger_crypt.conf"

static struct conversation_state default_conversation = {
	.encryption = 0,
	.signing = 0
};

struct config_context
{
	config_t config;
	const char *path;
	wordexp_t path_exp;
	struct setting_key_instance settings[SETTING_LAST];
};

enum config_section
{
	SECTION_SETTINGS,
	SECTION_CONVERSATION,
	SECTION_CONTACT
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

RESULT config_ctx_create(struct config_context **out)
{
	struct config_context *ctx = calloc(1, sizeof(struct config_context));
	if (ctx == NULL)
		return ERROR_MEMORY;

	config_init(&ctx->config);
	config_set_options(&ctx->config,
			CONFIG_OPTION_OPEN_BRACE_ON_SEPARATE_LINE |
			CONFIG_OPTION_COLON_ASSIGNMENT_FOR_GROUPS |
			CONFIG_OPTION_COLON_ASSIGNMENT_FOR_NON_GROUPS);

	parse_path(&ctx->path_exp, &ctx->path);

	// failure ignored, defaults will be used
	config_read_file(&ctx->config, ctx->path);

	INIT_SETTING(
			SETTING_IGNORE_REVOKED,
			"Ignore revoked keys",
			"Don't use revoked public keys for encryption",
			SETTING_BOOL,
			VALUE_BOOL(TRUE)
			);
	INIT_SETTING(
			SETTING_VERBOSE_HEADER,
			"Show verbose message status",
			"Show decryption and signature status above every GPG message",
			SETTING_BOOL,
			VALUE_BOOL(TRUE)
			);
	INIT_SETTING(
			SETTING_MESSAGE_COLOUR,
			"Enable message colours",
			"Indicate decryption and verification success by changing the colour of PGP messages",
			SETTING_BOOL,
			VALUE_BOOL(TRUE)
			);
	INIT_SETTING(
			SETTING_BLOCK_FILES,
			"Block attachments and images",
			"Block the sending of attachments and images, as their encryption is not currently supported",
			SETTING_BOOL,
			VALUE_BOOL(TRUE)
			);

	*out = ctx;
	return SUCCESS;
}

void config_ctx_destroy(struct config_context *ctx)
{
	if (ctx->path_exp.we_wordc > 0)
		wordfree(&ctx->path_exp);

	config_destroy(&ctx->config);
	free(ctx);
}

const char *config_get_key_string(enum setting_key key)
{
	switch(key)
	{
		case SETTING_IGNORE_REVOKED:
			return "ignore-revoked";
		case SETTING_VERBOSE_HEADER:
			return "verbose-header";
		case SETTING_MESSAGE_COLOUR:
			return "message-colour";
		case SETTING_BLOCK_FILES:
			return "block-files";
		default:
			return "";
	}
}

const char *config_get_type_string(enum setting_type type)
{
	switch (type)
	{
		case SETTING_TEXT:
			return "TEXT";
		case SETTING_BOOL:
			return "BOOL";
		default:
			return "";
	}
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

static const char *get_section(enum config_section section)
{
	switch (section)
	{
		case SECTION_SETTINGS:
			return "settings";
		case SECTION_CONVERSATION:
			return "conversation";
		case SECTION_CONTACT:
			return "contacts";
		default:
			return "invalid-section-oh-my-god"; // why would this ever happen?
												// famous last words
	}
}

static int populate_value(struct config_setting_t *s, struct setting_value *value)
{
	int success = CONFIG_TRUE;
	switch(value->type)
	{
		case SETTING_TEXT:
			value->value.text = config_setting_get_string(s);
			if (value->value.text == NULL)
				success = CONFIG_FALSE;
			break;
		case SETTING_BOOL:
			value->value.bool = config_setting_get_bool(s);
			break;
		default:
			success = CONFIG_FALSE;
			value->value.text = NULL; // zero
			break;
	}

	return success;
}

void config_get_setting(struct config_context *ctx, enum setting_key key, struct setting_value *out)
{
	struct setting_key_instance *instance = &ctx->settings[key];
	const char *section_path = get_section(SECTION_SETTINGS);

	out->type = instance->type;

	config_setting_t *section = config_lookup(&ctx->config, section_path);
	if (section != NULL)
	{
		config_setting_t *s = config_setting_get_member(section, config_get_key_string(key));
		if (s != NULL)
		{
			if (populate_value(s, out) == CONFIG_TRUE)
			{
				// true value found
				return;
			}
		}
	}

	// default
	*out = instance->default_value;
}

RESULT config_set_setting(struct config_context *ctx, enum setting_key key, struct setting_value *value)
{
	struct setting_key_instance *instance = &ctx->settings[key];
	const char *section_path = get_section(SECTION_SETTINGS);

	config_setting_t *section = config_lookup(&ctx->config, section_path);
	if (section == NULL)
	{
		section = config_setting_add(config_root_setting(&ctx->config), section_path, CONFIG_TYPE_GROUP);
		if (section == NULL)
			return ERROR_CONFIG_KEY_CREATION;
	}

	const char *key_string = config_get_key_string(instance->key);
	config_setting_t *s = config_setting_get_member(section, key_string);
	int key_type = get_type(instance->type);

	if (s == NULL)
	{
		s = config_setting_add(section, key_string, key_type);
		if (s == NULL)
			return ERROR_CONFIG_KEY_CREATION;
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
			return ERROR_NOT_IMPLEMENTED;
	}

	if (result != CONFIG_TRUE)
		return ERROR_CONFIG_KEY_CREATION;

	if (config_write_file(&ctx->config, ctx->path) != CONFIG_TRUE)
		return ERROR_CONFIG_WRITE;

	return SUCCESS;
}

struct setting_key_instance const *config_get_all(struct config_context *ctx)
{
	return ctx->settings;
}

RESULT config_parse_key(const char *s, enum setting_key *key_out)
{
	for (int i = 0; i < SETTING_LAST; ++i)
	{
		const char *str = config_get_key_string(i);
		if (strcmp(s, str) == 0)
		{
			*key_out = i;
			return SUCCESS;
		}
	}

	return 1;
}

void config_get_conversation(struct config_context *ctx, char *id, struct conversation_state *out)
{
	const char *section_path = get_section(SECTION_CONVERSATION);
	config_setting_t *section = config_lookup(&ctx->config, section_path);
	BOOL set_defaults = TRUE;

	if (section != NULL)
	{
		config_setting_t *s = config_setting_get_member(section, id);
		if (s != NULL)
		{
			out->encryption = config_setting_get_bool(config_setting_get_member(s, "encryption"));
			out->signing = config_setting_get_bool(config_setting_get_member(s, "signing"));
			set_defaults = FALSE;
		}
	}

	if (set_defaults)
		*out = default_conversation;
}

RESULT config_set_conversation(struct config_context *ctx, char *id, struct conversation_state *value)
{
	// TODO extract common functionality from {s,g}et_{settings,conversation,key}
	const char *section_path = get_section(SECTION_CONVERSATION);
	config_setting_t *section = config_lookup(&ctx->config, section_path);

	if (section == NULL)
	{
		section = config_setting_add(config_root_setting(&ctx->config), section_path, CONFIG_TYPE_GROUP);
		if (section == NULL)
			return ERROR_CONFIG_KEY_CREATION;
	}

	config_setting_t *s = config_setting_get_member(section, id);
	config_setting_t *enc, *sig;
	if (s == NULL)
	{
		s = config_setting_add(section, id, CONFIG_TYPE_GROUP);
		if (s == NULL)
			return ERROR_CONFIG_KEY_CREATION;
	}

	enc = config_setting_lookup(s, "encryption");
	if (enc == NULL)
		enc = config_setting_add(s, "encryption", CONFIG_TYPE_BOOL);

	sig = config_setting_lookup(s, "signing");
	if (sig == NULL)
		sig = config_setting_add(s, "signing", CONFIG_TYPE_BOOL);

	int result = config_setting_set_bool(enc, value->encryption) == CONFIG_TRUE &&
		config_setting_set_bool(sig, value->signing) == CONFIG_TRUE;

	if (result != CONFIG_TRUE)
		return ERROR_CONFIG_KEY_CREATION;

	if (config_write_file(&ctx->config, ctx->path) != CONFIG_TRUE)
		return ERROR_CONFIG_WRITE;

	return SUCCESS;
}

RESULT config_get_contact(struct config_context *ctx, char *fbid, struct contact *out)
{
	const char *section_path = get_section(SECTION_CONTACT);
	config_setting_t *section = config_lookup(&ctx->config, section_path);
	if (section == NULL)
		return ERROR_CONFIG_KEY_MISSING;

	config_setting_t *contact = config_setting_get_member(section, fbid);
	if (contact == NULL)
		return ERROR_CONFIG_KEY_MISSING;

	config_setting_t *name = config_setting_lookup(contact, "name");
	config_setting_t *email = config_setting_lookup(contact, "email");
	config_setting_t *fpr = config_setting_lookup(contact, "fpr");

	if (
			config_setting_lookup_string(name, "name", &out->name) != CONFIG_TRUE ||
			config_setting_lookup_string(email, "email", &out->email) != CONFIG_TRUE ||
			config_setting_lookup_string(fpr, "fpr", &out->key_fpr) != CONFIG_TRUE
	   )
		return ERROR_CONFIG_KEY_MISSING;

	return SUCCESS;
}

// TODO use this in all getters/setters
static config_setting_t *add_field(config_setting_t *parent, const char *name, int type)
{
	config_setting_t *s= config_setting_lookup(parent, name);
	if (s == NULL)
		s = config_setting_add(parent,name, type);

	return s;
}

RESULT config_set_contact(struct config_context *ctx, char *id, struct contact *value)
{
	const char *section_path = get_section(SECTION_CONTACT);
	config_setting_t *section = config_lookup(&ctx->config, section_path);
	BOOL removing = value->key_fpr == NULL || value->name == NULL || value->email == NULL;

	if (section == NULL)
	{
		section = config_setting_add(config_root_setting(&ctx->config), section_path, CONFIG_TYPE_GROUP);
		if (section == NULL)
			return ERROR_CONFIG_KEY_CREATION;
	}

	config_setting_t *contact = config_setting_get_member(section, id);
	if (contact == NULL)
	{
		// our work is already done
		if (removing)
			return SUCCESS;

		contact = config_setting_add(section, id, CONFIG_TYPE_GROUP);
		if (contact == NULL)
			return ERROR_CONFIG_KEY_CREATION;
	}

	if (removing)
	{
		if (config_setting_remove(section, id) != CONFIG_TRUE)
			return ERROR_CONFIG_KEY_MISSING;
	}
	else
	{
		config_setting_t *name = add_field(contact, "name", CONFIG_TYPE_STRING);
		config_setting_t *email = add_field(contact, "email", CONFIG_TYPE_STRING);
		config_setting_t *fpr = add_field(contact, "fpr", CONFIG_TYPE_STRING);

		if (
				config_setting_set_string(name, value->name) != CONFIG_TRUE ||
				config_setting_set_string(email, value->email) != CONFIG_TRUE ||
				config_setting_set_string(fpr, value->key_fpr) != CONFIG_TRUE
		   )
			return ERROR_CONFIG_KEY_CREATION;
	}

	if (config_write_file(&ctx->config, ctx->path) != CONFIG_TRUE)
		return ERROR_CONFIG_WRITE;

	return SUCCESS;
}

int json_value_printer(struct json_out *out, va_list *args)
{
	struct setting_value *value = va_arg(*args, struct setting_value *);
	switch(value->type)
	{
		case SETTING_BOOL:
			return json_printf(out, "%B", value->value.bool);
		case SETTING_TEXT:
			return json_printf(out, "%Q", value->value.text);
		default:
			return 0;
	}
}

void json_value_scanner(const char *str, int len, void *value)
{
	struct setting_value *v = ( struct setting_value *)value;
	switch(v->type)
	{
		case SETTING_BOOL:
			json_scanf(str, len, "%B", &v->value.bool);
			break;
		case SETTING_TEXT:
			json_scanf(str, len, "%Q", &v->value.text);
			break;
	}
}
