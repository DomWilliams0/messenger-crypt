#include <string.h>
#include <stdlib.h>
#include "frozen/frozen.h"
#include "native.h"
#include "encryption.h"
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
	struct contact_fbid *contacts;
};

struct contact_update_response
{
	const char *error;
	struct get_key_result result;
};

static int contact_update_printer(struct json_out *out, va_list *args)
{
	struct contact_update_response *resp = va_arg(*args, struct contact_update_response *);

	int len = json_printf(out, "{error: %Q, key: %Q, name: %Q, email: %Q}",
			resp->error, resp->result.full_fpr, resp->result.name, resp->result.email);

	get_key_free(&resp->result);

	return len;
}

static RESULT update_contact(struct mc_context *ctx, struct json_token *content, struct contact_update_response *resp)
{
	char *fbid, *new_key = NULL;
	BOOL secret;

	int json_count = json_scanf(content->ptr, content->len, "{fbid: %Q, key: %Q, secret: %B}", &fbid, &new_key, &secret);
	if (json_count != 2 && json_count != 3) // null doesnt count
		return ERROR_BAD_CONTENT;

	// fetch key if setting
	if (new_key != NULL)
	{
		struct setting_value ignore_revoked;
		config_get_setting(ctx->config, SETTING_IGNORE_REVOKED, &ignore_revoked);
		get_key(ctx->crypto, new_key, secret, &resp->result, ignore_revoked.value.bool);
		if (resp->result.error != NULL)
		{
			resp->error = resp->result.error;
			free(fbid);
			free(new_key);
			get_key_free(&resp->result);
			return resp->result.serious_error ? ERROR_GPG : SUCCESS; // success -> error is passed to browser
		}

		free(new_key);
	}

	// update config
	struct contact contact;
	contact.name = resp->result.name;
	contact.email = resp->result.email;
	contact.key_fpr = resp->result.full_fpr;

	RESULT err;
	if ((err = config_set_contact(ctx->config, fbid, &contact)) != SUCCESS)
	{
		free(fbid);
		return err;
	}

	free(fbid);
	return SUCCESS;
}

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
		struct contact_update_response *resp = calloc(1, sizeof(struct contact_update_response));
		if (resp == NULL)
			return ERROR_MEMORY;

		RESULT err = update_contact(ctx, content, resp);
		if (err != SUCCESS)
		{
			free(resp);
			return err;
		}

		// any response needed
		response->data = resp;
		response->printer = contact_update_printer;

		return SUCCESS;
	}

}

RESULT handler_contacts(struct mc_context *ctx, struct json_token *content, struct handler_response *response)
{
	RESULT result = handler_contacts_wrapper(ctx, content, response);

	return result;
}
