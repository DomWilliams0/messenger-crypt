#ifndef MC_MESSAGING_H
#define MC_MESSAGING_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include "native.h"
#include "error.h"

RESULT handle_single_message_with_length(struct mc_context *ctx, uint32_t length);

RESULT handle_single_message(struct mc_context *ctx);


#ifdef __cplusplus
}
#endif

#endif
