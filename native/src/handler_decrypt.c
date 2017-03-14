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

int handler_decrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	uint32_t msg_id;
	char *msg;
	if (json_scanf(content->ptr, content->len,
				"{id: %d, message: %Q}", &msg_id, &msg) != 2)
		return 2;

	struct decrypt_response *resp = calloc(1, sizeof(struct decrypt_response));
	if (resp == NULL)
		return 3;

	decrypt(ctx->crypto, msg, &resp->result);
	free(msg);

	resp->msg_id = msg_id;
	response->data = resp;
	response->printer = decrypt_response_printer;

	return 0;
}
