function flattenJSON(json) {
	return [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
}

function transmit(method, path, msg, responseCallback) {

	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/" + path;

	if (msg && method == "GET") {
		url += "?" + flattenJSON(msg);
	}

	http.open(method, url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == XMLHttpRequest.DONE && responseCallback) {
			if (http.status == 200) {
				var resp = http.responseText ? JSON.parse(http.responseText) : null;
				responseCallback(resp);
			}
			else {
				var resp = {
					net_error: "Failed to connect to " + url
				};
				responseCallback(resp);
			}
		}
	};

	http.send(JSON.stringify(msg));
};

BADGE_NORMAL = "#5289f5"
BADGE_ERROR  = "#f92b2b"

function setBadgeState(msg, colour) {
	chrome.browserAction.setBadgeText({text: msg});
	chrome.browserAction.setBadgeBackgroundColor({color: colour});
}

function setBadgeText(msg) {
	setBadgeState(msg, BADGE_NORMAL);
}

function setBadgeError() {
	setBadgeState("ERR", BADGE_ERROR);
}

function updateBadge(encrypt, signing) {
	var badge = "";
	if (encrypt === "true") { badge += "E"; }
	if (signing === "true") { badge += "S"; }

	setBadgeText(badge);
}

