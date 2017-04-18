#ifndef MC_ERROR_H
#define MC_ERROR_H

#ifdef __cplusplus
extern "C" {
#endif

#define SUCCESS (0)
typedef int RESULT;

#define ERROR_MEMORY              (0x1000)
#define ERROR_CONFIG_WRITE        (0x1001)
#define ERROR_CONFIG_KEY_CREATION (0x1002)
#define ERROR_CONFIG_KEY_MISSING  (0x1003)
#define ERROR_NOT_IMPLEMENTED     (0x1004)
#define ERROR_BAD_CONTENT         (0x1005)
#define ERROR_IO                  (0x1006)
#define ERROR_GPG                 (0x1007)
#define ERROR_GPG_INVALID_KEY     (0x1008)
#define ERROR_GPG_AMBIGUOUS_KEY   (0x1009)
#define ERROR_ENVIRONMENT         (0x1010)
#define ERROR_UNEXPECTED_NULL     (0x1011)

#ifdef __cplusplus
extern "C" {
#endif

const char *error_get_message(int err);

#ifdef __cplusplus
}
#endif


#ifdef __cplusplus
}
#endif

#endif
