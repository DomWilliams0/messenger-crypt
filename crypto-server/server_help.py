import os
import threading
from SimpleHTTPServer import SimpleHTTPRequestHandler

import constants
import server

CWD     = os.getcwd()
CWD_LCK = threading.Lock()

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
        print "post!"

def start_help_server():
    server.start_server(constants.HELP_PORT, RestrictedSimpleHTTPRequestHandler, False)


def redirect_to_help_server(req, args):
    req.send_response(301)
    req.send_header("Location", "http://%s:%d" % (req.client_address[0], constants.HELP_PORT))
    req.end_headers()

