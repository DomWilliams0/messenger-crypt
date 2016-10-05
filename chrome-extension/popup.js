function updateButton(b) {
	var encrypting = b.id.startsWith("encrypt");

	if (b.classList.contains("buttonOff")) {
		b.classList.remove("buttonOff");
		b.classList.add("buttonOn");
	}
	else {
		b.classList.remove("buttonOn");
		b.classList.add("buttonOff");
	}

	console.log(b);
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

	// toggle button
	updateButton(button, action == "encrypt");
};

function initPopup() {
	var buttons = document.getElementsByTagName("input");
	for (var i = 0; i < buttons.length; i++) {
		var b = buttons[i];
		b.classList.add("button");
		updateButton(b);
		b.addEventListener("click", buttonPress);
	};
};

document.addEventListener('DOMContentLoaded', function() {
	initPopup();

	chrome.runtime.sendMessage({action: "get_state"}, function(resp) {
		// update fields
		// TODO get conversation state, not global
		// TODO read encryption/signing toggles from config for this convo too

		// TODO remove loading overlay to reveal the jewels
	});
});
