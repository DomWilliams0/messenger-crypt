import json
import os

_INSTANCE = None

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
    global _INSTANCE
    _INSTANCE = Config()

    import sys
    sys.modules[__name__] = _ConfigModule(globals())

    return _INSTANCE.load(path)


class _ConfigModule(object):
    def __init__(self, namespace):
        self.__dict__.update(namespace)

    def __getitem__(self, name):
        return self._INSTANCE.__getitem__(name)
