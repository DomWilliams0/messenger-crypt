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

		var success = !msg['error'];

		// create temporarily incredibly ugly status header
		var statusElement = "<div>";

		// decryption status
		statusElement += "<b>";
		if (!success) {
			statusElement += msg['error'];
		}
		else {
			var msgDesc = msg['decrypted'] ? "Decrypted message" : "Verified message";

			// signing
			var signer = msg['signed_by'];
			if (signer) {

				// well signed
				if(msg['valid_sig']) {
					statusElement += msgDesc + " with good signature from " + signer;
				}

				// badly signed
				else {
					statusElement += msgDesc + " with BAD signature from " + signer;
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

	delete msg.element;
	transmit("POST", "decrypt", msg, onRecvDecryptedMessage);
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

	transmit("POST", "encrypt", msg,
		function(resp) {
			onRecvEncryptedMessage(resp, origRequestContext);
		}
	);
};
