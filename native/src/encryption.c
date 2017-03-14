#include <string.h>
#include <stdlib.h>
#include <gpgme.h>

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
	char *gpg_plaintext;
	char *who_formatted;
};

struct crypto_context *crypto_ctx_create()
{
	struct crypto_context *ctx = calloc(1, sizeof(struct crypto_context));
	if (ctx == NULL)
		return ctx;


	gpgme_check_version(NULL);

	if (gpgme_new(&ctx->gpg) != GPG_ERR_NO_ERROR)
	{
		free(ctx);
		return NULL;
	}

	return ctx;
}

void crypto_ctx_destroy(struct crypto_context *ctx)
{
	gpgme_release(ctx->gpg);
	if (ctx->gpg_plaintext != NULL)
		gpgme_free(ctx->gpg_plaintext);
	if (ctx->who_formatted != NULL)
		gpgme_free(ctx->who_formatted);

	free(ctx);
}

static void detect_message(const char *msg, int *is_just_signed, int *is_encrypted)
{
	const char *signed_prefix    = "-----BEGIN PGP SIGNED";
	const char *encrypted_prefix = "-----BEGIN PGP MESSAGE";
	const int prefix_len = strlen(signed_prefix);

	*is_just_signed = strncmp(msg, signed_prefix, prefix_len);
	*is_encrypted = strncmp(msg, encrypted_prefix, prefix_len);
}

static void decrypt_wrapper(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result,
		gpgme_data_t *buf_i, char **gpg_plaintext, char **who_formatted)
{
	// what do
	int is_just_signed, is_encrypted;
	detect_message(ciphertext, &is_just_signed, &is_encrypted);

	// nothing to do
	if (!is_just_signed && !is_encrypted)
		return;

	gpgme_error_t err;
	gpgme_signature_t sigs = NULL;

	// create buffers
	gpgme_data_t buf_o;
	DO_SAFE(gpgme_data_new_from_mem(buf_i, ciphertext, strlen(ciphertext), 0));
	DO_SAFE(gpgme_data_new(&buf_o));

	// just verify
	if (is_just_signed)
	{
		// dummy message in case of failure
		result->plaintext = dummy_signed;

		DO_SAFE(gpgme_op_verify(ctx->gpg, *buf_i, NULL, buf_o));

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
		DO_SAFE(gpgme_op_decrypt_verify(ctx->gpg, *buf_i, buf_o));

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
	// TODO possible to avoid cloning ?
	size_t plaintext_len;
	*gpg_plaintext = gpgme_data_release_and_get_mem(buf_o, &plaintext_len);
	result->plaintext = *gpg_plaintext;
	buf_o = NULL;

	// validate signatures
	if (sigs != NULL)
	{
		// only check first signature
		gpgme_signature_t sig = sigs;

		char who_fpr[FINGERPRINT_LEN + 1];
		char *who_name = "Unknown";
		strncpy(who_fpr + (strlen(sig->fpr) - FINGERPRINT_LEN), sig->fpr, FINGERPRINT_LEN);

		if (sig->key != NULL)
		{
			// get augmented whois
			gpgme_user_id_t uid = sig->key->uids;
			if (uid != NULL)
			{
				who_name = uid->name;
			}
		}

		// TODO free me!
		gpgrt_asprintf(who_formatted, "%s (%s)", who_name, who_fpr);
		result->signer = *who_formatted;

		// bad
		if (sig->status != GPG_ERR_NO_ERROR)
		{
			result->error = gpgme_strerror(sig->status);
			return;
		}

		result->good_sig = 1;
	}
}

void decrypt(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result)
{
	gpgme_data_t buf_i = NULL;

	result->good_sig = 0;
	result->was_decrypted = 0;
	result->signer = "";
	result->plaintext = "";
	result->error = NULL;

	// cleanup from last operation (just like gpgme)
	if (ctx->gpg_plaintext != NULL)
	{
		gpgme_free(ctx->gpg_plaintext);
		ctx->gpg_plaintext = NULL;
	}
	if (ctx->who_formatted != NULL)
	{
		gpgme_free(ctx->who_formatted);
		ctx->who_formatted = NULL;
	}

	decrypt_wrapper(ctx, ciphertext, result, &buf_i, &ctx->gpg_plaintext, &ctx->who_formatted);

	if (buf_i != NULL)
		gpgme_data_release(buf_i);
}

void encrypt(struct crypto_context *ctx, char *plaintext, struct recipient *recipients, unsigned int recipient_count, struct encrypt_result *result)
{
	result->is_signed = 0;
	result->is_encrypted = 0;
	result->ciphertext = "No encrypted message here";
	result->error = NULL;
}
