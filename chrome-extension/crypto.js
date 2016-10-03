function transmit(path, msg, responseCallback, preSend) {

	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/" + path;

	console.log(url);

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == XMLHttpRequest.DONE) {
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

	if (preSend) {
		preSend(msg);
	}

	console.log("Posting to /" + path);
	http.send(JSON.stringify(msg));
};

function transmitForDecryption(msg) {
	function onRecvDecryptedMessage(msg) {
		var netError = msg['net_error'];

		// unrelated error
		if (netError) {
			console.error(netError);
			return;
		}

		// find message element
		var element = document.getElementById(formatElementID(msg['id']))

		// no longer visible, oh well
		if (!element) {
			return;
		}

		var success = msg['decrypted'] === true;

		// create temporarily incredibly ugly status header
		var statusElement = "<div>";

		// decryption status
		statusElement += "<b>";
		if (!success) {
			statusElement += msg['error'];
		}
		else {
			// signing
			var signer = msg['signed_by'];

			if (signer) {

				// well signed
				if( msg['valid_sig']) {
					statusElement += "Decrypted message with good signature from " + signer;
				}

				// badly signed
				else {
					statusElement += "Decrypted message with BAD signature from " + signer;
				}
			}

			// unsigned
			else {
				statusElement += "Decrypted unsigned message";
			}
		}
		statusElement += "</b></div>";

		// update message content
		element.innerHTML = statusElement + msg.message;
	};

	transmit("decrypt", msg, onRecvDecryptedMessage,
		function(msg) {
			delete msg.element;
		}
	);
};

function transmitForEncryption(msg, origRequestContext) {
	function onRecvEncryptedMessage(response, origRequestContext) {
		var sendFunc = origRequestContext['origSend'];
		var request  = origRequestContext['request'];
		var json     = origRequestContext['formDataJson'];
		var sendArgs = null;

		// handle error
		var err = response['net_error'] || response['error'];
		if (err) {
			// TODO show error
			console.error(err);
			sendArgs = null; // block request
		}
		else {
			// update messenger request with encrypted message
			json['body'] = response['message'];
			sendArgs = [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
		}

		sendFunc.apply(request, sendArgs);
	};

	transmit("encrypt", msg,
		function(resp) {
			onRecvEncryptedMessage(resp, origRequestContext);
		}
	);
};
