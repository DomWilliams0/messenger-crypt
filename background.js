// modify Content-Security-Policy to allow requests to local server
chrome.webRequest.onHeadersReceived.addListener(function(details){
	for(var i = 0; i < details.responseHeaders.length; ++i) {
		var header = details.responseHeaders[i];

		if(header.name.toLowerCase() == "content-security-policy") {
			header.value = header.value.replace("connect-src", "connect-src https://localhost");
		}
	}

	return {responseHeaders:details.responseHeaders};
}, {urls: ["https://*.messenger.com/*"]}, ["blocking", "responseHeaders"]);

