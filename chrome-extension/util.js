function flattenJSON(json) {
	return [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
}

function transmit(method, path, msg, responseCallback, errorCallback) {

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
				setBadgeError();
				if (errorCallback) { errorCallback(); }
			}
		}
	};
	http.onerror = errorCallback;

	http.send(JSON.stringify(msg));
};

function setBadgeState(msg, colour) {
	if (chrome && chrome.browserAction) {
		chrome.browserAction.setBadgeText({text: msg});
		chrome.browserAction.setBadgeBackgroundColor({color: colour});
	}
};

function setBadgeText(msg) {
	setBadgeState(msg, "#5289f5");
};

function setBadgeError() {
	setBadgeState("ERR", "#f92b2b");
};

function updateBadge(encrypt, signing) {
	var badge = "";
	if (encrypt === "true" || encrypt == true) { badge += "E"; }
	if (signing === "true" || signing == true) { badge += "S"; }
	setBadgeText(badge);
};

