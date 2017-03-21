#ifndef MC_ERROR_H
#define MC_ERROR_H

#define SUCCESS (0)
typedef int RESULT;

#define ERROR_MEMORY              (0x1000)
#define ERROR_CONFIG_WRITE        (0x1001)
#define ERROR_CONFIG_KEY_CREATION (0x1002)
#define ERROR_CONFIG_KEY_MISSING  (0x1003)
#define ERROR_NOT_IMPLEMENTED     (0x1004)
#define ERROR_BAD_CONTENT         (0x1005)
#define ERROR_IO                  (0x1006)

const char *error_get_message(int err);


#endif
