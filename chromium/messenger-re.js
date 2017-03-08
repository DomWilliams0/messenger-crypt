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

		// add to returned array
		messageList.push({
			message: m.innerText,
			element: m
		});
	}

	return messageList;
};

function regenerateState() {

	function findScript() {
		var s = Array.from(document.body.children).find(function(x, i, a) {
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

	return {
		threads:      json['mercuryPayload']['threads'],
		participants: json['mercuryPayload']['participants']
	}
}

function getConversationState(globalState, convo) {
	function findThread(allThreads, allParticipants) {
		var fullThread = allThreads.find(function(x, i, a) {
			return x['thread_fbid'] == convo;
		});

		// group
		if (fullThread) {
			return fullThread;
		}

		// single user
		var participantID = allParticipants.find(function(x, i, a) {
			return x['vanity'] == convo;
		});

		if (!participantID) { return null; }

		return allThreads.find(function(x, i, a) {
			return x['other_user_fbid'] == participantID['fbid'];
		});
	};

	function getConversationName(thread, participants) {
		var name = thread['name'];
		if (name) {
			return name;
		}

		name = participants[0]['name'];
		if (participants.length > 2) {
			var len = participants.length - 2;
			name += " and " + len + " other";
			if (len > 1) {
				name += "s";
			}
		}

		return name;
	};

	var allThreads      = globalState['threads'];
	var allParticipants = globalState['participants'];

	// get current thread
	var fullThread = findThread(allThreads, allParticipants);

	if (!fullThread) {
		console.error("Failed to get state for old conversation '" + convo + "'");
		return;
	}

	var participantIDs = fullThread['participants'];
	var participants   = participantIDs.map(function(x, i, a) {
		var fullParticpant = allParticipants.find(function(y, j, ar) {
			return x == y['id'];
		});

		return {
			name:    fullParticpant['name'],
			fbid:    fullParticpant['id'].slice(5),
			profile: fullParticpant['href'],
			image:   fullParticpant['image_src']
		}
	});

	var thread = {
		name:  getConversationName(fullThread, participants),
		id:    fullThread['thread_fbid'],
		image: fullThread['image_src'] || participants[0]['image']
	};

	if (participants.length > 1) { participants.pop(); }
	return {
		thread:       thread,
		participants: participants
	};
};
