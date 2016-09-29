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

// intercept sent messages to encrypt
chrome.webRequest.onBeforeRequest.addListener(function(details) {
	var response = {};

	if (details.method == "POST") {
		// TODO messenger tries 3 times
		response.redirectUrl = "https://localhost:50456/encrypt";
	}

	return response;

}, {urls: ["https://*.messenger.com/messaging/send/*"]}, ["blocking", "requestBody"]);

