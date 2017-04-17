#include "error.h"

const char *error_get_message(int err)
{
	switch(err)
	{
		case ERROR_MEMORY:
			return "Memory allocation";
		case ERROR_CONFIG_WRITE:
			return "Saving config to file";
		case ERROR_CONFIG_KEY_CREATION:
			return "Config key creation";
		case ERROR_CONFIG_KEY_MISSING:
			return "Config key missing";
		case ERROR_NOT_IMPLEMENTED:
			return "Not implemented";
		case ERROR_BAD_CONTENT:
			return "Unexpected message content";
		case ERROR_IO:
			return "Browser IO";
		case ERROR_GPG:
			return "GPGme";
		case ERROR_GPG_INVALID_KEY:
			return "Key not found in local keyring";
		case ERROR_GPG_AMBIGUOUS_KEY:
			return "Ambigious key identifier";
		case ERROR_ENVIRONMENT:
			return "Program environment";
		default:
			return "Unknown error code";
	}
}
