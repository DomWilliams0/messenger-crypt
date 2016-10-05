var LAST_MESSAGE_ID = 0;

function formatElementID(id) {
	return "pgp-msg-" + id;
}

function decryptMessages() {
	var messages = getAllMessages();
	if (!messages || messages.length == 0) {
		return;
	}

	// find encrypted messages
	for (var i = 0; i < messages.length; i++) {
		var msg = messages[i];

		// ensure this message hasn't already been processed
		if (msg.element.id && msg.element.id.startsWith("pgp-msg-")) {
			continue;
		}

		// pgp message found
		if (msg.message.startsWith("-----BEGIN PGP MESSAGE-----")) {
			// generate unique id
			var msgID = LAST_MESSAGE_ID;
			LAST_MESSAGE_ID += 1;

			// mark element with id
			msg["id"] = msgID;
			msg.element.id = formatElementID(msgID);

			transmitForDecryption(msg);
		}
	}
};

function startPolling(pollTime) {
	var running = false;

	setInterval(function() {
		// last call is still running
		if (running) {
			return;
		}

		running = true;
		decryptMessages();
		running = false;
	}, pollTime);
};

function patchRequestSending() {

	function overloadOpen() {
		var orig = window.XMLHttpRequest.prototype.open;
		window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
			if (method == "POST" && url.startsWith("/messaging/send")) {
				this.interceptMe = true;

				var origStateChange = this.onreadystatechange;
				this.onreadystatechange = function() {
					if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
						// TODO replace just-sent message with replaced message
					}

					origStateChange();
				};
			}

			return orig.apply(this, arguments);
		};
	};

	function overloadSend() {
		var orig = window.XMLHttpRequest.prototype.send;
		window.XMLHttpRequest.prototype.send = function(params) {
			if (this.interceptMe) {

				var json    = JSON.parse('{"' + params.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
				var request = this;
				var args    = arguments;

				// attachment
				if (!json['body'] || json['has_attachment'] == "true") {
					// TODO allow blocking in config, and make sure to block upload to upload.messenger.com
					console.log("Attachments (and stickers) are not currently supported");
					return orig.apply(this, arguments);
				}

				transmit("GET", "state", null, function(state) {
					if (state['net_error']) {
						console.error(state['net_error']);
						return orig.apply(this, null);
					}

					var convoState = getConversationState(state);
					var msg = {
						message:    decodeURI(json['body']) + "\n",
						recipients: convoState['participants']
					};

					var requestContext = {
						origSend:     orig,
						request:      request,
						formDataJson: json
					};
					transmitForEncryption(msg, requestContext);
				});
			}
			else
				return orig.apply(this, arguments);
		};
	};

	function addFunc(func, execute) {
		var script = document.createElement("script");
		if (execute) {
			script.textContent = "(" + func + ")();";
		}
		else {
			script.textContent = func.toString();
		}

		(document.head||document.documentElement).appendChild(script);
		script.remove();
	};

	addFunc(transmit, false);
	addFunc(transmitForEncryption, false);
	addFunc(getConversationState, false);
	addFunc(overloadOpen, true);
	addFunc(overloadSend, true);
};

function startStatePolling(pollTime) {
	var oldPath = null;
	function hasPathChanged() {
		var newPath = window.location.pathname;
		if (newPath != oldPath) {
			oldPath = newPath;
			return true;
		}

		return false;
	};

	function intervalCallback() {
		if (hasPathChanged()) {
			transmit("POST", "state", regenerateState());
		};
	};

	// initalisation
	setInterval(intervalCallback, pollTime);
};

window.addEventListener("load", function(e) {
	// message decrypting
	startPolling(250);

	// sent message interception and encryption
	patchRequestSending();

	// state polling
	startStatePolling(50);

}, false);


