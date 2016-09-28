import json
import os
import sys

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
        split = key.split(".")

        current_node = self.dict
        for key in split:
            current_node = current_node.get(key, None)

            # not found
            if not key:
                return None

        return current_node

def load_config(path):
    return _MODULE_OVERRIDE.instance.load(path)

class _ConfigModule(object):
    def __init__(self, namespace):
        self.__dict__.update(namespace)
        self.instance = Config()

    def __getitem__(self, name):
        return self.instance.__getitem__(name)

import config as _config
_MODULE_OVERRIDE = _ConfigModule(_config.__dict__)
sys.modules[__name__] = _MODULE_OVERRIDE
del _config
