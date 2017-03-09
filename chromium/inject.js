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

// runs in context of content script
function transmitForDecryption(messages) {
	// send directly to background
	backgroundPort.postMessage({
		what: "decrypt",
		content: messages
	});
}

// runs in context of webpage
function transmitForEncryption(message) {
	// post to content script, which forwards to background
	window.postMessage({
		type: "from-messenger",
		message: {
			what: "encrypt",
			content: message
		}
	}, "*");
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

						var convoId = window.location.pathname.slice(3);
						var fullState = regenerateState(); // TODO cache this
						var conversation = getConversationState(fullState, convoId);

						var message = {
							message:    decodeURI(json['body']) + "\n",
							recipients: conversation['participants'],
							id:         conversation['thread']['id']
						};

						transmitForEncryption(message);

						// TODO continue with original send()
					};
				}

				// block file uploading
				// else if (url.startsWith("https://upload.messenger.com/ajax/mercury/upload.php")) {
				// 	request.send = function(params) {
				// 		var arg = arguments;
				// 		getSettingValues(["block-files"], function(settings) {
				// 			if (settings['block-files']) {
				// 				var key = arg[0].entries().next()['value'][0];
				// 				arg[0].set(key, {});
				// 				alert("No files for you!");
				//  				// alertFileBlocked();
				// 			}
				// 			return sendOrig.apply(request, arg);
				// 		});
				// 	};
				// }

			}

			return openOrig.apply(this, arguments);
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

	addFunc(overloadOpen, true);
	addFunc(regenerateState, false);
	addFunc(getConversationState, false);
	addFunc(transmitForEncryption, false);
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

// open connection to background
backgroundPort = chrome.runtime.connect({name: "contentToBackground"});

// listen for messages to forward to background from page
window.addEventListener("message", function(e) {
	if (e.source == window && e.data.type === "from-messenger") {
		var wrappedMessage = e.data.message;
		backgroundPort.postMessage(wrappedMessage);
	}
}, false);

window.addEventListener("load", function(e) {
	// message decrypting
	startPolling(500);

	// sent message interception and encryption
	patchRequestSending();

	// state polling
	//startStatePolling(50);

}, false);


