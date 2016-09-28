#!/usr/bin/env python2

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import json
import ssl
import sys

import config

CONFIG = None

class RequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        msg = self.rfile.read(int(self.headers.getheader("content-length")))

        # find corresponding handler
        handler = globals().get(self.path.lstrip("/"), None)

        # not found
        if handler is None:
            self.send_response(404)
            return

        response = handler(msg)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers();

        self.wfile.write(json.dumps(response));


def decrypt(msg):
    resp = {"success": True, "message": "decrypted message"}

    return resp


def encrypt(msg):
    return {"error": "not implemented"}


def start_server(port, certfile, keyfile):
    addr = ("127.0.0.1", port)
    httpd = HTTPServer(addr, RequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, certfile=certfile, keyfile=keyfile, server_side=True)

    print "Listening on %s:%d..." % addr
    httpd.serve_forever();

def main():
    config_path = "settings.json"
    # TODO set in config

    # load config
    global CONFIG
    CONFIG = config.load_config(config_path)
    if not CONFIG:
        return 1

    # start listening
    port     = CONFIG['port']
    certfile = CONFIG['tls-cert']
    keyfile  = CONFIG['tls-key']
    start_server(port, certfile, keyfile)

    return 0


if __name__ == "__main__":
    sys.exit(main())
