function buttonPress(e) {
	if (!(e && e.target && e.target.id)) {
		return;
	}
	var index = e.target.id.indexOf("-button");
	if (index < 0) {
		return;
	};

	// toggle button
	if (e.target.classList.contains("buttonOff")) {
		e.target.classList.remove("buttonOff");
		e.target.classList.add("buttonOn");
	}
	else {
		e.target.classList.remove("buttonOn");
		e.target.classList.add("buttonOff");
	}

	var action = e.target.id.slice(0, index);
	console.log(action);

};

function initPopup() {
	var buttons = document.getElementsByTagName("input");
	for (var i = 0; i < buttons.length; i++) {
		var b = buttons[i];
		b.classList.add("button", "buttonOff");
		b.addEventListener("click", buttonPress);
	};
};

document.addEventListener('DOMContentLoaded', function() {
	initPopup();
});
