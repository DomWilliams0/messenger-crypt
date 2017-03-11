var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);
var portContent;

// native comms
portNative.onMessage.addListener(function(m) {
	portContent.postMessage(m);
});

// content script comms
chrome.runtime.onConnect.addListener(function(port) {
	if (port.name != "contentToBackground") {
		return;
	}

	// store for later
	portContent = port;

	portContent.onMessage.addListener(function(msg) {
		portNative.postMessage(msg);
	});
});

portNative.onDisconnect.addListener(function(e) {
	console.log("Disconnected: %o", chrome.runtime.lastError);
});

// insta response
chrome.runtime.onMessage.addListener(function(msg, sender, callback) {
	chrome.runtime.sendNativeMessage(name, msg, function(resp) {
		callback(resp.content);
	});

	return true;
});
