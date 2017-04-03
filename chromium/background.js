var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);
var portContent;
var portPopup;

var state;

// response from native -> content
portNative.onMessage.addListener(function(m) {
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
				portNative.postMessage(msg);
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
				portNative.postMessage(msg);
			}
		});
	}
});

portNative.onDisconnect.addListener(function(e) {
	console.log("Disconnected: %o", chrome.runtime.lastError);
});

function sendNativeMessage(msg, callback) {
	chrome.runtime.sendNativeMessage(name, msg, function(resp) {
		callback(resp.content);
	});
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
