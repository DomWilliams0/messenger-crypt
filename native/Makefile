OBJ = obj
BIN = bin
LIB = lib
SRC = src
INC = include

SRCS := $(shell find $(SRC) -type f -name '*.c')
SRCS += $(LIB)/frozen/frozen.c

OBJS := $(addprefix $(OBJ)/,$(notdir $(SRCS:%.c=%.o)))

TARGET = messenger_crypt_native
CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -I$(INC) -I$(LIB) -O1
LDFLAGS = -Wall

VPATH=%.c $(SRC) $(LIB)/frozen

.PHONY: default
default: $(TARGET)

$(OBJ)/%.o : %.c
	$(CC) $(CFLAGS) -c $< -o $@ -c

$(TARGET): $(OBJS) | build_dirs
	$(CC) $(LDFLAGS) $(CFLAGS) $(OBJS) -o $(BIN)/$@

.PHONY: clean
clean:
	@rm -rf $(OBJ) $(BIN)

.PHONY: build_dirs
build_dirs:
	@mkdir -p $(BIN) $(OBJ)
