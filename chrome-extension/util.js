function flattenJSON(json) {
	return [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
}

function transmit(method, path, msg, responseCallback) {

	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/" + path;

	http.open(method, url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == XMLHttpRequest.DONE && responseCallback) {
			if (http.status == 200) {
				var resp = JSON.parse(http.responseText);
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

