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
}

function transmitForDecryption(msg) {
	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/decrypt";

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == 4 && http.status == 200) {
			var resp = http.responseText;
			var respJSON = JSON.parse(resp);
			onRecvDecryptedMessage(respJSON);
		}
	};

	console.log("Sending " + msg.id + " for decryption");

	delete msg.element;
	http.send(JSON.stringify(msg));
};

function transmitForEncryption(msg, responseCallback) {
	var http = new XMLHttpRequest();
	var url  = "https://localhost:50456/encrypt";

	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json");
	http.onreadystatechange = function() {
		if (http.readyState == 4 && http.status == 200) {
			var resp = JSON.parse(http.responseText);
			responseCallback(resp);
		}
	};

	http.send(JSON.stringify(msg));
};
