var nextMessageID = 0;
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
			var msgID = nextMessageID;
			nextMessageID += 1;

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
	for (var i = 0; i < messages.length; i++) {
		backgroundPort.postMessage({
			what: "decrypt",
			content: messages[i]
		});
	}
}

function recvAfterDecryption(message) {
	// find message element
	var element = document.getElementById(formatElementID(message['id']))

	// no longer visible, oh well
	if (!element) {
		return;
	}

	var error = message.error;

	var signer = message.signer;
	var wellSigned = message.good_sig;

	var decrypted = message.was_decrypted;
	var messageContent = message.plaintext;

	var colour = null;

	// create "temporarily" incredibly ugly status header
	var statusElement = "<div>";

	// decryption status
	statusElement += "<b>";
	if (error) {
		// failure
		statusElement += error;
	}
	else {
		var msgDesc = null;
		if (decrypted) {
			msgDesc = "Decrypted message";
			colour  = "#0f844d";
		}
		else {
			msgDesc = "Verified message";
			colour  = "#0d7d8e";
		}

		// signing
		if (signer) {

			// good signature
			if (wellSigned) {
				statusElement += msgDesc + " with good signature from " + signer;
			}

			// badly signed
			else {
				statusElement += msgDesc + " with BAD signature from " + signer;
				colour = null;
			}
		}

		// unsigned
		else {
			statusElement += "Decrypted unsigned message";
		}
	}
	statusElement += "</b></div>";

	// error colour
	if (colour == null) {
		colour = "#bd0e0e";
	}

	// update message box
	element.innerHTML = statusElement + messageContent;
	element.parentNode.parentNode.style.backgroundColor = colour;
	element.parentNode.parentNode.style.color = "#fff";
}

// runs in context of webpage
function pausedStateInsert(pausedContext) {
	// allocate id
	var id = pausedStateInsert.nextID || 0;
	pausedStateInsert.id += 1;

	// store in lookup
	if (!pausedStateInsert.lookup)
		pausedStateInsert.lookup = {};
	pausedStateInsert.lookup[id] = pausedContext;

	return id;
}

// runs in context of webpage
function transmitForEncryption(message, pausedContext) {
	// append message ID to message and store paused context
	message["paused_request_id"] = pausedStateInsert(pausedContext);
	message["recipient_count"] = message.recipients.length;

	// post message content to content script, which forwards to background
	window.postMessage({
		type: "from-messenger",
		message: {
			what: "encrypt",
			content: message
		}
	}, "*");
}

// runs in context of content script
function recvAfterEncryption(message) {
	window.postMessage({
		type: "to-messenger",
		message: message
	}, "*");
}

// runs in context of webpage
function listenForModifiedMessages() {
	window.addEventListener("message", function(e) {
		if (e.source == window && e.data.type === "to-messenger") {
			var content = e.data.message;

			// lookup paused request
			var lookup = pausedStateInsert.lookup;
			if (!lookup) {
				console.error("Cannot unpause message request, but that is the least of your worries");
				return;
			}

			var pausedContext = lookup[content["paused_request_id"]];
			if (!pausedContext) {
				console.error("Unable to unpause message request");
				return;
			}
			delete lookup[content["paused_request_id"]];

			var newMessage = content.ciphertext;
			var error = content.error;
			var newArgs;

			// handle errors
			if (error) {
				alert("Failed to encrypt outgoing message: " + error);
				newArgs = null; // block request
			}
			else {
				// replace message body
				var json = pausedContext.requestBody;
				json.body = encodeURIComponent(newMessage);

				// flatten json
				newArgs = [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
			}

			// continue request with real send function
			pausedContext.originalSend.apply(pausedContext.requestInstance, newArgs);
		}
	}, false);
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

function startConversationPolling(pollTime) {
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
			chrome.runtime.sendMessage({
				what: "state",
				content: fetchCachedState()
			});
		};
	};

	setInterval(intervalCallback, pollTime);
};

function fetchCachedState() {
	var convoId = window.location.pathname.slice(3);
	var fullState = regenerateState(); // TODO actually cache, you savage
	var conversation = getConversationState(fullState, convoId);

	// update in background
	window.postMessage({
		type: "from-messenger",
		message: {
			what: "state",
			content: conversation
		}
	}, "*");

	return conversation;
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

						var conversation = fetchCachedState();

						var message = {
							message:    decodeURIComponent(json['body']),
							recipients: conversation['participants'],
							id:         conversation['thread']['id']
						};

						var pausedContext = {
							originalSend:     sendOrig,
							requestInstance:  request,
							requestBody:      json
						};
						transmitForEncryption(message, pausedContext);

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

	function addExecutedFunction(func) {
		var script = document.createElement("script");
		script.textContent = "(" + func + ")();";
		(document.head||document.documentElement).appendChild(script);
		script.remove();
	};
	function addNonExecutedFunctions(funcs) {
		var script = document.createElement("script");
		script.textContent = funcs.join("\n");
		(document.head||document.documentElement).appendChild(script);
		script.remove();
	};

	// inject functions into page
	addExecutedFunction(overloadOpen);
	addExecutedFunction(listenForModifiedMessages);
	addNonExecutedFunctions([
		fetchCachedState,
		regenerateState,
		getConversationState,
		transmitForEncryption,
		pausedStateInsert
	]);
};

// open connection to background
backgroundPort = chrome.runtime.connect({name: "contentToBackground"});

// listen for messages from webpage
window.addEventListener("message", function(e) {
	if (e.source == window && e.data.type === "from-messenger") {
		var wrappedMessage = e.data.message;
		backgroundPort.postMessage(wrappedMessage);
	}
}, false);

// listen for responses from background
backgroundPort.onMessage.addListener(function(msg) {
	var what = msg.what;
	if (what === "decrypt")
		recvAfterDecryption(msg.content)
	else if (what === "encrypt")
		recvAfterEncryption(msg.content)
});

window.addEventListener("load", function(e) {
	// get initial state
	fetchCachedState();

	// message decrypting
	startPolling(500);

	// sent message interception and encryption
	patchRequestSending();

	// polling for conversation changes
	startConversationPolling(500);

}, false);


