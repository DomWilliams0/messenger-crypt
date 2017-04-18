#ifndef MC_ENCRYPTION_H
#define MC_ENCRYPTION_H

#include "bool.h"
#include "error.h"

struct crypto_context;

struct crypto_config
{
	char *gpg_exe;
	char *home_dir;
};

RESULT crypto_ctx_create(struct crypto_context **out, struct crypto_config *config);
void crypto_ctx_destroy(struct crypto_context *ctx);

struct decrypt_result
{
	const char *error;
	char *signer;
	BOOL good_sig;
	BOOL was_decrypted;
	char *plaintext;
	char *ciphertext;
};

struct decrypt_extra_allocation
{
	char *input_buffer;
	char *output_buffer;
	char *gpg_plaintext;
	char *ciphertext;
	char *who_formatted;
};

struct encrypt_result
{
	const char *error;
	char *ciphertext;
	BOOL is_signed;
	BOOL is_encrypted;
};

struct encrypt_extra_allocation
{
	char *plaintext;
	char *ciphertext; // may == plaintext
	const char *error_message;
	char *input_buffer;
	char *output_buffer;
};

struct recipient
{
	char *fbid;
	char *name;
	const char *key_fpr;
};

// do not manually free any of these
struct get_key_result
{
	const char *error;
	BOOL serious_error; // not ambigious/invalid key error

	char *full_fpr;
	char *name;
	char *email;

	void *extra_allocs;
};

void decrypt(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result, struct decrypt_extra_allocation *alloc);

void decrypt_free_extra_allocations(void *);

void encrypt(struct crypto_context *ctx, char *plaintext,
		BOOL encrypt, BOOL sign,
		struct recipient *recipients, unsigned int recipient_count,
		struct encrypt_result *result, struct encrypt_extra_allocation *alloc,
		const char *personal_fpr);

void encrypt_free_extra_allocations(void *);

void get_key_free(struct get_key_result *result);
void get_key(struct crypto_context *ctx, char *key, BOOL secret, struct get_key_result *result, BOOL ignore_revoked);

#endif
