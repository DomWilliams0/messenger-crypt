var conversationID, conversationName;

var header, fbid, encButton, sigButton;
var currentTab;

var unlinkState = false;
var hotkeyAcc = [];

// callback({{fbid0: key, ...}})
function fetchKeys(fbids, callback) {
	chrome.runtime.sendMessage({
		what: "contacts",
		content: {
			get: true,
			fbids: fbids
		}
	}, callback);
}

// callback({error, key, name, email})
function updateKey(fbid, newKey, isSecret, callback) {
	chrome.runtime.sendMessage({
		what: "contacts",
		content: {
			get: false,
			fbid: fbid,
			key: newKey,
			secret: isSecret
		}
	}, callback);
}

// callback([{type, value, data, description} ...])
function fetchSettings(callback) {
	chrome.runtime.sendMessage({
		what: "settings",
		content: {
			get: true,
		}
	}, callback);
}

function updateSetting(key, value) {
	chrome.runtime.sendMessage({
		what: "settings",
		content: {
			get: false,
			key: key,
			value: value
		}
	});
}

// callback({encryption, signing})
function fetchConversationSettings(id, callback) {
	chrome.runtime.sendMessage({
		what: "conversation",
		content: {
			get: true,
			id: id
		}
	}, callback);
}

function updateConversationSettings(id, enc, sig) {
	chrome.runtime.sendMessage({
		what: "conversation",
		content: {
			get: false,
			id: id,
			state: {
				encryption: enc,
				signing: sig
			}
		}
	});
}

// callback({thread, participants})
function fetchState(callback) {

	// if (invalid) {
	// 	setBadgeError();
	// 	errorConversationTooOld();
	// }

}

function setBadgeState(msg, colour) {
	chrome.browserAction.setBadgeText({text: msg});
	chrome.browserAction.setBadgeBackgroundColor({color: colour});
}

function setBadgeText(msg) {
	setBadgeState(msg, "#5289f5");
}

function setBadgeError() {
	setBadgeState("ERR", "#f92b2b");
}

function updateBadge(encrypt, signing) {
	var badge = "";
	if (encrypt === "true" || encrypt == true) { badge += "E"; }
	if (signing === "true" || signing == true) { badge += "S"; }
	setBadgeText(badge);
}

function errorConversationTooOld() {
	// TODO alert
	console.error("Could not fetch conversation state. This may be because this conversation is too old and does not appear in your top ~20 conversations. To fix this, send a normal message to bump it into your recent conversations, and refresh the page.");
}

function onTabClick(e) {
	var newTab = e.target;
	var oldTab = currentTab || newTab;

	oldTab.classList.remove("tab-active");
	newTab.classList.add("tab-active");

	var newTabContent = document.getElementById(newTab.innerText.toLowerCase() + "-tab");
	var oldTabContent = document.getElementById(oldTab.innerText.toLowerCase() + "-tab");
	oldTabContent.style.display = "none";
	newTabContent.style.display = "block";

	currentTab = newTab;

	document.body.onkeyup = newTabContent.keyListener || null;
}

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
	}
	else {
		b.classList.remove("buttonDisabled");
		b.classList.add("buttonEnabled");
	}
}

function buttonPress(e) {
	setButtonState(e.target);
	updateState();
}

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
}

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
}

function initialiseKeyInputField(keyInput, participant, secretKey) {
	var inputCallback = function(e) { onKeyInputChange(e.target, e.type == "focus", secretKey); }
	keyInput.onfocus = inputCallback;
	keyInput.onblur = inputCallback;
	keyInput.onkeyup = onKeyInputKeyPress;
	keyInput.participant = participant;

	resetKeyTextbox(keyInput);
}

function onKeyInputChange(element, isFocused, isSecretKey) {
	unlinkState = false;

	var fbid = element.participant.fbid;

	if (isFocused) {
		fetchKeys([fbid], function(resp) {
			// blank box for entry
			element.value = "";
			element.placeholder = "Enter key identifier";

			// overwrite styles while editing
			element.classList.add("key-editing");
			element.classList.remove("key-invalid", "key-success")

			var key = resp.keys[fbid] || {}
			var inputState = {
				currentKey: key.key,
				currentTooltip: element.title
			}
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

			// validate
			element.value = "Updating...";
			element.classList.add("key-updating");

			updateKey(fbid, input, isSecretKey, function(resp) {
				var err = response.error;
				var key = response.key;

				// update element appropriately
				resetKeyTextbox(element, err ? null : response.user_id, response.user || err, true);
				element.classList.add(err ? "key-invalid" : "key-success");
				if (err)
					element.value = err;
			});
		}
		// no change
		else {
			resetKeyTextbox(element, inputState.currentKey, inputState.currentTooltip);
		}
	}
}

function onKeyInputKeyPress(e) {
	var key = e.keyCode || e.which;

	// enter
	if (key == 13) {
		e.target.blur();
	}

	// backspace
	if (key == 8 && e.target.hasKey) {
		// show confirmation
		if (!unlinkState) {
			unlinkState = true;
			e.target.placeholder = "Press again to unlink key";
		}

		// confirmed
		else {
			updateKey(e.target.participant.fbid, false, null);

			e.target.removeAttribute("placeholder");
			e.target.blur();
			resetKeyTextbox(e.target);
		}
	}
}

function onParticipantsKeyPress(e) {
	var key = e.keyCode || e.which;

	// enter: submit
	if (key == 13) {
		var chosenIndex = hotkeyAcc.join("");
		var participant = document.getElementById("participant-" + chosenIndex);
		if (participant) {
			participant.getElementsByTagName("input")[0].focus();
		}

		hotkeyAcc = [];
	}

	// backspace
	else if (key == 8) {
		hotkeyAcc.pop();
	}

	// number
	else if ((key >= 48 && key <= 57) || (key >= 96 && key <= 105)) {
		hotkeyAcc.push(e.key);
	}
}

function onSettingCheckboxChange(e) {
	var checkbox = e.target;
	updateSetting(checkbox.value, checkbox.checked)
}

function updateState() {
	var enc = isButtonPressed(encButton);
	var sig = isButtonPressed(sigButton);

	updateConversationSettings(conversationID, enc, sig)
	updateBadge(enc, sig);
	updateStatus(enc, sig);
}

function clearPopup() {
	header.innerText = "N/A";
	fbid.innerText = "fbid:N/A";
	setButtonState(encButton, false);
	setButtonState(sigButton, false);
}

function populatePopup() {
	function createParticipantEntry(participant, index) {
		return "" +
			"<div class=\"participant-deets\">" +
				"<div class=\"participant\">" +
					"<div class=\"participant-index\">" +
						"<h5>" + index + "</h5>" +
					"</div>" +
					"<img class=\"participant-photo\" src=\"" + participant.image + "\" />" +
					"<div>" +
						"<span>" + participant.name + "</span>" +
						"<h5 class=\"participant-fbid\">" + participant.fbid + "</h5>" +
					"</div>" +
				"</div>" +
			"</div>" +
			"<span class=\"participant-key\">" +
				"<input type=\"text\" id=\"key-" + participant.fbid + "\" class=\"key-missing\">" +
			"</span>";
	}

	function createSettingEntry(setting, type) {
		var isText = type == InputType.TEXT || type == InputType.KEY;
		var isKey  = type == InputType.KEY;

		return "" +
			"<div class=\"setting-deets" + (isText ? " setting-deets-textbox" : "") + "\">" +
				"<span>" + setting.title + "</span>" +
				"<br/>" +
				"<span class=\"setting-desc\">" + setting.description + "</span>" +
			"</div>" +
			(isText ?
			"<span class=\"" + (isKey ? "participant-key settings-key" : "") + "\">" +
				"<input type=\"text\">" +
			"</span>"
				:
			"<span class=\"setting-checkbox\">" +
				"<input type=\"checkbox\" value=\"" + setting.key + "\">" +
			"</span>");
	}

	fetchConversationSettings(conversationID, function(settings) {
		var encrypt = Boolean(settings.encryption);
		var signing = Boolean(settings.signing);

		header.innerText = conversationName;
		fbid.innerText = "fbid:" + conversationID;
		setButtonState(encButton, encrypt);
		setButtonState(sigButton, signing);

		updateBadge(encrypt, signing);
		updateStatus(encrypt, signing);
	}, clearPopup);

	fetchState(function(state) {
		var participants = state.participants;

		// remove self from end
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

		// fetch key for each participant
		fetchKeys(participants.map(function(p) { return p.fbid; }), function(resp) {
			var keys = resp.keys;
			Object.keys(keys).forEach(function(fbid) {
				var key = keys[fbid] || {}
				var textbox = document.getElementById("key-" + fbid);
				resetKeyTextbox(textbox, key.key, key.str);
			});
		});

	});

	// settings tab
	fetchSettings(function(settings) {
		var settingsList = document.getElementById("settings-list");
		settings.forEach(function(x) {
			var element = document.createElement("li");

			var type = InputType[x.type];
			if (!type) {
				console.error("Invalid setting type '" + x.type + "'");
				return;
			}

			element.innerHTML = createSettingEntry(x, type);
			element.title = x.description;

			var inputField = element.getElementsByTagName("input")[0];
			if (type == InputType.KEY) {
				var dummyFbid = x.data.dummy_id;
				initialiseKeyInputField(inputField, dummyFbid, true);

				fetchKeys([dummyFbid], function(resp) {
					var value = resp.keys[dummyFbid] || {}
					resetKeyTextbox(inputField, value.key, value.str);
				});
			}

			else if (type == InputType.BOOL) {
				inputField.checked = x.value;
				inputField.onchange = onSettingCheckboxChange;
			}

			settingsList.appendChild(element);
		});
	});
}

function initPopup() {
	header = document.getElementById("conversation");
	fbid = document.getElementById("fbid");
	encButton = document.getElementById("encrypt-button");
	sigButton = document.getElementById("sign-button");

	var buttons = [encButton, sigButton];
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].classList.add("button");
		buttons[i].addEventListener("click", buttonPress);
	}

	var tabs = document.getElementsByClassName("tab");
	for (var i = 0; i < tabs.length; i++) {
		tabs[i].addEventListener("click", onTabClick);
	}

	// tab keyboard listeners
	document.getElementById("participants-tab").keyListener = onParticipantsKeyPress;

	// show first tab
	onTabClick({target: tabs[0]});
}

document.addEventListener('DOMContentLoaded', function() {
	initPopup();

	fetchState(function(state) {
		conversationName = state.thread.name;
		conversationID = state.thread.id;
		populatePopup();
	});
});
