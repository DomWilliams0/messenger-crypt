#!/bin/bash

set -x
set -e

NAME="ms.domwillia.messenger_crypt"
DIR=$(pwd)

MANIFEST_PATH="$DIR/native/manifest.json"
BINARY_PATH="$DIR/native/native.py"

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
	echo Uninstalled from $MANIFEST
else
	mkdir -p $MANIFEST_DIR
	cp -f $MANIFEST_PATH $MANIFEST

	sed -i "s:\\\$\\\$BINARY_PATH\\\$\\\$:$BINARY_PATH:" $MANIFEST
	chmod o+x $MANIFEST

	echo "Installed to $MANIFEST"
fi
