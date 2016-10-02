function transmitForDecryption(msg) {
	function onRecvDecryptedMessage(msg) {
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

	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/decrypt";

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == XMLHttpRequest.DONE && http.status == 200) {
			var resp = http.responseText;
			var respJSON = JSON.parse(resp);
			onRecvDecryptedMessage(respJSON);
		}
	};

	console.log("Sending " + msg.id + " for decryption");

	delete msg.element;
	http.send(JSON.stringify(msg));
};

function transmitForEncryption(msg, origRequestContext) {

	function onRecvEncryptedMessage(response, origRequestContext) {
		var sendFunc = origRequestContext['origSend'];
		var request  = origRequestContext['request'];
		var json     = origRequestContext['formDataJson'];
		var sendArgs = null;

		// handle error
		if (response['error']) {
			// TODO show error
			console.error(response['error']);
			sendArgs = null; // block request
		}
		else {
			// update messenger request with encrypted message
			json['body'] = response['message'];
			sendArgs = [Object.keys(json).map(k => k + '=' + json[k]).join('&')];
		}

		sendFunc.apply(request, sendArgs);
	};

	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/encrypt";

	console.log("Sending message for encryption");

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == XMLHttpRequest.DONE && http.status == 200) {
			var resp = JSON.parse(http.responseText);
			onRecvEncryptedMessage(resp, origRequestContext);
		}
	};

	http.send(JSON.stringify(msg));
};
