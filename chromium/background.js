var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);
var portContent;

// native comms
portNative.onMessage.addListener(function(m) {
	var what = m.what;

	// decrypted messages
	if (what === "decrypt") {
		portContent.postMessage(m);
	}

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
