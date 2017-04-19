#!/bin/bash

set -e

NAME="ms.domwillia.messenger_crypt"
DIR=$(pwd)

MANIFEST_PATH="$DIR/native/manifest.json"
BINARY_DIR="$DIR/native"
BINARY_PATH="$BINARY_DIR/build/messenger_crypt_native"

# where
# TODO other browsers and os than linux/chromium
if [[ "$EUID" = 0 ]]; then
	MANIFEST_DIR="/etc/opt/chromium/native-messaging-hosts"
else
	MANIFEST_DIR="$HOME/.config/chromium/NativeMessagingHosts"
fi

MANIFEST=$MANIFEST_DIR/$NAME.json

# what do
if [[ "$1" = "uninstall" ]]; then
	rm -f $MANIFEST
	make -C $BINARY_DIR clean
	echo Uninstalled from $MANIFEST
else
	make -C $BINARY_DIR

	mkdir -p $MANIFEST_DIR
	cp -f $MANIFEST_PATH $MANIFEST

	sed -i "s:\\\$\\\$BINARY_PATH\\\$\\\$:$BINARY_PATH:" $MANIFEST
	chmod o+x $MANIFEST

	echo "Installed to $MANIFEST"
fi
