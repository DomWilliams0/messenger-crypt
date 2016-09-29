#!/usr/bin/env python2

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import json
import ssl
import sys

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
        msg_raw = self.rfile.read(int(self.headers.getheader("content-length")))

        # find corresponding handler
        handler = getattr(self, "%s_handler" % self.path.lstrip("/"), None)

        # not found
        if handler is None:
            self.send_response(404)
            return

        handler(msg_raw)

    def decrypt_handler(self, msg_raw):
        msg = encryption.Message(json.loads(msg_raw))
        encryption.decrypt_message(msg)

        if msg.error:
            print "ERROR: %s" % msg.error # TODO use some actual logging, you savage

        response = json.dumps(msg.serialise())
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)

    def encrypt_handler(self, msg_raw):
        self.send_response(418)


def start_server(port, certfile, keyfile):
    addr = ("127.0.0.1", port)
    httpd = HTTPServer(addr, RequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, certfile=certfile, keyfile=keyfile, server_side=True)

    print "Listening on %s:%d..." % addr
    httpd.serve_forever();

def load_config(config_path):
    global config
    import config

    # load config and replace module with dictionary-like clone
    if not config.load_config(config_path):
        return False

    # reload global import
    import config

    return True

def main():
    config_path = "settings.json"

    if not load_config(config_path):
        return 1

    # start listening
    port     = config['port']
    certfile = config['tls-cert']
    keyfile  = config['tls-key']
    start_server(port, certfile, keyfile)

    return 0


if __name__ == "__main__":
    sys.exit(main())