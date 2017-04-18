#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "native.h"
#include "handler.h"
#include "config.h"
#include "error.h"

struct settings_response
{
	struct setting_key_instance const *settings;
	struct setting_value values[HANDLER_LAST];

	unsigned int setting_count;
};

static int setting_printer(struct json_out *out, va_list *args)
{
	struct setting_key_instance *s = va_arg(*args, struct setting_key_instance *);
	struct setting_value *value = va_arg(*args, struct setting_value *);

	return json_printf(out,
			"{key: %Q, title: %Q, description: %Q, type: %Q, value: %M, data: %Q}",
			config_get_key_string(s->key), s->title, s->description,
			config_get_type_string(value->type), json_value_printer, value, s->extra_data);
}

static int settings_response_printer(struct json_out *out, va_list *args)
{
	struct settings_response *response = va_arg(*args, struct settings_response *);

	if (response->setting_count == 0)
		return 0;

	unsigned int len = 0;

	len += json_printf(out, "[", 1);
	for (unsigned int i = 0; i < response->setting_count; ++i)
	{
		struct setting_key_instance const *s = response->settings + i;
		struct setting_value *value = response->values + i;

		if (i != 0)
			len += json_printf(out, ", ");

		len += json_printf(out, "%M", setting_printer, s, value);
	}
	len += json_printf(out, "]", 1);

	return len;
}

static enum setting_type to_setting_type(enum json_token_type type)
{
	switch(type)
	{
		case JSON_TYPE_STRING:
			return SETTING_TEXT;

		case JSON_TYPE_TRUE:
		case JSON_TYPE_FALSE:
			return SETTING_BOOL;

		default:
			return SETTING_TYPE_LAST;
	}
}

static RESULT handler_settings_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response,
		char **key, struct setting_value *value)
{
	BOOL get;
	if (json_scanf(content->ptr, content->len,"{get: %B}", &get) != 1)
		return ERROR_BAD_CONTENT;

	if (get)
	{
		struct settings_response *resp = calloc(1, sizeof(struct settings_response));
		if (resp == NULL)
			return ERROR_MEMORY;

		resp->settings = config_get_all(ctx->config);
		resp->setting_count = SETTING_LAST;
		for (unsigned int i = 0; i < resp->setting_count; ++i)
		{
			config_get_setting(ctx->config, resp->settings[i].key, resp->values + i);
		}

		response->data = resp;
		response->printer = settings_response_printer;
	}
	else
	{
		struct json_token value_token;
		if (json_scanf(content->ptr, content->len,
					"{key: %Q, value: %T}", key, &value_token) != 2)
			return ERROR_BAD_CONTENT;

		enum setting_key s_key;
		int err;
		enum setting_type s_type = SETTING_TYPE_LAST;
		if ((err = config_parse_key(*key, &s_key)) != SUCCESS)
			return err;

		s_type = (config_get_all(ctx->config) + s_key)->type;
		value->type = s_type;
		if (to_setting_type(value_token.type) != s_type)
			return ERROR_BAD_CONTENT;

		if (json_scanf(value_token.ptr, value_token.len, "%M", json_value_scanner, value) != 1)
			return ERROR_BAD_CONTENT;

		int config_error = config_set_setting(ctx->config, s_key, value);
		if (config_error != SUCCESS)
			return config_error;

		response->data = NULL;
		response->printer = NULL;
	}

	return SUCCESS;
}

RESULT handler_settings(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	char *key = NULL;
	struct setting_value value = {0};

	RESULT result = handler_settings_wrapper(ctx, content, response, &key, &value);

	if (key != NULL)
		free(key);
	if (value.type == SETTING_TEXT && value.value.text != NULL)
		free((char *)value.value.text);


	return result;
}
