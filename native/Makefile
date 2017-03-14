OBJ = obj
BIN = bin
LIB = lib
SRC = src
INC = include

SRCS := $(shell find $(SRC) -type f -name '*.c')
OBJS := $(addprefix $(OBJ)/,$(notdir $(SRCS:%.c=%.o)))

TARGET_NAME = messenger_crypt_native
JSON_LIB_NAME = libfrozen.a

TARGET = $(BIN)/$(TARGET_NAME)
JSON_LIB = $(BIN)/$(JSON_LIB_NAME)

CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -I$(INC) -I$(LIB) -O1 $(shell gpgme-config --cflags)
LDFLAGS = $(shell gpgme-config --libs) -L$(BIN) -lfrozen -lconfig

VPATH=%.c $(SRC)

.PHONY: default
default: $(TARGET)

$(OBJ)/%.o : %.c | build_dirs
	$(CC) $(CFLAGS) -c $< -o $@ -c

$(TARGET): $(OBJS) $(JSON_LIB)
	$(CC) $(CFLAGS) $(OBJS) $(LDFLAGS) -o $@

$(JSON_LIB):
	$(CC) $(CFLAGS) -fPIC $(LIB)/frozen/frozen.c -shared -o $@


.PHONY: clean
clean:
	@rm -rf $(OBJ) $(BIN)

.PHONY: build_dirs
build_dirs:
	@mkdir -p $(BIN) $(OBJ)
