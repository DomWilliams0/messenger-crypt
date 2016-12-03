var META         = {};

var HEADER       = null;
var FBID         = null;
var BUTTON_ENC   = null;
var BUTTON_SIG   = null;

var CURRENT_TAB  = null;

var UNLINK_STATE = false;
var HOTKEY_ACCUM = [];

var InputType  = Object.freeze({
	TEXT: 1,
	KEY : 2,
	BOOL: 3
});

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
	}
	else {
		b.classList.remove("buttonDisabled");
		b.classList.add("buttonEnabled");
	}
};

function buttonPress(e) {
	setButtonState(e.target);
	updateState();
};

function updateStatus(encrypting, signing) {
	var msg = "Messages will be ";
	if (encrypting == signing) {
		var prefix = encrypting ? "" : "un";
		msg += prefix + "encrypted and " + prefix + "signed";
	}

	else {
		msg += (encrypting ? "encrypted" : "signed");
	}

	document.getElementById("button-status").innerText = msg;
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

function initialiseKeyInputField(keyInput, participant, secretKey) {
	var inputCallback = function(e) { onKeyInputChange(e.target, e.type == "focus", secretKey); };
	keyInput.onfocus = inputCallback;
	keyInput.onblur = inputCallback;
	keyInput.onkeyup = onKeyInputKeyPress;
	keyInput.participant = participant;

	resetKeyTextbox(keyInput);
};

function onKeyInputChange(element, isFocused, isSecretKey) {
	UNLINK_STATE = false;

	var participant = element.participant;

	if (isFocused) {
		transmit("GET", "keys", {id: participant['fbid']}, function(resp) {
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
				identifier: input,
				secret: isSecretKey
			};
			transmit("POST", "keys", data, function(response) {
				var err = response['error'];
				var key = response['key'];

				// update element appropriately
				resetKeyTextbox(element, err ? null : response['user_id'], response['user'] || err, true);
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
	var key = e.keyCode || e.which;

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

function onSettingCheckboxChange(e) {
	var checkbox = e.target;

	var req = {
		key: checkbox.value,
		value: checkbox.checked
	};

	transmit("POST", "settings", req);
};

function updateState() {
	var enc = isButtonPressed(BUTTON_ENC);
	var sig = isButtonPressed(BUTTON_SIG);

	var newSettings = {
		id:         META['convoKey'],
		encryption: enc,
		signing:    sig
	};

	transmit("POST", "convosettings", newSettings);
	updateBadge(enc, sig);
	updateStatus(enc, sig);
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

	function createSettingEntry(setting, type) {
		var isText = type == InputType.TEXT || type == InputType.KEY;
		var isKey  = type == InputType.KEY;

		return "" +
			"<div class=\"setting-deets" + (isText ? " setting-deets-textbox" : "") + "\">" +
				"<span>" + setting['title'] + "</span>" +
				"<br/>" +
				"<span class=\"setting-desc\">" + setting['description'] + "</span>" +
			"</div>" +
			(isText ?
			"<span class=\"" + (isKey ? "participant-key settings-key" : "") + "\">" +
				"<input type=\"text\">" +
			"</span>"
				:
			"<span class=\"setting-checkbox\">" +
				"<input type=\"checkbox\" value=\"" + setting['key'] + "\">" +
			"</span>");
	};

	var convoKey  = META['convoKey'];

	transmit("GET", "convosettings", {id: convoKey}, function(settings) {
		var encrypt = Boolean(settings['encryption']);
		var signing = Boolean(settings['signing']);

		HEADER.innerText = META['convoName'];
		FBID.innerText = "fbid:" + META['convoKey'];
		setButtonState(BUTTON_ENC, encrypt);
		setButtonState(BUTTON_SIG, signing);

		updateBadge(encrypt, signing);
		updateStatus(encrypt, signing);
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
			initialiseKeyInputField(keyInput, p);
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

			debugger;
			var type = InputType[x['type']];
			if (!type) {
				console.error("Invalid setting type '" + x['type'] + "'");
				return;
			}

			element.innerHTML = createSettingEntry(x, type);
			element.title = x['description'];

			var inputField = element.getElementsByTagName("input")[0];
			if (type == InputType.KEY) {
				var dummyFbid = x['data']['key-id'];
				var dummy = {
					fbid: dummyFbid
				};
				initialiseKeyInputField(inputField, dummy, true);
				transmit("GET", "keys", {id: dummyFbid}, function(resp) {
					var value = resp['count'] == 1 ? resp['keys'][dummyFbid] : {};
					resetKeyTextbox(inputField, value['key'], value['str']);
				});
			}

			else if (type == InputType.BOOL) {
				inputField.checked = x['value'];
				inputField.onchange = onSettingCheckboxChange;
			}

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
		buttons[i].classList.add("button");
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
