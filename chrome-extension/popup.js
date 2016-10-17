var META        = {};

var HEADER      = null;
var FBID        = null;
var BUTTON_ENC  = null;
var BUTTON_SIG  = null;

var CURRENT_TAB = null;

function onTabClick(e) {
	var newTab = e.target;
	var oldTab = CURRENT_TAB || newTab;

	oldTab.classList.remove("tab-active");
	newTab.classList.add("tab-active");

	var newTabContent = document.getElementById(newTab.innerText.toLowerCase() + "-tab");
	var oldTabContent = document.getElementById(oldTab.innerText.toLowerCase() + "-tab");
	oldTabContent.style.display = "none";
	newTabContent.style.display = "block";

	CURRENT_TAB = newTab;
};

function isButtonPressed(b) {
	return b.classList.contains("buttonEnabled");
}

function setButtonState(b, newState) {
	if (newState === undefined) {
		newState = !isButtonPressed(b);
	}

	if (!newState) {
		b.classList.remove("buttonEnabled");
		b.classList.add("buttonDisabled");
		b.value = "Don't " + b.value;
	}
	else {
		b.classList.remove("buttonDisabled");
		b.classList.add("buttonEnabled");
		b.value = b.value.replace("Don't ", "")
	}
};

function buttonPress(e) {
	setButtonState(e.target);
	updateState();
};

function updateState() {
	var newSettings = {
		id:         META['convoKey'],
		encryption: isButtonPressed(BUTTON_ENC),
		signing:    isButtonPressed(BUTTON_SIG),
	};

	transmit("POST", "settings", newSettings);
	updateBadge(newSettings['encryption'], newSettings['signing']);
};

function clearPopup() {
	HEADER.innerText = "N/A";
	FBID.innerText = "fbid:N/A";
	setButtonState(BUTTON_ENC, false);
	setButtonState(BUTTON_SIG, false);
};

function receiveState() {
	function createParticipantEntry(participant) {
		return "" +
			"<div class=\"participant-deets\">" +
				"<div class=\"participant\">" +
					"<img class=\"participant-photo\" src=\"" + participant['image'] + "\" />" +
					"<span class=\"participant-name\">" + participant['name'] + "</span>" +
				"</div>" +
			"</div>" +
			"<span class=\"participant-key\">" +
				"<input type=\"text\" name=\"key-" + participant['fbid'] + "\">" +
			"</span>";
	};

	var convoKey  = META['convoKey'];

	transmit("GET", "settings", {id: convoKey}, function(settings) {
		var encrypt = settings['encryption'] === "true";
		var signing = settings['signing']    === "true";

		HEADER.innerText = META['convoName'];
		FBID.innerText = "fbid:" + META['convoKey'];
		setButtonState(BUTTON_ENC, encrypt);
		setButtonState(BUTTON_SIG, signing);

		updateBadge(encrypt, signing);
	}, clearPopup);

	transmit("GET", "state", null, function(state) {
		var participants = state['participants'];

		if (participants.length > 1) {
			participants.pop();
		}

		var list = document.getElementById("participants-list");
		for (var i = 0; i < participants.length; i++) {
			var p = participants[i];
			var element = document.createElement("li");
			element.innerHTML = createParticipantEntry(p);
			list.appendChild(element);
		}


	});
};

function initPopup() {
	HEADER     = document.getElementById("conversation");
	FBID       = document.getElementById("fbid");
	BUTTON_ENC = document.getElementById("encrypt-button");
	BUTTON_SIG = document.getElementById("sign-button");

	var buttons = [BUTTON_ENC, BUTTON_SIG];
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].classList.add("button", "buttonOff");
		buttons[i].addEventListener("click", buttonPress);
	};

	var tabs = document.getElementsByClassName("tab");
	for (var i = 0; i < tabs.length; i++) {
		tabs[i].addEventListener("click", onTabClick);
	};

	// show first tab
	onTabClick({target: tabs[0]});
};

document.addEventListener('DOMContentLoaded', function() {
	initPopup();

	chrome.runtime.sendMessage({action: "get_state"}, function(resp) {
		if (!resp) { return; }

		var thread       = resp['thread'];
		var participants = resp['participants'];

		META['convoName'] = thread['name'];
		META['convoKey']  = thread['id'];
		receiveState();

		// remove loading overlay to reveal the jewels
		var cover = document.getElementById("page-cover");
		cover.remove();
	});

});
