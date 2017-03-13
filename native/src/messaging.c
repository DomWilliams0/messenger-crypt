#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "frozen/frozen.h"
#include "messaging.h"
#include "handler.h"

#define MAX_MESSAGE_LENGTH (1024 * 1024)

static char buffer[MAX_MESSAGE_LENGTH + 1];

int handle_single_message()
{
	// read length
	uint32_t length;
	if (fread(&length, sizeof(length), 1, stdin) != 1)
		return 1;

	// read rest of message
	if (fread(buffer, length, 1, stdin) != 1)
		return 2;
	buffer[length] = '\0';

	// parse json
	// TODO free me!
	char *what;
	struct json_token content;
	int parse_result = json_scanf(buffer, length,
			"{what: %Q, content: %T}", &what, &content);

	if (parse_result != 2)
		return 3;

	// find handler
	handler_func handler = get_handler(what);
	if (handler == NULL)
		return 4;

	struct handler_response response;
	int result = handler(&content, &response);

	if (result == 0)
	{
		// send response back
		// TODO stdout
		struct json_out out = JSON_OUT_FILE(stderr);
		json_printf(&out, "{what: %Q, content: %M}", what, response.printer, response.data);
	}

	if (response.data != NULL)
		free(response.data);

	return 0;
}
