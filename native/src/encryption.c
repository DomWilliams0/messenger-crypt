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


