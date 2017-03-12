OBJ = obj
BIN = bin

TARGET = messenger_crypt_native
SRC = src
INC = include
LIB = $(LIB_DIR)/$(INC)

SRCS := $(shell find $(SRC) -type f -name '*.c')
OBJS := $(addprefix $(OBJ)/,$(notdir $(SRCS:%.c=%.o)))

CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -I$(INC) -O0
LDFLAGS = -Wall

VPATH=%.c $(SRC) $(LIB)

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
