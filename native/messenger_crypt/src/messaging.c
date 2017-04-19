#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#include "error.h"
#include "frozen/frozen.h"
#include "messaging.h"
#include "handler.h"

#define MAX_OUTGOING_SIZE (1024 * 1024)

typedef uint32_t request_id;

static char outgoing_buffer[MAX_OUTGOING_SIZE];

static int error_printer(struct json_out *out, va_list *args)
{
	RESULT r = *va_arg(*args, RESULT *);
	return json_printf(out, "{error_code: %d, error: %Q}", r, error_get_message(r));
}

static RESULT send_response(FILE *out, RESULT result, char *what, request_id id, struct handler_response *response)
{
	BOOL is_success = result == SUCCESS;

	// no response to send
	if (is_success && (response->data == NULL || response->printer == NULL))
		return SUCCESS;

	response_printer printer = response->printer;
	void *data = response->data;

	// new error response
	if (!is_success)
	{
		printer = error_printer;
		data = &result;
	}

	struct json_out out_to_buffer = JSON_OUT_BUF(outgoing_buffer, MAX_OUTGOING_SIZE);

	// proxy response through buffer to get length first
	unsigned int real_size = json_printf(&out_to_buffer, "{request_id: %d, what: %Q, content: %M}",
			id, what, printer, data);

	// send size before payload
	if (fwrite(&real_size, sizeof(real_size), 1, out) != 1)
		return ERROR_IO;

	if (fwrite(outgoing_buffer, real_size, 1, out) != 1)
		return ERROR_IO;

	fflush(out);
	return SUCCESS;
}

static RESULT handle_single_message_wrapped(struct mc_context *ctx, uint32_t *length_in, char **buffer, char **what, struct handler_response *response)
{
	uint32_t length;
	if (length_in == NULL)
	{
		if (fread(&length, sizeof(length), 1, ctx->in) != 1)
			return ERROR_IO;
	}
	else
	{
		length = *length_in;
	}

	// allocate buffer
	*buffer = calloc(length + 1, sizeof(char));
	if (*buffer == NULL)
		return ERROR_IO;

	// read rest of message
	if (fread(*buffer, length, 1, ctx->in) != 1)
		return ERROR_IO;

	// ensure message is the correct length
	if (strlen(*buffer) != length)
		return ERROR_IO;

	// parse json
	request_id id;
	struct json_token content;
	int parse_result = json_scanf(*buffer, length,
			"{request_id: %d, what: %Q, content: %T}", &id, what, &content);

	if (parse_result != 3)
		return ERROR_BAD_CONTENT;

	if (content.type != JSON_TYPE_OBJECT_END)
		return ERROR_BAD_CONTENT;

	// find handler
	handler_func handler = get_handler(*what);
	if (handler == NULL)
		return ERROR_NOT_IMPLEMENTED;

	RESULT result = handler(ctx, &content, response);
	return send_response(ctx->out, result, *what, id, response);
}

static RESULT common_handler(struct mc_context *ctx, uint32_t *length)
{
	char *what = NULL, *buffer = NULL;
	struct handler_response response = {0};
	RESULT ret = handle_single_message_wrapped(ctx, length, &what, &buffer, &response);

	if (what != NULL)
		free(what);
	if (buffer != NULL)
		free(buffer);
	if (response.data != NULL)
	{
		free(response.data);

		if (response.data_allocd != NULL && response.freer != NULL)
		{
			response.freer(response.data_allocd);
			free(response.data_allocd);
		}
	}

	return ret;
}

RESULT handle_single_message_with_length(struct mc_context *ctx, uint32_t length)
{
	return common_handler(ctx, &length);
}

RESULT handle_single_message(struct mc_context *ctx)
{
	return common_handler(ctx, NULL);
}
