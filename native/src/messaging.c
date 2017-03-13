#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "frozen/frozen.h"
#include "messaging.h"

#define MAX_MESSAGE_LENGTH (1024 * 1024)

static int handler_decrypt(struct json_token *content);

static handler handler_lookup[HANDLER_LAST] = {
	[DECRYPT] = handler_decrypt,
	NULL,
	NULL,
	NULL
};

static const char * const handle_strings[HANDLER_LAST] = {
	[DECRYPT] = "decrypt",
	[ENCRYPT] = "encrypt",
	[SETTINGS] = "settings",
	[CONVERSATION] = "conversation"
};

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
	char *what;
	struct json_token content;
	int parse_result = json_scanf(buffer, length,
			"{what: %Q, content: %T}", &what, &content);

	if (parse_result != 2)
		return 3;

	// find handler
	enum handler_type type = parse_handler_type(what);
	if (type == HANDLER_LAST)
		return 4;

	handler handler = handler_lookup[type];
	if (handler == NULL)
		return 5;

	int result = handler(&content);

	if (result == 0)
	{
		// TODO send response back
	}

	return 0;
}

enum handler_type parse_handler_type(const char *s)
{
	int i;
	for (i = 0; i < HANDLER_LAST; ++i)
		if (strcmp(s, handle_strings[i]) == 0)
			break;

	return (enum handler_type) i;
}

static int handler_decrypt(struct json_token *content)
{
	if (content->type != JSON_TYPE_ARRAY_END)
		return 1;

	// TODO parse message and id

	return 0;
}
