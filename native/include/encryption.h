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

void decrypt(char *ciphertext, struct decrypt_result *result);

#endif
