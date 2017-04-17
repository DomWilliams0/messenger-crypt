BIN = bin
OBJ = obj

GTEST_DIR = googletest/googletest
GTEST_CC = g++

$(BIN)/googletest.a: | build_dirs
	$(GTEST_CC) -isystem $(GTEST_DIR)/include -I$(GTEST_DIR) -pthread -c $(GTEST_DIR)/src/gtest-all.cc -o $(OBJ)/googletest.o
	ar -rv $@ $(OBJ)/googletest.o

.PHONY: tests
tests:
	@echo "It's testing time"

.PHONY: clean
clean:
	@rm -rf $(OBJ) $(BIN)

.PHONY: build_dirs
build_dirs:
	@mkdir -p $(BIN) $(OBJ)
