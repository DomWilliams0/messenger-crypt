#ifndef MC_MESSAGING_H
#define MC_MESSAGING_H

enum handler_type
{
	DECRYPT = 0,
	ENCRYPT,
	SETTINGS,
	CONVERSATION,

	HANDLER_LAST
};

struct json_token;
typedef int (*handler)(struct json_token *content);

// returns 0 on success
int handle_single_message();

enum handler_type parse_handler_type(const char *s);

#endif
