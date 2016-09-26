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

function transmitForDecryption(msg, decryptionCallback) {
	// TODO
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

			if (msg.message.startsWith("-----BEGIN PGP MESSAGE-----")) {
				// send to local server to try to decrypt
				// response contains:
				//	success
				//	recipient(s)
				//	signed
				//	valid signature

				// mark element with id
				var msgID = messageBoxCallback.lastMessageID;
				messageBoxCallback.lastMessageID += 1;

				msg["id"] = msgID;
				msg.element.id = "pgp-msg-" + msgID;

				transmitForDecryption(msg);
			}
		}


	};
	// "static"
	messageBoxCallback.lastMessageID = 0;

	waitForMessageBox(messageBoxCallback);

}, false);
