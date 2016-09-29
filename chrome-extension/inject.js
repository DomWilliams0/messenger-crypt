var LAST_MESSAGE_ID = 0;

function formatElementID(id) {
	return "pgp-msg-" + id;
}

function decryptMessages() {
	var messages = getAllMessages();
	if (!messages || messages.length == 0) {
		console.log("No messages found");
		return;
	}

	// find encrypted messages
	for (var i = 0; i < messages.length; i++) {
		var msg = messages[i];

		// ensure this message hasn't already been processed
		if (msg.id && msg.id.startsWith("pgp-msg-")) {
			continue;
		}

		// pgp message found
		if (msg.message.startsWith("-----BEGIN PGP MESSAGE-----")) {
			// generate unique id
			var msgID = LAST_MESSAGE_ID;
			LAST_MESSAGE_ID += 1;

			// mark element with id
			msg["id"] = msgID;
			msg.element.id = formatElementID(msgID);

			transmitForDecryption(msg, onRecvDecryptedMessage);
		}
	}
};

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

window.addEventListener("load", function(e) {
	startPolling(250);
}, false);
