#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "native.h"
#include "handler.h"
#include "config.h"

struct contact_fbid
{
	char *fbid;
	struct contact contact;
	struct contact_fbid *next;
};

struct contact_fetch_response
{
	struct contact_fbid *contacts; // same as extra alloc data
};

static int fbid_map_printer(struct json_out *out, va_list *args)
{
	struct contact_fetch_response *resp = va_arg(*args, struct contact_fetch_response *);
	struct contact_fbid *curr = resp->contacts;

	unsigned int len = 0;
	BOOL first = TRUE;
	len += json_printf(out, "{", 1);
	while (curr)
	{
		if (!first)
		{
			first = TRUE;
			len += json_printf(out, ", ");
		}

		len += json_printf(out, "%Q: {key: %Q, name: %Q, email: %Q}",
				curr->fbid, curr->contact.key_fpr, curr->contact.name, curr->contact.email);

		struct contact_fbid *free_me = curr;
		curr = curr->next;
		free(free_me->fbid);
		free(free_me);
	}
	len += json_printf(out, "}", 1);

	return len;
}

static RESULT fetch_contacts(struct mc_context *ctx, struct json_token *content,
		struct contact_fetch_response *resp)
{
	struct json_token token;
	struct contact_fbid *last = NULL;
	struct contact contact;
	for (unsigned int i = 0; json_scanf_array_elem(content->ptr, content->len, ".fbids", i, &token) > 0; ++i)
	{
		char *fbid;
		// this fails to find the first quote - library bug?
		// if (json_scanf(token.ptr, token.len, "%Q", &fbid) != 1)
		// 	continue;
		fbid = calloc(token.len + 1, sizeof(char));
		if (fbid == NULL)
			return ERROR_MEMORY;
		strncpy(fbid, token.ptr, token.len);


		if (config_get_contact(ctx->config, fbid, &contact) == SUCCESS)
		{
			struct contact_fbid *c = calloc(1, sizeof(struct contact_fbid));
			if (c == NULL)
			{
				free(fbid);
				return ERROR_MEMORY;
			}

			if (last == NULL)
				resp->contacts = c;
			else
				last->next = c;
			last = c;

			c->contact = contact;
			c->fbid = fbid;
		}
		else
		{
			free(fbid);
		}
	}

	return SUCCESS;
}

static RESULT handler_contacts_wrapper(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	BOOL get;
	if (json_scanf(content->ptr, content->len,"{get: %B}", &get) != 1)
		return ERROR_BAD_CONTENT;

	if (get)
	{
		struct contact_fetch_response *resp = calloc(1, sizeof(struct contact_fetch_response));
		if (resp == NULL)
			return ERROR_MEMORY;

		RESULT err;
		if ((err = fetch_contacts(ctx, content, resp)) != SUCCESS)
		{
			free(resp);
			return err;
		}

		response->data = resp;
		response->printer = fbid_map_printer;

		return SUCCESS;
	}
	else
	{
		// TODO set and response
		return ERROR_NOT_IMPLEMENTED;
	}

}

RESULT handler_contacts(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	RESULT result = handler_contacts_wrapper(ctx, content, response);

	return result;
}
