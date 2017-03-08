var LAST_MESSAGE_ID = 0;
var backgroundPort;

function formatElementID(id) {
	return "pgp-msg-" + id;
}

function decryptMessages() {
	var messages = getAllMessages();
	if (!messages || messages.length == 0) {
		return;
	}

	// find encrypted messages
	var encryptedMessages = [];
	for (var i = 0; i < messages.length; i++) {
		var msg = messages[i];

		// ensure this message hasn't already been processed
		if (msg.element.id && msg.element.id.startsWith("pgp-msg-")) {
			continue;
		}

		// pgp message found
		if (msg.message.startsWith("-----BEGIN PGP ")) {
			// generate unique id
			var msgID = LAST_MESSAGE_ID;
			LAST_MESSAGE_ID += 1;

			// mark element with id
			msg["id"] = msgID;
			msg.element.id = formatElementID(msgID);
			delete msg.element;

			encryptedMessages.push(msg);
		}
	}

	if (encryptedMessages.length > 0) {
		transmitForDecryption(encryptedMessages);
	}
};

function transmitForDecryption(messages) {
	// send to background
	backgroundPort.postMessage({
		what: "decrypt",
		content: messages
	});
}

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
		var openOrig = window.XMLHttpRequest.prototype.open;
		window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
			if (method == "POST") {
				var request  = this;
				var sendOrig = this.send;

				// message intercepting
				if (url.startsWith("/messaging/send")) {
					request.send = function(params) {
						var json = JSON.parse('{"' + params.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');

						// remove undefined messages
						if (json['has_attachment'] != "false") {
							json['body'] = "";
						}

						transmit("GET", "state", null, function(state) {
							if (!state) {
								errorConversationTooOld();
								return;
							}

							var msg = {
								message:    decodeURI(json['body']) + "\n",
								recipients: state['participants'],
								id:         state['thread']['id']
							};

							var requestContext = {
								origSend:     sendOrig,
								request:      request,
								formDataJson: json
							};
							transmitForEncryption(msg, requestContext);
						});
					};
				}

				// block file uploading
				else if (url.startsWith("https://upload.messenger.com/ajax/mercury/upload.php")) {
					request.send = function(params) {
						var arg = arguments;
						getSettingValues(["block-files"], function(settings) {
							if (settings['block-files']) {
								var key = arg[0].entries().next()['value'][0];
								arg[0].set(key, {});
								alert("No files for you!");
								// alertFileBlocked();
							}

							return sendOrig.apply(request, arg);
						});
					};

				}
			}

			return openOrig.apply(this, arguments);
		};
	};

	// function addFunc(func, execute) {
	// 	var script = document.createElement("script");
	// 	if (execute) {
	// 		script.textContent = "(" + func + ")();";
	// 	}
	// 	else {
	// 		script.textContent = func.toString();
	// 	}

	// 	(document.head||document.documentElement).appendChild(script);
	// 	script.remove();
	// };

	// addFunc(getSettingValues, false);
	// addFunc(alertFileBlocked, false);
	// addFunc(transmit, false);
	// addFunc(setBadgeState, false);
	// addFunc(setBadgeError, false);
	// addFunc(flattenJSON, false);
	// addFunc(transmitForEncryption, false);
	// addFunc(getConversationState, false);
	// addFunc(overloadOpen, true);
};

function startStatePolling(pollTime) {
	var oldPath = null;
	function hasPathChanged() {
		var newPath = window.location.pathname.slice(3);
		if (newPath != oldPath) {
			oldPath = newPath;
			return true;
		}

		return false;
	};

	function intervalCallback() {
		if (hasPathChanged()) {
			var newState = {
				global: regenerateState(), // has to be run in content script context
				convo:  oldPath
			};

			chrome.runtime.sendMessage({action: "set_state", data: newState}, function(resp) {});
		};
	};

	// initalisation
	setInterval(intervalCallback, pollTime);
};

window.addEventListener("load", function(e) {
	// open connection to background
	backgroundPort = chrome.runtime.connect({name: "contentToBackground"});

	// message decrypting
	startPolling(500);

	// sent message interception and encryption
	//patchRequestSending();

	// state polling
	//startStatePolling(50);

}, false);


