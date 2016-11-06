function transmitForDecryption(messages) {
	function onRecvDecryptedMessage(resp, settings) {
		var messages = resp['messages'];
		for (var i = 0; i < messages.length; i++) {
			var msg = messages[i];

			// find message element
			var element = document.getElementById(formatElementID(msg['id']))

			// no longer visible, oh well
			if (!element) {
				continue;
			}

			var success = !msg['error'];

			if (settings['message-colour']) {
				element.parentNode.style.backgroundColor = success ? "#0f844d" : "#bd0e0e";
				element.parentNode.style.color = "#fff";
			}

			// create temporarily incredibly ugly status header
			var statusElement = "";

			if (settings['verbose-header']) {
				statusElement = "<div>";

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
			}

			// update message content
			element.innerHTML = statusElement + msg.message;
		}
	};

	var msg = {
		messages: messages
	};

	var settings = ["verbose-header", "message-colour"];
	getSettingValues(settings, function(settings) {
		var newCallback = function(response) { onRecvDecryptedMessage(response, settings); };
		transmit("POST", "decrypt", msg, newCallback);
	});
};

function transmitForEncryption(msg, origRequestContext) {
	function onRecvEncryptedMessage(response, origRequestContext) {
		var sendFunc = origRequestContext['origSend'];
		var request  = origRequestContext['request'];
		var json     = origRequestContext['formDataJson'];
		var sendArgs = null;

		// handle error
		var err = response['error'];
		if (err) {
			alert(err);
			console.error(err);
			sendArgs = null; // block request
		}
		else {
			// update messenger request with encrypted message
			json['body'] = response['message'];
			sendArgs = flattenJSON(json)
		}

		sendFunc.apply(request, sendArgs);
	};

	transmit("POST", "encrypt", msg,
		function(resp) {
			onRecvEncryptedMessage(resp, origRequestContext);
		}
	);
};
