#ifndef MC_HANDLER_H
#define MC_HANDLER_H

#include <stdarg.h>

enum handler_type
{
	DECRYPT = 0,
	ENCRYPT,
	SETTINGS,
	CONVERSATION,

	HANDLER_LAST
};

struct json_out;
typedef int (*response_printer)(struct json_out *, va_list *);

struct handler_response
{
	void *data;
	response_printer printer;
};

struct json_token;
typedef int (*handler_func)(struct json_token *, struct handler_response *);


handler_func get_handler(const char * const what);

int handler_decrypt(struct json_token *content, struct handler_response *response);
int handler_encrypt(struct json_token *content, struct handler_response *response);


#endif
