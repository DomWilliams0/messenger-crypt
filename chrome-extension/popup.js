var META         = {};

var HEADER       = null;
var FBID         = null;
var BUTTON_ENC   = null;
var BUTTON_SIG   = null;

var CURRENT_TAB  = null;

var UNLINK_STATE = false;
var HOTKEY_ACCUM = [];

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

	document.body.onkeyup = newTabContent.keyListener || null;
};

function isButtonPressed(b) {
	return b.classList.contains("buttonEnabled");
};

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

function resetKeyTextbox(textbox, value, tooltip, dontShorten) {
	textbox.classList.remove("key-updating");

	if (value) {
		textbox.value = dontShorten ? value : value.slice(-8);
		textbox.classList.remove("key-invalid", "key-success", "key-missing");
	}
	else {
		textbox.value = "No key";
		textbox.classList.remove("key-invalid", "key-success");
		textbox.classList.add("key-missing");
	}

	textbox.hasKey = Boolean(value);

	if (tooltip) {
		textbox.title = tooltip;
	}
	else {
		textbox.removeAttribute("title");
	}
};

function onKeyInputChange(element, isFocused) {
	UNLINK_STATE = false;

	var participant = element.participant;

	if (isFocused) {
		transmit("GET", "keys?id=" + participant['fbid'], null, function(resp) {
			var hasKey = resp.count != 0;

			// blank box for entry
			element.value = "";
			element.placeholder = "Enter key identifier";

			// overwrite styles while editing
			element.classList.add("key-editing");
			element.classList.remove("key-invalid", "key-success")

			var inputState = {
				currentKey:     hasKey ? resp['keys'][participant['fbid']]['key'] : undefined,
				currentTooltip: element.title
			};
			element.inputState = inputState;
		});
	}

	else {
		var inputState = element.inputState;
		delete element.inputState;
		element.classList.remove("key-editing");

		// key entered
		var input = element.value;
		if (input) {

			// send to server for validation
			element.value = "Updating...";
			element.classList.add("key-updating");

			var data = {
				fbid:       participant['fbid'],
				identifier: input
			};
			transmit("POST", "keys", data, function(response) {
				var err = response['error'];
				var key = response['key'];

				// update element appropriately
				resetKeyTextbox(element, err ? null : response['user_id'], response['user'], true);
				element.classList.add(err ? "key-invalid" : "key-success");
				if (err)
					element.value = err;

				// if (key) {
				// 	alert("Linked " + participant['name'] + " to key " + response['user']);
				// }
			});
		}
		// no change
		else {
			resetKeyTextbox(element, inputState['currentKey'], inputState['currentTooltip']);
		}
	}
};

function onKeyInputKeyPress(e) {
	var key = e.key;

	// enter
	if (key == 13) {
		e.target.blur();
	}

	// backspace
	if (key == 8 && e.target.hasKey) {
		// show confirmation
		if (!UNLINK_STATE) {
			UNLINK_STATE = true;
			e.target.placeholder = "Press again to unlink key";
		}

		// confirmed
		else {
			var unlink = {
				fbid: e.target.participant['fbid'],
				identifier: null
			};
			transmit("POST", "keys", unlink);

			e.target.removeAttribute("placeholder");
			e.target.blur();
			resetKeyTextbox(e.target);
		}

	}

};

function onParticipantsKeyPress(e) {
	var key = e.keyCode || e.which;

	// enter: submit
	if (key == 13) {
		var chosenIndex = HOTKEY_ACCUM.join("");
		var participant = document.getElementById("participant-" + chosenIndex);
		if (participant) {
			participant.getElementsByTagName("input")[0].focus();
		}

		HOTKEY_ACCUM = [];
	}

	// backspace
	else if (key == 8) {
		HOTKEY_ACCUM.pop();
	}

	// number
	else if ((key >= 48 && key <= 57) || (key >= 96 && key <= 105)) {
		HOTKEY_ACCUM.push(e.key);
	}
};

function updateState() {
	var newSettings = {
		id:         META['convoKey'],
		encryption: isButtonPressed(BUTTON_ENC),
		signing:    isButtonPressed(BUTTON_SIG),
	};

	transmit("POST", "convosettings", newSettings);
	updateBadge(newSettings['encryption'], newSettings['signing']);
};

function clearPopup() {
	HEADER.innerText = "N/A";
	FBID.innerText = "fbid:N/A";
	setButtonState(BUTTON_ENC, false);
	setButtonState(BUTTON_SIG, false);
};

function receiveState() {
	function createParticipantEntry(participant, index) {
		return "" +
			"<div class=\"participant-deets\">" +
				"<div class=\"participant\">" +
					"<div class=\"participant-index\">" +
						"<h5>" + index + "</h5>" +
					"</div>" +
					"<img class=\"participant-photo\" src=\"" + participant['image'] + "\" />" +
					"<div>" +
						"<span>" + participant['name'] + "</span>" +
						"<h5 class=\"participant-fbid\">" + participant['fbid'] + "</h5>" +
					"</div>" +
				"</div>" +
			"</div>" +
			"<span class=\"participant-key\">" +
				"<input type=\"text\" id=\"key-" + participant['fbid'] + "\" class=\"key-missing\">" +
			"</span>";
	};

	function createSettingEntry(setting) {
		return "" +
			"<div class=\"setting-deets\">" +
				"<span>" + setting['title'] + "</span>" +
				"<br/>" +
				"<span class=\"setting-desc\">" + setting['description'] + "</span>" +
			"</div>" +
			"<span class=\"setting-checkbox\">" +
				"<input type=\"checkbox\" value=\"" + setting['key'] + "\">" +
			"</span>";
	};

	var convoKey  = META['convoKey'];

	transmit("GET", "convosettings", {id: convoKey}, function(settings) {
		var encrypt = settings['encryption'] === "true";
		var signing = settings['signing']    === "true";

		HEADER.innerText = META['convoName'];
		FBID.innerText = "fbid:" + META['convoKey'];
		setButtonState(BUTTON_ENC, encrypt);
		setButtonState(BUTTON_SIG, signing);

		updateBadge(encrypt, signing);
	}, clearPopup);

	transmit("GET", "state", null, function(state) {
		if (!state) {
			errorStateMissing();
			return;
		}

		var participants = state['participants'];

		if (participants.length > 1) {
			participants.pop();
		}

		// add names to list
		var list = document.getElementById("participants-list");
		for (var i = 0; i < participants.length; i++) {
			var p = participants[i];
			var index = i + 1;
			var element = document.createElement("li");
			element.innerHTML = createParticipantEntry(p, index);
			element.id = "participant-" + index;
			list.appendChild(element);

			// add key input box listeners
			var keyInput = element.getElementsByTagName("input")[0];
			var inputCallback = function(e) { onKeyInputChange(e.target, e.type == "focus"); };
			keyInput.onfocus = inputCallback;
			keyInput.onblur = inputCallback;
			keyInput.onkeyup = onKeyInputKeyPress;
			keyInput.participant = p;

			resetKeyTextbox(keyInput);
		}

		// fetch key state
		var url = participants.reduce(function(acc, p) { return acc + "&id=" + p['fbid']; }, "keys?")
		transmit("GET", url, null, function(resp) {
			var keys = resp['keys'];
			Object.keys(keys).forEach(function(fbid) {
				var key = keys[fbid];
				var textbox = document.getElementById("key-" + fbid);
				resetKeyTextbox(textbox, key['key'], key['str']);
			});
		});

	});

	transmit("GET", "settings", null, function(settings) {
		if (!settings) { return; } // any network errors will be alerted by previous transmits

		var settingsList = document.getElementById("settings-list");
		settings.forEach(function(x) {
			var element = document.createElement("li");
			element.innerHTML = createSettingEntry(x);

			var checkbox = element.getElementsByTagName("input")[0];
			checkbox.checked = x['value'];
			element.title = x['description'];

			settingsList.appendChild(element);
		});
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

	// tab keyboard listeners
	document.getElementById("participants-tab").keyListener = onParticipantsKeyPress;

	// show first tab
	onTabClick({target: tabs[0]});
};

document.addEventListener('DOMContentLoaded', function() {
	initPopup();

	chrome.runtime.sendMessage({action: "get_state"}, function(resp) {
		if (!resp) {
			setBadgeError();
			alert("Could not fetch conversation state. This may be because this conversation is too old and does not appear in your top ~20 conversations. To fix this, send a normal message to bump it into your recent conversations, and refresh the page.");
			return;
		}

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
