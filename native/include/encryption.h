#ifndef MC_ENCRYPTION_H
#define MC_ENCRYPTION_H

struct crypto_context;

struct crypto_context *crypto_ctx_create();
void crypto_ctx_destroy(struct crypto_context *ctx);

struct decrypt_result
{
	const char *error;
	char *signer;
	int good_sig;
	int was_decrypted;
	char *plaintext;
};

struct encrypt_result
{
	char *error;
	char *ciphertext;
	int is_signed;
	int is_encrypted;
};

struct recipient
{
	char *fbid;
	char *name;
};

void decrypt(struct crypto_context *ctx, char *ciphertext, struct decrypt_result *result);

void encrypt(struct crypto_context *ctx, char *plaintext, struct recipient *recipients, unsigned int recipient_count, struct encrypt_result *result);

#endif
