#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "frozen/frozen.h"
#include "messaging.h"
#include "handler.h"

#define MAX_OUTGOING_SIZE (1024 * 1024)

static char outgoing_buffer[MAX_OUTGOING_SIZE];

static int handle_single_message_wrapped(char **buffer, char **what, struct handler_response *response)
{
	// read length
	uint32_t length;
	if (fread(&length, sizeof(length), 1, stdin) != 1)
		return 1;

	// allocate buffer
	*buffer = calloc(length + 1, sizeof(char));
	if (*buffer == NULL)
		return 2;

	// read rest of message
	if (fread(*buffer, length, 1, stdin) != 1)
		return 3;

	// parse json
	// TODO free me!
	struct json_token content;
	int parse_result = json_scanf(*buffer, length,
			"{what: %Q, content: %T}", what, &content);

	if (parse_result != 2)
		return 4;

	// find handler
	handler_func handler = get_handler(*what);
	if (handler == NULL)
		return 5;

	int result = handler(&content, response);

	if (result == 0)
	{
		struct json_out out_to_buffer = JSON_OUT_BUF(outgoing_buffer, MAX_OUTGOING_SIZE);

		// proxy response through buffer to get length first
		unsigned int real_size = json_printf(&out_to_buffer, "{what: %Q, content: %M}", *what,
				response->printer, response->data);

		// send size before payload
		if (fwrite(&real_size, sizeof(real_size), 1, stdout) != 1)
			return 6;

		if (fwrite(outgoing_buffer, real_size, 1, stdout) != 1)
			return 7;

		fflush(stdout);
	}

	return 0;
}

int handle_single_message()
{
	char *what = NULL, *buffer = NULL;
	struct handler_response response = {0};
	int ret = handle_single_message_wrapped(&what, &buffer, &response);

	if (what != NULL)
		free(what);
	if (buffer != NULL)
		free(buffer);
	if (response.data != NULL)
		free(response.data);

	return ret;
}
