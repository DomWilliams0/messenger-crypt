// modify Content-Security-Policy to allow requests to local server
chrome.webRequest.onHeadersReceived.addListener(function(details) {
	for(var i = 0; i < details.responseHeaders.length; ++i) {
		var header = details.responseHeaders[i];

		if(header.name.toLowerCase() == "content-security-policy") {
			header.value = header.value.replace("connect-src", "connect-src https://localhost:*");
			break;
		}
	}

	return { responseHeaders: details.responseHeaders };

}, {urls: ["https://*.messenger.com/*"]}, ["blocking", "responseHeaders"]);

var STATE_CONVO  = null;
chrome.runtime.onMessage.addListener(
	function(req, sender, callback) {
		var action = req['action'];

		if (action == "set_state") {
			var global = req['data']['global'];
			var convo  = req['data']['convo'];

			// stored here to send to popup when opened
			STATE_CONVO = getConversationState(global, convo);

			// stored on server for XMLHttpRequest to request during send()
			transmit("POST", "state", STATE_CONVO);
		}

		else if (action == "get_state") {
			callback(STATE_CONVO);
		}
	}
);
