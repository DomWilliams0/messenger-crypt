var nextMessageID = 0;
var backgroundPort;

var decryptCache = {
	cache: {},

	put: function(ciphertext, toCache) {
		var hash = md5(ciphertext);
		this.cache[hash] = toCache;
	},

	lookup: function(msg) {
		var hash = md5(msg);
		return this.cache[hash];
	}
};

function formatElementID(id) {
	return "pgp-msg-" + id;
}

// {message: ..., isMe: boolean, element})
function decryptSingleMessage(msg) {

	// ensure this message hasn't already been processed
	if (msg.element.id && msg.element.id.startsWith("pgp-msg-")) { return; }

	// pgp message found
	if (msg.message.startsWith("-----BEGIN PGP ")) {

		var msgID;
		var cached;

		// lookup in cache
		// TODO limit cache size?
		cached = decryptCache.lookup(msg.message);
		if (cached) {
			msg.element.id = formatElementID(cached.id);
			recvAfterDecryption(cached);
			return;
		}

		// generate unique id
		var msgID = nextMessageID;
		nextMessageID += 1;

		// mark element with id
		msg.id = msgID;
		msg.element.id = formatElementID(msgID);

		// placeholder message bubble
		formatDecryptionInProgressMessageElement(msg.element);
		delete msg.element;


		backgroundPort.postMessage({
			what: "decrypt",
			content: msg
		});
	}
}
function formatDecryptionInProgressMessageElement(element) {
	element.innerText = "Decrypting...";
	element.parentNode.parentNode.style.backgroundColor = "#bbb";
	element.parentNode.parentNode.style.color = "#666";
}

// element: the message box element
// status:  {
// 		status: status message,
// 		message: decrypted message,
// 		errored: if there was an error,
// 		decrypted: if the message was decrypted,
// 		signed: if the message was signed,
// 		wellSigned: if the message has a good signature
// }
function formatDecryptedMessageElement(element, status) {
	// simple and ugly

	// change background colour
	var colour = "#148c29"; // default success green

	if (status.errored)
		colour = "#c0392b"; // error red

	else if (status.signed && !status.wellSigned)
		colour = "#e67e22"; // bad signature

	else if (!status.signed && !status.decrypted)
		colour = null; // no colour change

	if (colour != null) {
		element.parentNode.parentNode.style.backgroundColor = colour;
		element.parentNode.parentNode.style.color = "#ecf0f1";
	}

	// change message content
	element.innerHTML = "<i>" + status.status + "</i><hr/>" + status.message;
}

function recvAfterDecryption(message) {
	// add to cache
	decryptCache.put(message.ciphertext, message);

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
	var messageContent = message.plaintext || "";

	var statusMessage = "";

	// decryption status
	if (error) {
		// failure
		statusMessage += "Error: " + error;
	}
	else {
		var msgDesc = null;
		if (decrypted) {
			msgDesc = "Decrypted message";
		}
		else {
			msgDesc = "Verified message";
		}

		// signing
		if (signer) {

			// good signature
			if (wellSigned) {
				statusMessage += msgDesc + " with good signature from " + signer;
			}

			// badly signed
			else {
				statusMessage += msgDesc + " with BAD signature from " + signer;
			}
		}

		// unsigned
		else {
			statusMessage += "Decrypted unsigned message";
		}
	}

	var status = {
		status: statusMessage,
		message: messageContent,
		errored: Boolean(error), // if an error occurred
		decrypted: decrypted,    // if the message was decrypted
		signed: Boolean(signer), // if the message was signed at all (good or bad)
		wellSigned: wellSigned   // if the message has a good signature
	};

	formatDecryptedMessageElement(element, status);
}

// runs in context of webpage
function pausedStateInsert(pausedContext) {
	// allocate id
	var id = pausedStateInsert.nextID || 0;
	pausedStateInsert.nextID = id + 1;

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

// deprecated
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

			// messagebox is replaced
			watchForNewMessages(decryptSingleMessage);

			// decrypt existing messages
			findMessages(decryptSingleMessage);

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

						// forward stickers/likes without touching
						if (json['has_attachment'] != "false") {
							return sendOrig.apply(this, arguments);
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

	// sent message interception and encryption
	patchRequestSending();

	// polling for conversation changes
	startConversationPolling(200);

}, false);


