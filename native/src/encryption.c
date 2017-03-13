#include <stdlib.h>
#include "encryption.h"

void decrypt(char *ciphertext, struct decrypt_result *result)
{
	result->error = NULL;
	result->signer = "Mr Signer";
	result->good_sig = 1;
	result->was_decrypted = 1;
	result->plaintext = "This is my decrypted message!";
}


void encrypt(char *plaintext, struct recipient *recipients, unsigned int recipient_count, struct encrypt_result *result)
{
	result->is_signed = 0;
	result->is_encrypted = 0;
	result->ciphertext = "No encrypted message here";
	result->error = NULL;
}
