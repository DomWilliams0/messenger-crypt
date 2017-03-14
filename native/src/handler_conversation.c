#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "native.h"
#include "handler.h"
#include "config.h"

struct conversation_response
{
	struct conversation_state state;
};

static int conversation_printer(struct json_out *out, va_list *args)
{
	struct conversation_response *resp = va_arg(*args, struct conversation_response *);

	return json_printf(out,
			"{encryption: %B, signing: %B}",
			resp->state.encryption, resp->state.signing
			);
}

static int handler_conversation_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response,
		char **id)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	int get;
	if (json_scanf(content->ptr, content->len,"{get: %B, id: %Q}", &get, id) != 2)
		return 2;

	if (get)
	{
		struct conversation_response *resp = calloc(1, sizeof(struct conversation_response));
		if (resp == NULL)
			return 3;

		config_get_conversation(ctx->config, *id, &resp->state);

		response->data = resp;
		response->printer = conversation_printer;
	}
	else
	{
		struct conversation_state new_state;
		if (json_scanf(content->ptr, content->len,
					"{state: {encryption: %B, signing: %B}}",
					&new_state.encryption, &new_state.signing) != 2)
			return 4;

		config_set_conversation(ctx->config, *id, &new_state);
	}

	return 0;
}

int handler_conversation(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	char *id = NULL;
	int ret = handler_conversation_wrapper(ctx, content, response, &id);

	if (id != NULL)
		free(id);

	return ret;
}