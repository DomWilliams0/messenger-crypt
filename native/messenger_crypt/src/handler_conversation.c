#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "error.h"
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

static RESULT handler_conversation_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response,
		char **id)
{
	int get;
	if (json_scanf(content->ptr, content->len,"{get: %B, id: %Q}", &get, id) != 2)
		return ERROR_BAD_CONTENT;

	if (get)
	{
		struct conversation_response *resp = calloc(1, sizeof(struct conversation_response));
		if (resp == NULL)
			return ERROR_MEMORY;

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
			return ERROR_BAD_CONTENT;

		config_set_conversation(ctx->config, *id, &new_state);
	}

	return SUCCESS;
}

RESULT handler_conversation(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	char *id = NULL;
	RESULT ret = handler_conversation_wrapper(ctx, content, response, &id);

	if (id != NULL)
		free(id);

	return ret;
}
