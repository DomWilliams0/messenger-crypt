#!/usr/bin/env python2

import json
import ssl
import sys
import os
import threading
import urlparse
import signal
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import server_help

import config
import encryption
import settings
import keys
import constants

STATE = ""

def arg_dropper(func):
    def new_func(dummy):
        return func()
    return new_func


def _set_state(state):
    global STATE
    STATE = state

@arg_dropper
def _get_state():
    return STATE

_HANDLERS = {}

def _register_handler(path, method, func):
    _HANDLERS[(path, method)] = func

def register_handler(path, post=None, get=None):
    def get_wrapper(func):
        def real_handler(req, args):
            resp = func(args)

            req.send_response(200)
            req.send_header('Access-Control-Allow-Origin', 'https://www.messenger.com')
            req.send_header('Access-Control-Allow-Methods', 'GET')
            req.send_header("Access-Control-Allow-Headers", "Content-Type")
            req.send_header('Content-Type', 'application/json')
            req.end_headers()

            if resp:
                req.wfile.write(resp)

        return real_handler

    def post_wrapper(func):
        def real_handler(req, args):
            resp = func(args)

            req.send_response(200)
            req.send_header('Access-Control-Allow-Origin', 'https://www.messenger.com')
            req.send_header('Access-Control-Allow-Methods', 'POST')
            req.send_header("Access-Control-Allow-Headers", "Content-Type")
            req.send_header('Content-Type', 'application/json')
            req.end_headers()

            if resp:
                req.wfile.write(resp)

        return real_handler

    if post:
        _register_handler(path, "POST", post_wrapper(post))
    if get:
        _register_handler(path, "GET", get_wrapper(get))


class WebRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'https://www.messenger.com')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        msg = self.rfile.read(int(self.headers.getheader("content-length", 0)))
        self._get_going(msg)

    def do_GET(self):
        path = urlparse.urlparse(self.path)
        params = urlparse.parse_qs(path.query)
        self.path = path.path
        self._get_going(params)

    def _get_going(self, args):
        path = self.path.lstrip("/")
        method = self.command
        handler = _HANDLERS.get((path, method), None)

        if handler is None:
            self.send_response(404)
            self.end_headers()
        else:
            handler(self, args)

class HTTPServer(ThreadingMixIn, HTTPServer):
    pass


def register_signal_handlers():
    def exit(signal, frame):
        print "\nQuitting..."
        sys.exit(0)

    signal.signal(signal.SIGINT, exit)


def register_handlers():
    register_handler("decrypt",
            post=encryption.decrypt_message_handler)
    register_handler("encrypt",
            post=encryption.encrypt_message_handler)

    register_handler("state",
            post=_set_state,
            get=_get_state)
    register_handler("keys",
            post=keys.set_keys_handler,
            get=keys.get_keys_handler)

    register_handler("convosettings",
            post=settings.update_convo_settings_handler,
            get=settings.get_convo_settings_handler)
    register_handler("settings",
            post=settings.update_settings_handler,
            get=settings.get_settings_handler)

    _register_handler("", "GET", server_help.redirect_to_help_server)


def start_server(port, handler, https, tls_dir=None):
    def check_exists(f, what):
        if not os.path.exists(f):
            print "Could not find %s at '%s'" % (what, f)
            return False
        return True

    addr = ("127.0.0.1", port)
    httpd = HTTPServer(addr, handler)

    if https:
        if not check_exists(tls_dir, "TLS cert directory"):
            return False

        certfile = os.path.join(tls_dir, "cert.pem")
        keyfile = os.path.join(tls_dir, "key.pem")

        if not check_exists(certfile, "TLS certificate") or not check_exists(keyfile, "TLS private key"):
            return False

        httpd.socket = ssl.wrap_socket(httpd.socket, certfile=certfile, keyfile=keyfile, server_side=True)

    print "Starting server on %s://%s:%d..." % ("https" if https else "http", addr[0], addr[1])
    httpd.serve_forever()


def start_crypto_server():
    t = threading.Thread(target=start_server, args=[constants.WEB_PORT, WebRequestHandler, True, config['settings.tls-cert-dir']])
    t.setDaemon(True)
    t.start()


def main():
    register_signal_handlers()
    register_handlers()

    # start help server
    server_help.start_help_server()

    return 0


if __name__ == "__main__":
    sys.exit(main())
