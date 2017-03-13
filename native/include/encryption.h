#ifndef MC_ENCRYPTION_H
#define MC_ENCRYPTION_H

struct decrypt_result
{
	char *error;
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

void decrypt(char *ciphertext, struct decrypt_result *result);

void encrypt(char *plaintext, struct recipient *recipients, unsigned int recipient_count, struct encrypt_result *result);

#endif
