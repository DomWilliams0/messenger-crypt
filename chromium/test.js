var name = "ms.domwillia.messenger_crypt";
var port = chrome.runtime.connectNative(name);

window.addEventListener("load", function(e) {

	port.onMessage.addListener(function(m) {
		console.log("Got a message: " + m.message);
	});

	setInterval(function() {
		var message = {message: "hello", nonce: Math.ceil(Math.random() * 1000)};
		console.log("Sending %o", message);
		port.postMessage(message);
	}, 1000);



}, false);


