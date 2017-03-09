var name = "ms.domwillia.messenger_crypt";
var portNative = chrome.runtime.connectNative(name);

// native comms
portNative.onMessage.addListener(function(m) {
	var what = m.what;
	var content = m.content;
	if (what === undefined || content === undefined) {
		console.warn("Bad message from host");
		return;
	}

	// decrypted messages
	if (what === "decrypt") {
		console.log("Received %d decrypted messages", content.length);
	}

});

// content script comms
chrome.runtime.onConnect.addListener(function(portContent) {
	if (portContent.name != "contentToBackground") {
		return;
	}

	portContent.onMessage.addListener(function(msg) {
		portNative.postMessage(msg);
	});
});
