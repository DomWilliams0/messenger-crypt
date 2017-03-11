import os
import errno
import sys
import json

class Config(object):
    def __init__(self, path):
        self._path = path
        self.conf = {}

        load = self._load()
        if load:
            raise StandardError("Failed to load config: %s" % load)

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

    # returns string: error message
    def _load(self):
        if os.path.exists(self._path):
            with open(self._path) as f:
                try:
                    self.conf.update(json.load(f))
                except ValueError as e:
                    return e.message

    def write(self):
        try:
            parent_path = os.path.dirname(self._path)
            if parent_path:
                os.makedirs(parent_path)
        except OSError as exc:
            if exc.errno == errno.EEXIST and os.path.isdir(parent_path):
                pass
            else:
                raise

        with open(self._path, "w") as f:
            json.dump(self.conf, f, indent=4)
