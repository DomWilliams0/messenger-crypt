function waitForMessageBox(callback) {
	_waitForElement("js_1", callback);
}

// callback(single message {message: ..., isMe: boolean, element})
function findMessagesInNode(node, callback) {
	var msgs = node.querySelectorAll("._3oh-._58nk");
	for (var i = 0; i < msgs.length; i++) {
		var m = msgs[i];
		var isMe = m.parentNode.parentNode.classList.contains("_43by");
		var content = m.innerText;

		var message = {
			message: content,
			isMe: isMe,
			element: m
		};

		callback(message);
	}
}

function findMessages(callback) {
	waitForMessageBox(function(msgBox) { findMessagesInNode(msgBox, callback); });
}

// see findMessages
function watchForNewMessages(callback) {
	waitForMessageBox(function(msgBox) {

		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(m) {
				if (m.addedNodes.length == 0)
					return;

				m.addedNodes.forEach(function(n) { findMessagesInNode(n, callback); });
			});
		});

		var conf = {
			childList: true,
			subtree: true
		};

		observer.observe(msgBox, conf);
	});

}

function _waitForElement(id, callback) {
	function check() { return document.getElementById(id); }

	// already exists
	var checkBefore = check();
	if (checkBefore) {
		callback(checkBefore);
		return;
	}

	var observer = new MutationObserver(function(mutations) {
		var result = check();
		if (result) {
			this.disconnect();
			callback(result);
		}
	});

	observer.observe(document, { childList: true, subtree: true });
}


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

	// pop self from end of participants list
	if (participants.length > 1) { participants.pop(); }

	return {
		thread:       thread,
		participants: participants
	};
};
