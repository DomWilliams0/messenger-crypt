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

var YUGE_JSON = null;
function updateCachedState() {

	function findScript() {
		s = Array.from(document.body.children).find(function(x, i, a) {
			return x.innerHTML.startsWith(
				"require(\"TimeSlice\").guard(function() {require(\"ServerJSDefine\").handleDefines("
			);
		});

		return s ? s.innerHTML : null;
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
	};

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

	YUGE_JSON = json;
};

function getConversationParticipants() {
	function findParticipantFromVanity(participants, vanity) {
		var p = participants.find(function(x, i, a) {
			return x['vanity'] == vanity;
		});

		return p ? p['id'] : null;
	};

	function findPartipantsFromThreadID(threads, id) {
		var t = threads.find(function(x, i, a) {
			return x['thread_fbid'] == id;
		});

		return t ? t['participants'] : null;
	};

	function getCurrentParticipants(threads, participants) {
		// get current conversation ID
		// remove /t/ from path
		var path = document.location.pathname.slice(3);

		// non-group chat with single person
		var singleParticipant = findParticipantFromVanity(participants, path);
		if (singleParticipant) {
			return [singleParticipant];
		}

		// group chat with multiple participants
		var groupParticipants = findPartipantsFromThreadID(threads, path);
		return groupParticipants;
	};

	function objectifyParticipants(participants, ids) {
		for (var i = 0; i < ids.length; i++) {
			var pid = ids[i];
			var fullParticpant = participants.find(function(x, i, a) {
				return x['id'] == pid;
			});

			ids[i] = {
				"name":    fullParticpant['name'],
				"fbid":    fullParticpant['id'],
				"profile": fullParticpant['href']
			}
		}

		return ids;
	};

	// TODO do these ever change? can we cache them instead of reprocessing everytime?
	var threads      = YUGE_JSON['mercuryPayload']['threads'];
	var participants = YUGE_JSON['mercuryPayload']['participants'];
	if (!threads || !participants) {
		console.error("Failed to extract threads or participants");
		return;
	}

	var participantIDs = getCurrentParticipants(threads, participants);
	return objectifyParticipants(participants, participantIDs);
};
