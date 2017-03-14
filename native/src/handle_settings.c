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

static int setting_printer(struct json_out *out, va_list *args)
{
	char fmt[] = "{key: %Q, title: %Q, description: %Q, type: %Q, value: %X}";
	const int index = strlen(fmt) - 2;

	struct setting_key_instance *s = va_arg(*args, struct setting_key_instance *);
	struct setting_value *value = va_arg(*args, struct setting_value *);

	char fmt_char = s->type == SETTING_TEXT ? 'Q' : 'B'; // TODO accomodate future types
	fmt[index] = fmt_char;

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

int handler_settings(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	int get;
	if (json_scanf(content->ptr, content->len,
				"{get: %B}", &get) != 1)
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
	}
	else
	{
		response->data = NULL;
		response->printer = NULL;
		// TODO set
	}

	return 0;

}
