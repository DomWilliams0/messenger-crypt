// returns: [ {sender: xxx, message: xxx}, ... ]
//             ^^^^^^
//          null for self
function getAllMessages(messageBox) {
	var messageList = [];
	var rawMessages = messageBox.getElementsByClassName('_3oh-')
	for (var i = 0; i < rawMessages.length; i++) {
		var m = rawMessages[i];

		// ensure this is an actual message
		if (m.parentNode.tagName != 'DIV' || m.tagName != 'SPAN') {
			continue;
		}

		// determine if sender is self
		var sender;
		var isSelf;
		if (m.parentNode.getAttribute('data-tooltip-position') == 'right') {
			sender = null;
			isSelf = true;
		}

		// find sender
		else {
			// TODO recurse parents instead of this?
			var profile = m.parentNode.parentNode.parentNode.parentNode;
			var profileImage = profile.getElementsByTagName('img')[0];
			sender = profileImage.getAttribute('alt');
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
			message: messageText
		});
	}

	return messageList;
};

window.addEventListener("load", function(e) {

	const pollTime = 250;

	function waitForMessageBox(callback) {
		var messageBox = document.querySelector('[aria-label="Messages"]');

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

	function debugPrintMessages(messageBox) {
		var messages = getAllMessages(messageBox);

		// debug print
		for (var i = 0; i < messages.length; i++) {
			console.log(messages[i]);
		}
	};

	waitForMessageBox(debugPrintMessages);

}, false);
