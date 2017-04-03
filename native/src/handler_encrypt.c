#include <stdint.h>
#include <stdlib.h>
#include "error.h"
#include "frozen/frozen.h"
#include "encryption.h"
#include "handler.h"
#include "config.h"

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

static RESULT handler_encrypt_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response,
		struct encrypt_extra_allocation *alloc, char **conversation_id, struct recipient **recipients,
		size_t *recipient_count, struct encrypt_response *resp)
{
	uint32_t paused_request_id;
	if (json_scanf(content->ptr, content->len,
				"{id: %Q, message: %Q, recipient_count: %d, paused_request_id: %d}",
				conversation_id, &alloc->plaintext, recipient_count, &paused_request_id) != 4)
		return ERROR_BAD_CONTENT;

	*recipients = calloc(*recipient_count, sizeof(struct recipient));
	if (recipients == NULL)
		return ERROR_MEMORY;

	struct json_token token;
	for (int i = 0; json_scanf_array_elem(content->ptr, content->len, ".recipients", i, &token) > 0; ++i)
	{
		struct recipient *r = (*recipients) + i;
		if (json_scanf(token.ptr, token.len, "{fbid: %Q, name: %Q}", &r->fbid, &r->name) != 2)
			continue;

		struct contact contact;
		if (config_get_contact(ctx->config, r->fbid, &contact) == SUCCESS)
			r->key_fpr = contact.key_fpr;
	}

	struct conversation_state conversation;
	config_get_conversation(ctx->config, *conversation_id, &conversation);

	encrypt(ctx->crypto, alloc->plaintext, conversation.encryption, conversation.signing, *recipients, *recipient_count, &resp->result, alloc);

	resp->paused_request_id = paused_request_id;
	response->data = resp;
	response->printer = encrypt_response_printer;

	response->data_allocd = alloc;
	response->freer = encrypt_free_extra_allocations;

	return SUCCESS;

}

RESULT handler_encrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	struct encrypt_extra_allocation *alloc = calloc(1, sizeof(struct encrypt_extra_allocation));
	if (alloc == NULL)
		return ERROR_MEMORY;

	struct encrypt_response *resp = calloc(1, sizeof(struct encrypt_response));
	if (resp == NULL)
	{
		free(alloc);
		return ERROR_MEMORY;
	}

   	char *conversation_id = NULL;
	struct recipient *recipients = NULL;
	size_t recipient_count = 0;

	RESULT ret = handler_encrypt_wrapper(ctx, content, response, alloc, &conversation_id, &recipients, &recipient_count, resp);

	if (recipients != NULL)
	{
		for (size_t i = 0; i < recipient_count; ++i)
		{
			if (recipients[i].fbid)
				free(recipients[i].fbid);
			if (recipients[i].name)
				free(recipients[i].name);
		}
		free(recipients);
	}

	if (conversation_id)
		free(conversation_id);

	return ret;
}

