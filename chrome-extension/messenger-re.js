// returns: [ {sender: xxx, message: xxx}, ... ]
//             ^^^^^^
//          null for self
function getAllMessages() {

	var messageBox = document.querySelector("[aria-label=\"Messages\"]");
	if (!messageBox) {
		return [];
	}

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

function getConversationParticipants() {
	function getInfoPanel() {
		var h3s = document.getElementsByTagName("h3")
		for (var i = 0; i < h3s.length; i++) {
			if (h3s[i].innerText == "Conversation information") {
				return h3s[i].parentNode;
			}
		}
	}

	function getHugeJSON() {

		function findScript() {
		var scripts = document.body.children;
			for (var i = 0; i < scripts.length; i++) {
				var s = scripts[i];
				if (s.innerHTML.startsWith("require(\"TimeSlice\").guard(function() {require(\"ServerJSDefine\").handleDefines(")) {
					return s.innerHTML;
				}
			}
		};

		function findNthFromEnd(s, n, search) {
			var index = undefined;
			for (var i = 0; i < n; i++) {
				index = s.lastIndexOf(search, index - 1);;
			}
			return index;
		};

		function extractJSONFromYugeString(scriptText) {
			// find start and end of desired JSON
			var startIndex = scriptText.indexOf("\"mercuryPayload");
			var endIndex = findNthFromEnd(scriptText, 4, "}");

			if (startIndex < 0 || endIndex < 0) {
				console.error("Failed to find substring between " + startIndex + " and " + endIndex);
				return null;
			}

			var subscript = scriptText.substring(startIndex, endIndex)
			return JSON.parse("{" + subscript + "}");
		}

		var script = findScript();
		if (!script) {
			console.error("Failed to find massive script");
			return null;
		}
		var json = extractJSONFromYugeString(script);
		if (!json) {
			console.error("Failed to extract valid JSON from yuuuge string");
			return null;
		}

		var threads = json['mercuryPayload']['threads'];
		var participants = json['mercuryPayload']['participants'];
		if (!threads || !participants) {
			console.error("Failed to extract threads or participants");
			return;
		}

		console.log("threads: " + threads);
		console.log("participants: " + participants);
	}

	var participants = []

	var yuge = getHugeJSON();

	return participants;
}
