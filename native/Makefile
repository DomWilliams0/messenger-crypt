
TOKEN = $(shell cat .coveralls-repo-token)

.PHONY: default
default: build

.PHONY: build
.ONESHELL:
build: | build_dir
	@cd build
	@cmake . ..
	@make messenger_crypt_native

.PHONY: tests
.ONESHELL:
tests: | build_dir
	@cd build
	@cmake . .. -Dcoveralls=ON
	@make messenger_crypt_tests
	@./messenger_crypt_tests/messenger_crypt_tests

.PHONY: coverage
.ONESHELL:
coverage: tests | build_dir
	@cd build
	@lcov --directory messenger_crypt/CMakeFiles/messenger_crypt.dir/src -c -o coverage.info
	@lcov --remove coverage.info '/usr/*' -o coverage.info
	@lcov --list coverage.info


.PHONY: upload
.ONESHELL:
upload: coverage | build_dir
	@cd build
	[ -n "$(TOKEN)" ]
	@coveralls-lcov --repo-token $(TOKEN) coverage.info


.PHONY: build_dir
build_dir:
	@mkdir -p build
