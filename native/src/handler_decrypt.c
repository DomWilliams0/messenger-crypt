#include <stdint.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "encryption.h"
#include "handler.h"

static int export_decrypt_result(struct json_out *out_ctx, int msg_id, struct decrypt_result *result)
{
	return json_printf(out_ctx,
			"{id: %d, error: %Q, signer: %Q, good_sig: %B, was_decrypted: %B, plaintext: %Q}",
			msg_id, result->error, result->signer, result->good_sig, result->was_decrypted, result->plaintext);
}

int handler_decrypt(struct json_token *content, char **out)
{
	if (content->type != JSON_TYPE_OBJECT_END)
		return 1;

	uint32_t msg_id;
	char *msg;
	if (json_scanf(content->ptr, content->len,
				"{id: %d, message: %Q}", &msg_id, &msg) != 2)
		return 2;

	struct decrypt_result result;
	decrypt(msg, &result);

	// calculate size first
	char null[1];
	struct json_out null_out = JSON_OUT_BUF(null, 1);
	int size = export_decrypt_result(&null_out, msg_id, &result);

	// allocate real buffer and try again
	*out = calloc(size + 1, sizeof(char));
	if (*out == NULL)
		return 3;

	struct json_out buf_out = JSON_OUT_BUF(*out, size+1);
	if (export_decrypt_result(&buf_out, msg_id, &result) != size)
		return 4;

	free(msg);
	return 0;
}
