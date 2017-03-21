#include <stdint.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "encryption.h"
#include "handler.h"

struct decrypt_response
{
	int msg_id;
	struct decrypt_result result;
};

static int decrypt_response_printer(struct json_out *out, va_list *args)
{
	struct decrypt_response *response = va_arg(*args, struct decrypt_response *);
	struct decrypt_result *result = &response->result;

	return json_printf(out,
			"{id: %d, error: %Q, signer: %Q, good_sig: %B, was_decrypted: %B, plaintext: %Q}",
			response->msg_id, result->error, result->signer, result->good_sig, result->was_decrypted, result->plaintext);
}

static RESULT handler_decrypt_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response,
		struct decrypt_response *resp, char **msg)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return ERROR_BAD_CONTENT;

	uint32_t msg_id;
	if (json_scanf(content->ptr, content->len,
				"{id: %d, message: %Q}", &msg_id, msg) != 2)
		return ERROR_BAD_CONTENT;

	struct decrypt_extra_allocation *alloc = calloc(1, sizeof(struct decrypt_extra_allocation));
	if (alloc == NULL)
		return ERROR_MEMORY;

	decrypt(ctx->crypto, *msg, &resp->result, alloc);

	resp->msg_id = msg_id;
	response->data = resp;
	response->printer = decrypt_response_printer;

	response->data_allocd = alloc;
	response->freer = decrypt_free_extra_allocations;

	return SUCCESS;
}

RESULT handler_decrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	char *msg;
	struct decrypt_response *resp = calloc(1, sizeof(struct decrypt_response));
	if (resp == NULL)
		return ERROR_MEMORY;

	RESULT ret = handler_decrypt_wrapper(ctx, content, response, resp, &msg);

	if (msg != NULL)
		free(msg);
	if (ret != 0)
		free(resp);

	return ret;
}
