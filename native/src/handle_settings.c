#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "native.h"
#include "handler.h"
#include "config.h"

struct settings_response
{
	struct setting_key_instance const *settings;
	struct setting_value values[HANDLER_LAST];

	unsigned int setting_count;
};

static char get_fmt_char(enum setting_type type)
{
	switch(type)
	{
		case SETTING_TEXT:
			return 'Q';
		case SETTING_BOOL:
			return 'B';
		default:
			return ' '; // invalid
	}
}

static int setting_printer(struct json_out *out, va_list *args)
{
	char fmt[] = "{key: %Q, title: %Q, description: %Q, type: %Q, value: %X}";
	const int index = strlen(fmt) - 2;

	struct setting_key_instance *s = va_arg(*args, struct setting_key_instance *);
	struct setting_value *value = va_arg(*args, struct setting_value *);

	fmt[index] = get_fmt_char(s->type);

	return json_printf(out, fmt,
			config_get_key_string(s->key), s->title, s->description,
			config_get_type_string(s->type), value->value
			);
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

int handler_settings(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	int get;
	if (json_scanf(content->ptr, content->len,"{get: %B}", &get) != 1)
		return 2;

	if (get)
	{
		struct settings_response *resp = calloc(1, sizeof(struct settings_response));
		if (resp == NULL)
			return 3;

		resp->settings = config_get_all(ctx->config);
		resp->setting_count = SETTING_LAST;
		for (unsigned int i = 0; i < resp->setting_count; ++i)
		{
			config_get_setting(ctx->config, resp->settings[i].key, resp->values + i);
		}

		response->data = resp;
		response->printer = settings_response_printer;
		return 0;
	}
	else
	{
		char *key;
		struct json_token value_token;
		if (json_scanf(content->ptr, content->len,
					"{key: %Q, value: %T}", &key, &value_token) != 2)
			return 4;

		int error = 5;
		struct setting_value value;
		enum setting_type s_type = SETTING_TYPE_LAST;
		enum setting_key s_key;
		if (config_parse_key(key, &s_key) == 0)
		{
			error = 6;

			s_type = (config_get_all(ctx->config) + s_key)->type;
			if (to_setting_type(value_token.type) == s_type)
			{
				error = 7;
				char fmt[] = "%X";
				fmt[1] = get_fmt_char(s_type);
				if (json_scanf(value_token.ptr, value_token.len, fmt, &value.value) == 1)
				{
					int config_error = config_set_setting(ctx->config, s_key, &value);
					if (config_error == 0)
						error = 0;
					else
						error += config_error;
				}
			}

		}

		free(key);
		if (s_type == SETTING_TEXT && value.value.text != NULL)
			free((char *)value.value.text);

		response->data = NULL;
		response->printer = NULL;

		return error;
	}

}
