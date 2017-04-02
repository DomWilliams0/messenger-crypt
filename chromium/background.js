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

// insta response for requests from popup -> native
chrome.runtime.onMessage.addListener(function(msg, sender, callback) {
	if (msg.what == "state") {
		callback(state);
	}
	else {
		chrome.runtime.sendNativeMessage(name, msg, function(resp) {
			callback(resp.content);
		});
	}

	return true;
});
