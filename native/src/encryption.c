#include <string.h>
#include <stdlib.h>
#include <gpgme.h>

#include "error.h"
#include "config.h"
#include "encryption.h"

#define FINGERPRINT_LEN (8)

#define DO_SAFE(b) do \
	if ((err = (b)) != GPG_ERR_NO_ERROR) \
	{ \
		result->error = gpgme_strerror(err); \
		return; \
	} \
	while (0)

static char *dummy_signed = "-----BEGIN PGP SIGNED MESSAGE-----\n...\n...\n-----END PGP SIGNATURE-----";
static char *dummy_encrypted = "-----BEGIN PGP MESSAGE-----\n...\n...\n-----END PGP MESSAGE-----";

struct crypto_context
{
	gpgme_ctx_t gpg;
};

RESULT crypto_ctx_create(struct crypto_context **out)
{
	struct crypto_context *ctx = calloc(1, sizeof(struct crypto_context));
	if (ctx == NULL)
		return ERROR_MEMORY;

	gpgme_check_version(NULL);

	if (gpgme_new(&ctx->gpg) != GPG_ERR_NO_ERROR)
	{
		free(ctx);
		return ERROR_MEMORY;
	}

	*out = ctx;
	return SUCCESS;
}

void crypto_ctx_destroy(struct crypto_context *ctx)
{
	gpgme_release(ctx->gpg);
	free(ctx);
}

static void detect_message(const char *msg, BOOL *is_just_signed, BOOL *is_encrypted)
{
	const char *signed_prefix    = "-----BEGIN PGP SIGNED";
	const char *encrypted_prefix = "-----BEGIN PGP MESSAGE";
	const int prefix_len = strlen(signed_prefix);

	BOOL sig = (strncmp(msg, signed_prefix, prefix_len) == 0);
	BOOL enc = (strncmp(msg, encrypted_prefix, prefix_len) == 0);

	*is_just_signed = sig;
	*is_encrypted = enc;
}

static void decrypt_wrapper(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result,
		gpgme_data_t *buf_i, gpgme_data_t *buf_o, char **gpg_plaintext, char **who_formatted)
{
	// what do
	BOOL is_just_signed, is_encrypted;
	detect_message(ciphertext, &is_just_signed, &is_encrypted);

	// nothing to do
	if (!is_just_signed && !is_encrypted)
		return;

	gpgme_error_t err;
	gpgme_signature_t sigs = NULL;

	// create buffers
	DO_SAFE(gpgme_data_new_from_mem(buf_i, ciphertext, strlen(ciphertext), 0));
	DO_SAFE(gpgme_data_new(buf_o));

	// just verify
	if (is_just_signed)
	{
		// dummy message in case of failure
		result->plaintext = dummy_signed;

		DO_SAFE(gpgme_op_verify(ctx->gpg, *buf_i, NULL, *buf_o));

		gpgme_verify_result_t verify = gpgme_op_verify_result(ctx->gpg);

		// failed verify
		if (verify == NULL)
		{
			result->error = "Failed to verify message";
			return;
		}

		sigs = verify->signatures;
	}

	// decrypt with possible sign too
	else
	{
		result->plaintext = dummy_encrypted;
		DO_SAFE(gpgme_op_decrypt_verify(ctx->gpg, *buf_i, *buf_o));

		gpgme_decrypt_result_t decrypt = gpgme_op_decrypt_result(ctx->gpg);
		gpgme_verify_result_t verify = gpgme_op_verify_result(ctx->gpg);

		if (decrypt == NULL)
		{
			result->error = "Failed to decrypt message";
			return;
		}

		if (verify != NULL)
			sigs = verify->signatures;
	}

	result->was_decrypted = is_encrypted;

	// copy plaintext
	size_t plaintext_len;
	*gpg_plaintext = gpgme_data_release_and_get_mem(*buf_o, &plaintext_len);
	result->plaintext = *gpg_plaintext;
	result->plaintext[plaintext_len] = '\0';
	*buf_o = NULL;

	// validate signatures
	if (sigs != NULL)
	{
		// only check first signature
		gpgme_signature_t sig = sigs;

		char who_fpr[FINGERPRINT_LEN + 1];
		char *who_name = "Unknown";
		strncpy(who_fpr,sig->fpr  + (strlen(sig->fpr) - FINGERPRINT_LEN), FINGERPRINT_LEN);
		who_fpr[FINGERPRINT_LEN] = '\0';

		// lookup key
		gpgme_key_t signing_key;
		err = gpgme_get_key(ctx->gpg, sig->fpr, &signing_key, 0);
		if (err == GPG_ERR_NO_ERROR)
		{
			// get augmented whois
			gpgme_user_id_t uid = signing_key->uids;
			if (uid != NULL)
			{
				who_name = uid->name;
			}
		}

		gpgrt_asprintf(who_formatted, "%s (%s)", who_name, who_fpr);
		result->signer = *who_formatted;

		gpgme_key_unref(signing_key);

		// bad
		if (sig->status != GPG_ERR_NO_ERROR)
		{
			result->error = gpgme_strerror(sig->status);
			return;
		}

		result->good_sig = TRUE;
	}
}

void decrypt(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result, struct decrypt_extra_allocation *alloc)
{
	result->good_sig = FALSE;
	result->was_decrypted = FALSE;
	result->signer = "";
	result->plaintext = "";
	result->error = NULL;

	gpgme_data_t buf_i, buf_o;

	decrypt_wrapper(ctx, ciphertext, result, &buf_i, &buf_o, &alloc->gpg_plaintext, &alloc->who_formatted);

	size_t size_unused;
	if (buf_i != NULL)
		alloc->input_buffer = gpgme_data_release_and_get_mem(buf_i, &size_unused);

	if (buf_o != NULL)
		alloc->output_buffer = gpgme_data_release_and_get_mem(buf_o, &size_unused);
}

void decrypt_free_extra_allocations(void *data)
{
	struct decrypt_extra_allocation *alloc = (struct decrypt_extra_allocation *)data;

	if (alloc->input_buffer != NULL)
		gpgme_free(alloc->input_buffer);
	if (alloc->gpg_plaintext != NULL)
		gpgme_free(alloc->gpg_plaintext);
	if (alloc->who_formatted != NULL)
		gpgme_free(alloc->who_formatted);
	if (alloc->output_buffer != NULL)
		gpgme_free(alloc->output_buffer);
}

void encrypt(struct crypto_context *ctx, char *plaintext, struct recipient *recipients, unsigned int recipient_count, struct encrypt_result *result)
{
	result->is_signed = FALSE;
	result->is_encrypted = FALSE;
	result->ciphertext = "No encrypted message here";
	result->error = NULL;
}

void get_key_free(struct get_key_result *result)
{
	gpgme_key_t key = (gpgme_key_t)result->extra_allocs;
	if (key != NULL)
	{
		gpgme_key_unref(key);
		result->extra_allocs = NULL;
	}
}

static gpgme_error_t get_next_key(gpgme_ctx_t ctx, gpgme_key_t *out, BOOL ignore_revoked)
{
	gpgme_error_t err;
	gpgme_key_t tmp_key;
	while (TRUE)
	{
		// success
		if ((err = gpgme_op_keylist_next(ctx, &tmp_key)) == GPG_ERR_NO_ERROR)
		{
			// check revoked status
			if (ignore_revoked && tmp_key->revoked)
			{
				// next!
				gpgme_key_unref(tmp_key);
				continue;
			}

			*out = tmp_key;
		}

		return err;
	}
}

static RESULT get_key_fuzzy(gpgme_ctx_t ctx, char *key, gpgme_key_t *out, BOOL secret, BOOL ignore_revoked)
{
	gpgme_error_t err;

	// start searching
	if ((err = gpgme_op_keylist_start(ctx, key, secret)) != GPG_ERR_NO_ERROR)
		return ERROR_GPG; // could not start searching

	// get first
	if ((err = get_next_key(ctx, out, ignore_revoked)) != GPG_ERR_NO_ERROR)
	{
		gpgme_op_keylist_end(ctx);
		return ERROR_GPG_INVALID_KEY; // could not find any matching keys
	}

	// get second
	gpgme_key_t dummy;
	if ((err = get_next_key(ctx, &dummy, ignore_revoked)) == GPG_ERR_NO_ERROR)
	{
		gpgme_key_unref(dummy);
		gpgme_op_keylist_end(ctx);
		return ERROR_GPG_AMBIGUOUS_KEY; // found multiple keys
	}

	gpgme_op_keylist_end(ctx);

	return SUCCESS;
}

void get_key(struct crypto_context *ctx, char *key, BOOL secret, struct get_key_result *result, BOOL ignore_revoked)
{
	gpgme_key_t out_key = NULL;
	RESULT err = get_key_fuzzy(ctx->gpg, key, &out_key, secret, ignore_revoked);
	result->extra_allocs = out_key;
	if (err == SUCCESS)
	{
		result->error = NULL;
		result->full_fpr = out_key->fpr;

		gpgme_user_id_t uid = out_key->uids;
		result->name = uid->name;
		result->email = uid->email;

		result->extra_allocs = (void*)out_key;
	}
	else
	{
		result->error = error_get_message(err);
		result->serious_error = err == ERROR_GPG;
	}
}
