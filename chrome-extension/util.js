var shownServerError = false;

function getSettingValues(keys, callback) {
	var url = keys.reduce(function(acc, s) { return acc + "&key=" + s; }, "settings?")
	transmit("GET", url, null, function(resp) {
		callback(resp.reduce(function(acc,x) {acc[x['key']] = x['value']; return acc; }, {}));
	});
};


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
				http.onerror();
			}
		}
	};
	http.onerror = function() {
		setBadgeError();
		errorServerDown();
		if (errorCallback) { errorCallback(); }
	};

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

function errorServerDown() {
	if (!shownServerError) {
		shownServerError = true;
		alert("Could not contact the local server at http://localhost:50456. Ensure that it is running and that its certificate is trusted by the browser.");
	}
}

function errorStateMissing() {
	alert("The server has no idea what is going on, please refresh the page to inform it of Messenger's state.");

}

function errorConversationTooOld() {
	alert("Could not fetch conversation state. This may be because this conversation is too old and does not appear in your top ~20 conversations. To fix this, send a normal message to bump it into your recent conversations, and refresh the page.");

}

function alertFileBlocked() {
	alert("File and image uploading are disabled in the settings, as their encryption is not yet supported. Disable this option at your own risk.");
}
