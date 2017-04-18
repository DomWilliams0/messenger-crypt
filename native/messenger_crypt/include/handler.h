#ifndef MC_HANDLER_H
#define MC_HANDLER_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdarg.h>
#include "native.h"
#include "bool.h"

enum handler_type
{
	DECRYPT = 0,
	ENCRYPT,
	SETTINGS,
	CONVERSATION,
	CONTACTS,

	HANDLER_LAST
};

struct json_out;
typedef int (*response_printer)(struct json_out *, va_list *);

struct handler_response
{
	void *data;
	response_printer printer;

	// extra data to free
	void *data_allocd;
	void (*freer)(void *);
};

struct json_token;
typedef RESULT (*handler_func)(struct mc_context *, struct json_token *, struct handler_response *);


handler_func get_handler(const char * const what);

RESULT handler_decrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response);
RESULT handler_encrypt(struct mc_context *ctx, struct json_token *content, struct handler_response *response);
RESULT handler_settings(struct mc_context *ctx, struct json_token *content, struct handler_response *response);
RESULT handler_conversation(struct mc_context *ctx, struct json_token *content, struct handler_response *response);
RESULT handler_contacts(struct mc_context *ctx, struct json_token *content, struct handler_response *response);



#ifdef __cplusplus
}
#endif

#endif
