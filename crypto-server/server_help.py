import os
import threading
from SimpleHTTPServer import SimpleHTTPRequestHandler

import constants
import server

CWD     = os.getcwd()
CWD_LCK = threading.Lock()
CRYPTO  = None

class RestrictedSimpleHTTPRequestHandler(SimpleHTTPRequestHandler): # what a mouthful
    def translate_path(self, path):
        with CWD_LCK:
            os.chdir(constants.HELP_ROOT)
            ret = SimpleHTTPRequestHandler.translate_path(self, path)
            os.chdir(CWD)
            return ret

    def log_message(self, format, *args):
        pass

    def do_POST(self):
        path = self.path[1:]
        body = self.rfile.read(int(self.headers.getheader("content-length", 0)))

        handler = globals().get("handler_%s" % path, None)

        ret = False
        err = 404
        if handler is not None:
            ret = handler(self, body)
            err = 400

        if ret is not True: # explicit True returned on success
            self.send_response(err)
            self.end_headers()

def handler_server(req, msg):
    try:
        starting = bool(("stop", "start").index(msg))
    except ValueError:
        return False

    global CRYPTO
    if starting:
        if CRYPTO is not None: # and not failed startup
            return

        CRYPTO = server.start_crypto_server()
        print "Starting crypto server"
    else:
        if CRYPTO is None:
            return

        CRYPTO.shutdown()
        print "Stopping crypto server"
        CRYPTO = None

    req.send_response(200)
    req.end_headers()
    return True


def start_help_server():
    httpd = server.create_server(constants.HELP_PORT, RestrictedSimpleHTTPRequestHandler, False)
    httpd.serve_forever()


def redirect_to_help_server(req, args):
    req.send_response(301)
    req.send_header("Location", "http://%s:%d" % (req.client_address[0], constants.HELP_PORT))
    req.end_headers()

