// returns: [ {sender: xxx, message: xxx}, ... ]
//             ^^^^^^
//          null for self
function getAllMessages(messageBox) {
	var messageList = [];
	var rawMessages = messageBox.getElementsByClassName("_3oh-")
	for (var i = 0; i < rawMessages.length; i++) {
		var m = rawMessages[i];

		// ensure this is an actual message
		if (m.parentNode.tagName != "DIV" || m.tagName != "SPAN") {
			continue;
		}

		// determine if sender is self
		var sender;
		var isSelf;
		if (m.parentNode.getAttribute("data-tooltip-position") == "right") {
			sender = null;
			isSelf = true;
		}

		// find sender
		else {
			// TODO recurse parents instead of this?
			var profile = m.parentNode.parentNode.parentNode.parentNode;
			var profileImage = profile.getElementsByTagName("img")[0];
			sender = profileImage.getAttribute("alt");
			isSelf = false;
		}

		var messageText = m.innerText;

		// something went wrong
		if (!messageText || (!sender && !isSelf)) {
			continue;
		}

		// add to returned array
		messageList.push({
			sender:  sender,
			message: messageText,
			element: m
		});
	}

	return messageList;
};

function formatElementID(id) {
	return "pgp-msg-" + id;
}

function onRecvDecryptedMessage(msg) {
	// find message element
	var element = document.getElementById(formatElementID(msg['id']))

	// no longer visible, oh well
	if (!element) {
		return;
	}

	var success = msg['decrypted'] === true;

	// create temporarily incredibly ugly status header
	var statusElement = "<div>";

	// decryption status
	statusElement += "<b>";
	if (!success) {
		statusElement += msg["error"];
	}
	else {
		statusElement += "Successfully decrypted message";
	}
	statusElement += "</b></div>";

	// update message content
	element.innerHTML = statusElement + msg.message;
}

function transmitForDecryption(msg, decryptionCallback) {
	var http = new XMLHttpRequest();
	var url = "https://localhost:50456/decrypt";

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == 4 && http.status == 200) {
			var resp = http.responseText;
			var respJSON = JSON.parse(resp);
			decryptionCallback(respJSON);
		}
	};

	console.log("Sending " + msg.id + " for decryption");

	delete msg.element;
	http.send(JSON.stringify(msg));
};

window.addEventListener("load", function(e) {

	const pollTime = 250;

	function waitForMessageBox(callback) {
		var messageBox = document.querySelector("[aria-label=\"Messages\"]");

		// wait until next poll
		if(!messageBox) {
			setTimeout(function() {
				waitForMessageBox(callback);
			}, pollTime);
			return;
		}

		// messagebox was found
		callback(messageBox);
	};

	function messageBoxCallback(messageBox) {
		var messages = getAllMessages(messageBox);
		if (!messages || messages.length == 0) {
			console.log("No messages found");
			return;
		}

		// find encrypted messages
		for (var i = 0; i < messages.length; i++) {
			var msg = messages[i];

			// ensure this message hasn't already been processed
			if (msg.id && msg.id.startsWith('pgp-msg-')) {
				continue;
			}

			// pgp message found
			if (msg.message.startsWith("-----BEGIN PGP MESSAGE-----")) {
				// generate unique id
				var msgID = messageBoxCallback.lastMessageID;
				messageBoxCallback.lastMessageID += 1;

				console.log("Found PGP message " + msgID);

				// mark element with id
				msg["id"] = msgID;
				msg.element.id = formatElementID(msgID);

				transmitForDecryption(msg, onRecvDecryptedMessage);
			}
		}

	};
	// "static"
	messageBoxCallback.lastMessageID = 0;

	// off we go
	waitForMessageBox(messageBoxCallback);

}, false);
