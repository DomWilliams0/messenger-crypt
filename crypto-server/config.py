import os
import errno
import sys
import json

import constants


class Config(object):
    def __init__(self, path):
        self._path = path
        self.conf = {}

        load = self._load()
        if load == False:
            print "Config not found at '%s', writing defaults" % path
            self.save()
        elif isinstance(load, str):
            print "Error loading config: %s" % load
            exit(1)

    def get_item(self, path):
        split = path.split(".")
        section = self.get_section(".".join(split[:-1]))
        return section.get(split[-1], None)

    def set_item(self, path, value):
        split = path.split(".")
        section = self.get_section(".".join(split[:-1]))
        section[split[-1]] = value

    __getitem__ = get_item
    __setitem__ = set_item

    def get_section(self, path):
        if not path:
            return self.conf

        split = path.split(".")
        current = self.conf
        for p in split:
            try:
                current = current[p]
            except KeyError:
                current[p] = {}
                current = current[p]
        return current

    # returns True:   success
    # returns False:  file not found
    # returns string: other error message
    def _load(self):
        if not os.path.exists(self._path):
            return False

        with open(self._path) as f:
            try:
                self.conf.update(json.load(f))
            except ValueError as e:
                return e.message

        return True

    def save(self):
        try:
            parent_path = os.path.dirname(self._path)
            if parent_path:
                os.makedirs(parent_path)
        except OSError as exc:
            if exc.errno == errno.EEXIST and os.path.isdir(path):
                pass
            else:
                raise

        with open(self._path, "w") as f:
            json.dump(self.conf, f, indent=4)

    reload = _load


class _ConfigModule(object):
    def __init__(self, namespace):
        self.__dict__.update(namespace)
        self.instance = Config(constants.CONFIG_PATH)

    def __getitem__(self, name):
        return self.instance.__getitem__(name)

    def __setitem__(self, key, value):
        self.instance.__setitem__(key, value)

    def __getattr__(self, attr):
        return getattr(self.instance, attr)


import config as _config

_MODULE_OVERRIDE = _ConfigModule(_config.__dict__)
sys.modules[__name__] = _MODULE_OVERRIDE
del _config
