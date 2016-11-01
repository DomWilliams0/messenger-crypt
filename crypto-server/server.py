#!/usr/bin/env python2

import json
import ssl
import sys
import urlparse
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn

import config
import encryption
import settings
import keys

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
        path = urlparse.urlparse(self.path)
        params = urlparse.parse_qs(path.query)
        self.path = path.path
        self._get_going(params)

    def _get_going(self, args):
        # find corresponding handler
        handler = getattr(self, "%s_handler_%s" % (self.path.lstrip("/"), self.command.lower()), None)

        # not found
        if handler is None:
            self.send_response(404)
            return

        handler(args)

    def decrypt_handler_post(self, msg):
        msg = json.loads(msg)
        response = json.dumps(encryption.decrypt_message_handler(msg))

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)

    def encrypt_handler_post(self, msg):
        msg = json.loads(msg)
        response = json.dumps(encryption.encrypt_message_handler(msg))

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
        self.end_headers()

    def state_handler_get(self, msg):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(STATE)

    def settings_handler_post(self, msg):
        settings.update_settings_handler(msg)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    # TODO looks a bit repetitive to me chief
    def settings_handler_get(self, msg):
        response = settings.get_settings_handler(msg)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

        self.wfile.write(response)

    def keys_handler_get(self, msg):
        response = keys.get_keys_handler(msg['id'])

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

        self.wfile.write(response)

    def keys_handler_post(self, msg):
        response = keys.set_keys_handler(msg)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        self.wfile.write(response)


class HTTPServer(ThreadingMixIn, HTTPServer):
    pass


def start_server(port, certfile, keyfile):
    addr = ("127.0.0.1", port)
    httpd = HTTPServer(addr, RequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, certfile=certfile, keyfile=keyfile, server_side=True)

    print "Listening on %s:%d..." % addr
    httpd.serve_forever()


def main():
    # start listening
    port     = 50456
    certfile = config['tls-cert']
    keyfile  = config['tls-key']
    start_server(port, certfile, keyfile)

    return 0


if __name__ == "__main__":
    sys.exit(main())
