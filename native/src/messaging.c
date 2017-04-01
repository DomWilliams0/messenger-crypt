#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "error.h"
#include "frozen/frozen.h"
#include "messaging.h"
#include "handler.h"

#define MAX_OUTGOING_SIZE (1024 * 1024)

static char outgoing_buffer[MAX_OUTGOING_SIZE];

static int error_printer(struct json_out *out, va_list *args)
{
	RESULT *r = va_arg(*args, RESULT *);
	return json_printf(out, "{error: %Q}", error_get_message(*r));
}

static RESULT send_response(RESULT result, char *what, struct handler_response *response)
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
	unsigned int real_size = json_printf(&out_to_buffer, "{what: %Q, content: %M}",
			what, printer, data);

	// send size before payload
	if (fwrite(&real_size, sizeof(real_size), 1, stdout) != 1)
		return ERROR_IO;

	if (fwrite(outgoing_buffer, real_size, 1, stdout) != 1)
		return ERROR_IO;

	fflush(stdout);
	return SUCCESS;
}

static RESULT handle_single_message_wrapped(struct mc_context *ctx, char **buffer, char **what, struct handler_response *response)
{
	// read length
	uint32_t length;
	if (fread(&length, sizeof(length), 1, stdin) != 1)
		return ERROR_IO;

	// allocate buffer
	*buffer = calloc(length + 1, sizeof(char));
	if (*buffer == NULL)
		return ERROR_IO;

	// read rest of message
	if (fread(*buffer, length, 1, stdin) != 1)
		return ERROR_IO;

	// parse json
	struct json_token content;
	int parse_result = json_scanf(*buffer, length,
			"{what: %Q, content: %T}", what, &content);

	if (parse_result != 2)
		return ERROR_BAD_CONTENT;

	if (content.type != JSON_TYPE_OBJECT_END)
		return ERROR_BAD_CONTENT;

	// find handler
	handler_func handler = get_handler(*what);
	if (handler == NULL)
		return ERROR_NOT_IMPLEMENTED;

	RESULT result = handler(ctx, &content, response);
	return send_response(result, *what, response);
}

RESULT handle_single_message(struct mc_context *ctx)
{
	char *what = NULL, *buffer = NULL;
	struct handler_response response = {0};
	RESULT ret = handle_single_message_wrapped(ctx, &what, &buffer, &response);

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
