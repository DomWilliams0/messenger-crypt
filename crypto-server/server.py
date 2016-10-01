#!/usr/bin/env python2

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import json
import ssl
import sys
import urlparse

import constants
import config
import encryption

class RequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        msg_raw  = self.rfile.read(int(self.headers.getheader("content-length")))
        msg_json = json.loads(msg_raw)

        # find corresponding handler
        handler = getattr(self, "%s_handler" % self.path.lstrip("/"), None)

        # not found
        if handler is None:
            self.send_response(404)
            return

        handler(msg_json)

    def decrypt_handler(self, msg_json):
        msg = encryption.DecryptedMessage(msg_json)
        encryption.decrypt_message(msg)

        if msg.error:
            print "ERROR: %s" % msg.error # TODO use some actual logging, you savage

        response = json.dumps(msg.serialise())
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)

    def encrypt_handler(self, msg_json):
        msg = encryption.EncryptedMessage(msg_json)
        encryption.encrypt_message(msg)

        if msg.error:
            print "ERROR: %s" % msg.error

        response = json.dumps(msg.serialise())
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)


def start_server(port, certfile, keyfile):
    addr = ("127.0.0.1", port)
    httpd = HTTPServer(addr, RequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, certfile=certfile, keyfile=keyfile, server_side=True)

    print "Listening on %s:%d..." % addr
    httpd.serve_forever();


def main():
    # start listening
    port     = int(config['port'])
    certfile = config['tls-cert']
    keyfile  = config['tls-key']
    start_server(port, certfile, keyfile)

    return 0


if __name__ == "__main__":
    sys.exit(main())
