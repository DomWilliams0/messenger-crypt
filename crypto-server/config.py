import os
import sys
from configobj import ConfigObj

import constants


class Config(object):
    DEFAULT_VALUES = [
            ("port", 50456),
            ("tls-cert", "../../certs/cert.pem"),
            ("tls-key", "../../certs/key.pem")
            ]

    def __init__(self, path):
        self.conf = ConfigObj(path)

        if not os.path.exists(path):
            print "Config not found at '%s', writing default settings" % path
            for (k, v) in self.DEFAULT_VALUES:
                self.conf[k] = v
            self.conf.write()


    def __getitem__(self, key):
        return self.conf[key]

    def get_section(self, *path):
        current = self.conf
        for p in path:
            try:
                current = current[p]
            except KeyError:
                current[p] = {}
                current = current[p]
        return current

    def save(self):
        self.conf.write()


class _ConfigModule(object):
    def __init__(self, namespace):
        self.__dict__.update(namespace)
        self.instance = Config(constants.CONFIG_PATH)

    def __getitem__(self, name):
        return self.instance.__getitem__(name)

    def __getattr__(self, attr):
        return getattr(self.instance, attr)


import config as _config

_MODULE_OVERRIDE = _ConfigModule(_config.__dict__)
sys.modules[__name__] = _MODULE_OVERRIDE
del _config
