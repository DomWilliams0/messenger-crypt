var META       = {};

var HEADER     = null;
var BUTTON_ENC = null;
var BUTTON_SIG = null;

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
}

function receiveState() {
	var convoKey  = META['convoKey'];

	transmit("GET", "settings", {id: convoKey}, function(settings) {
		// TODO net_error? possibly handle in transmit() instead
		HEADER.innerText = META['convoName'];
		setButtonState(BUTTON_ENC, settings['encryption'] === "true");
		setButtonState(BUTTON_SIG, settings['signing'] === "true");
	});
};

function initPopup() {
	HEADER     = document.getElementById("conversation");
	BUTTON_ENC = document.getElementById("encrypt-button");
	BUTTON_SIG = document.getElementById("sign-button");

	var buttons = [BUTTON_ENC, BUTTON_SIG];
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].classList.add("button", "buttonOff");
		buttons[i].addEventListener("click", buttonPress);
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
		receiveState();

		// remove loading overlay to reveal the jewels
		var cover = document.getElementById("page-cover");
		cover.remove();
	});

});
