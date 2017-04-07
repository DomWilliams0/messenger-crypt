var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);
var portContent;
var portPopup;

var state;

var responseLookup = {
	nextID: 0,
	lookup: {}
};


// response from native -> content
portNative.onMessage.addListener(function(m) {
	// get callback
	var reqID = m.request_id;
	delete m.request_id;
	if (!(reqID === undefined)) {
		var callback = responseLookup.lookup[reqID];
		delete responseLookup.lookup[reqID];
		if (callback) {
			callback(m.content);
		}
	}

	// pass on
	portContent.postMessage(m);
});

// content script comms
chrome.runtime.onConnect.addListener(function(port) {
	if (port.name === "contentToBackground") {
		portContent = port;

		// request from content -> native
		port.onMessage.addListener(function(msg) {
			if (msg.what === "state") {
				state = msg.content;
			}
			else {
				sendNativeMessage(msg);
			}
		});
	}

	else if (port.name === "popupToBackground") {
		portPopup = port;

		port.onMessage.addListener(function(msg, sender, callback) {
			if (msg.what === "state") {
				callback(state);
			}
			else {
				sendNativeMessage(msg);
			}
		});
	}
});

portNative.onDisconnect.addListener(function(e) {
	console.log("Disconnected: %o", chrome.runtime.lastError);
});

function sendNativeMessage(msg, callback) {
	// assign request id
	var reqID = responseLookup.nextID;
	responseLookup.lookup[reqID] = callback;
	responseLookup.nextID += 1;

	msg.request_id = reqID;
	portNative.postMessage(msg);
}

function updateBadgeFromBackground() {
	var conversationGetter = {
		what: "conversation",
		content: {
			get: true,
			id: state.thread.id
		}
	};

	sendNativeMessage(conversationGetter, function(conversation) {
		updateBadge(conversation.encryption, conversation.signing);
	});
}

// insta response for requests from popup -> native
chrome.runtime.onMessage.addListener(function(msg, sender, callback) {
	if (msg.what == "state") {
		if (msg.content) {
			state = msg.content;
		}
		else {
			callback(state);
		}

		updateBadgeFromBackground();
	}
	else {
		sendNativeMessage(msg, callback);
	}

	return true;
});

// disable popup on non messenger pages
chrome.tabs.onActivated.addListener(function(activeInfo) {
	var tabId = activeInfo.tabId;
	chrome.tabs.get(tabId, function(tab) {
		if (tab.highlighted && tab.url.startsWith("https://www.messenger.com/t/")) {
			chrome.browserAction.enable();
			updateBadgeFromBackground();
		}
		else {
			chrome.browserAction.disable();
			setBadgeText("");
		}

	});
});
