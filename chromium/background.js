var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);

// native comms
portNative.onMessage.addListener(function(m) {
	console.log("Got a message: " + m.message);
});

// content script comms
chrome.runtime.onConnect.addListener(function(portContent) {
	if (portContent.name != "contentToBackground") {
		return;
	}

	portContent.onMessage.addListener(function(msg) {
		// TODO send to native to decrypt/encrypt
	});
});
