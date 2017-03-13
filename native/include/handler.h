#ifndef MC_HANDLER_H
#define MC_HANDLER_H

enum handler_type
{
	DECRYPT = 0,
	ENCRYPT,
	SETTINGS,
	CONVERSATION,

	HANDLER_LAST
};

struct json_token;
typedef int (*handler_func)(struct json_token *, char **);

handler_func get_handler(const char * const what);

int handler_decrypt(struct json_token *content, char **out);


#endif
