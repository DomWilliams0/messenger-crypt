#!/usr/bin/env python2

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import json
import ssl
import sys
import urlparse

import constants
import config
import encryption

STATE = ""

class RequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        msg = self.rfile.read(int(self.headers.getheader("content-length")))
        self._get_going(msg)

    def do_GET(self):
        self._get_going(None)

    def _get_going(self, args):
        # find corresponding handler
        handler = getattr(self, "%s_handler_%s" % (self.path.lstrip("/"), self.command.lower()), None)

        # not found
        if handler is None:
            self.send_response(404)
            return

        handler(args)

    def decrypt_handler_post(self, msg):
        msg = encryption.DecryptedMessage(msg)
        encryption.decrypt_message(msg)

        if msg.error:
            print "ERROR: %s" % msg.error # TODO use some actual logging, you savage

        response = json.dumps(msg.serialise())
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)

    def encrypt_handler_post(self, msg):
        msg = encryption.EncryptedMessage(msg)
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

    def state_handler_post(self, msg):
        global STATE
        STATE = msg

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers();

    def state_handler_get(self, args):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers();
        self.wfile.write(STATE)


class HTTPServer(ThreadingMixIn, HTTPServer):
    pass

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
