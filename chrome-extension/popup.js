var META  = {};

var DEFAULT_STATE = {
	encryption: false,
	signing:    false
};
var STATE = Object.assign({}, DEFAULT_STATE);

function setButtonState(b, active) {
	if (active === undefined) {
		active = b.classList.contains("buttonOn");
	}

	if (active) {
		b.classList.remove("buttonOn");
		b.classList.add("buttonOff");
	}
	else {
		b.classList.remove("buttonOff");
		b.classList.add("buttonOn");
	}
};

function buttonPress(e) {
	if (!(e && e.target && e.target.id)) {
		return;
	}
	var index = e.target.id.indexOf("-button");
	if (index < 0) {
		return;
	};

	var button = e.target;
	var action = button.id.slice(0, index);

	switch(action) {
		case "encrypt":
			STATE.encryption = !STATE.encryption;
			break;
		case "sign":
			STATE.signing = !STATE.signing;
			break;
	}

	setButtonState(button);

	// save state
	chrome.storage.local.get("conversations", function(oldState) {

		var convoKey              = META['convoKey'];
		var newConversationsState = oldState['conversations'] || {};

		// to be honest this is pretty grim
		if (JSON.stringify(STATE) == JSON.stringify(DEFAULT_STATE)) {
			delete newConversationsState[convoKey];
		}
		else {
			newConversationsState[convoKey] = STATE;
		}

		chrome.storage.local.set({conversations: newConversationsState});

		// send to server too
		var http = new XMLHttpRequest();
		http.open("POST", "https://localhost:50456/settings" , true);
		http.setRequestHeader("Content-Type", "application/json");
		http.send(JSON.stringify(newConversationsState));
	});

};

function updateState() {
	chrome.storage.local.get("conversations", function(state) {
		var convoKey  = META['convoKey'];
		var convoName = META['convoName'];

		// update state from local storage
		var allConversationsState = state['conversations'] || {};
		var conversationState     = allConversationsState[convoKey] || {};
		Object.assign(STATE, conversationState);

		// update popup fields
		var header    = document.getElementById("conversation");
		var encButton = document.getElementById("encrypt-button");
		var sigButton = document.getElementById("sign-button");

		header.innerText = convoName;
		setButtonState(encButton, STATE['encryption']);
		setButtonState(sigButton, STATE['signing']);
	});
};

function initPopup() {
	var buttons = document.getElementsByTagName("input");
	for (var i = 0; i < buttons.length; i++) {
		var b = buttons[i];
		b.classList.add("button");
		b.addEventListener("click", buttonPress);
	};
};

document.addEventListener('DOMContentLoaded', function() {
	initPopup();

	chrome.runtime.sendMessage({action: "get_state"}, function(resp) {
		if (!resp) { return; }

		var thread       = resp['thread'];
		var participants = resp['participants'];

		META['convoName'] = thread['name'];
		META['convoKey']  = thread['id'];
		updateState();

		// remove loading overlay to reveal the jewels
		var cover = document.getElementById("page-cover");
		cover.remove();
	});

});
