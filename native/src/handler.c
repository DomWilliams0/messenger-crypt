#include <string.h>
#include "handler.h"

static handler_func handler_lookup[HANDLER_LAST] = {
	[DECRYPT] = handler_decrypt,
	[ENCRYPT] = handler_encrypt,
	NULL,
	NULL
};

static const char * const handle_strings[HANDLER_LAST] = {
	[DECRYPT]      = "decrypt",
	[ENCRYPT]      = "encrypt",
	[SETTINGS]     = "settings",
	[CONVERSATION] = "conversation"
};

static enum handler_type parse_handler_type(const char *s)
{
	int i;
	for (i = 0; i < HANDLER_LAST; ++i)
		if (strcmp(s, handle_strings[i]) == 0)
			break;

	return (enum handler_type) i;
}

handler_func get_handler(const char *what)
{
	enum handler_type type = parse_handler_type(what);
	if (type != HANDLER_LAST)
		return handler_lookup[type];

	return NULL;
}
