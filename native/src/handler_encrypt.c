#include <stdint.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "encryption.h"
#include "handler.h"

struct encrypt_response
{
	int paused_request_id;
	struct encrypt_result result;
};

static int encrypt_response_printer(struct json_out *out, va_list *args)
{
	struct encrypt_response *response = va_arg(*args, struct encrypt_response *);
	struct encrypt_result *result = &response->result;

	return json_printf(out,
			"{paused_request_id: %d,  error: %Q, ciphertext: %Q}",
			response->paused_request_id, result->error, result->ciphertext);
}

int handler_encrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	uint32_t conversation_id, recipient_count, paused_request_id;
	char *plaintext;
	if (json_scanf(content->ptr, content->len,
				"{id: %d, message: %Q, recipient_count: %d, paused_request_id: %d}",
				&conversation_id, &plaintext, &recipient_count, &paused_request_id) != 4)
		return 2;

	struct recipient *recipients = calloc(recipient_count, sizeof(struct recipient));
	if (recipients == NULL)
		return 3;

	struct json_token token;
	for (int i = 0; json_scanf_array_elem(content->ptr, content->len, ".recipients", i, &token) > 0; ++i)
	{
		if (json_scanf(token.ptr, token.len,
				"{fbid: %Q, name: %Q}",
				&recipients[i].fbid, &recipients[i].name) != 2)
			continue;
	}

	struct encrypt_response *resp = calloc(1, sizeof(struct encrypt_response));
	if (resp == NULL)
		return 5;

	encrypt(ctx->crypto, plaintext, recipients, recipient_count, &resp->result);
	for (unsigned int i = 0; i < recipient_count; ++i)
	{
		free(recipients[i].fbid);
		free(recipients[i].name);
	}
	free(recipients);
	free(plaintext);

	resp->paused_request_id = paused_request_id;
	response->data = resp;
	response->printer = encrypt_response_printer;

	return 0;
}
