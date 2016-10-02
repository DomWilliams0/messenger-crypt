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

			transmitForDecryption(msg, onRecvDecryptedMessage);
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

				var msg = {
					message:    decodeURI(json['body']) + "\n",
					recipients: getConversationParticipants()
				};

				transmitForEncryption(msg, function(response) {
					json['body'] = response['message'];
					var newArgs = Object.keys(json).map(k => k + '=' + json[k]).join('&')
					return orig.apply(request, [newArgs]);
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
			script.textContent = "" + func;
		}

		(document.head||document.documentElement).appendChild(script);
		script.remove();
	};

	addFunc(transmitForEncryption, false);
	addFunc(getConversationParticipants, false);
	addFunc(overloadOpen, true);
	addFunc(overloadSend, true);
};

window.addEventListener("load", function(e) {
	startPolling(250);

	patchRequestSending();

}, false);


