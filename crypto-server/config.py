import json
import os

class Config(object):
    def __init__(self):
        self.dict = {}

    def load(self, path):
        try:
            with open(path) as f:
                self.dict = json.load(f)
                print "Loaded config from '%s'" % path
                return True

        except (IOError, ValueError) as e:
            print "Failed to load config '%s': %s" % (path, e.message)
            return False

    def __getitem__(self, key):
        if key not in self.dict:
            print "Missing config key: '%s'" % key
            return None

        return self.dict.__getitem__(key)



def load_config(path):
    c = Config()
    return c if c.load(path) else None
