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

