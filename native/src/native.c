#include <stdio.h>
#include "messaging.h"

int main(void)
{
	int result;
	while (1)
	{
		result = handle_single_message();

		if (result != 0)
		{
#ifdef DEBUG
			fprintf(stderr, "Bad message handling: %d\n", result);
#else
			break;
#endif

		}
	}
  return 0;
}
