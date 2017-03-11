import json
from collections import namedtuple, OrderedDict

def _popchained(d, key):
    d.pop(key)
    return d

def _putchained(d, *key_values):
    for k, v in key_values:
        d[k] = v
    return d

def _filterchained(d):
    return {k: v for k, v in d.items() if v is not None}


SettingType = namedtuple("Setting", ["title", "description", "type", "value", "browser", "data"])
def Setting(title, description, setting_type, value, browser=True, data=None): return SettingType(title, description, setting_type, value, browser, data)
SETTING_TYPE_TEXT = "TEXT"
SETTING_TYPE_KEY  = "KEY"
SETTING_TYPE_BOOL = "BOOL"

_DEFAULT_CONVO_SETTINGS = {
        "encryption": False,
        "signing":    False
        }

_DEFAULT_SETTINGS_FULL = OrderedDict([
    ("ignore-revoked",
        Setting("Ignore revoked keys",
            "Don't use revoked public keys for encryption",
            SETTING_TYPE_BOOL,
            True)
        ),
    ("verbose-header",
        Setting("Show verbose message status",
            "Show decryption and signature status above every GPG message",
            SETTING_TYPE_BOOL,
            True)
        ),
    ("message-colour",
        Setting("Enable message colours",
            "Indicate decryption and verification success by changing the colour of PGP messages",
            SETTING_TYPE_BOOL,
            True)
        ),
    ("block-files",
        Setting("Block attachments and images",
            "Block the sending of attachments and images, as their encryption is not currently supported",
            SETTING_TYPE_BOOL,
            True)
        ),
    ("encrypt-key",
        Setting("Personal key",
            "The public and secret key to use for self-encryption and decryption",
            SETTING_TYPE_KEY,
            None,
            data={"key-id": "self-encrypt"})
        ),
    ("signing-key",
        Setting("Secret signing key",
            "Defaults to decryption key if not specified",
            SETTING_TYPE_KEY,
            None,
            data={"key-id": "self-sign"})
        )
    ])

_DEFAULT_SETTINGS = OrderedDict([(k, v.value) for k, v in _DEFAULT_SETTINGS_FULL.items()])


def get_conversation_settings(config, id):
    config.reload()
    settings = config.get_section('conversations')

    response = settings.get(id, _DEFAULT_CONVO_SETTINGS)
    return response


def set_conversation_settings(config, id, new):
    config.reload()
    settings = config.get_section('conversations')

    if new == _DEFAULT_CONVO_SETTINGS:
        del settings[id]
    else:
        settings[id] = new

    config.write()

def get_settings(config, browser_only=False):
    # merge default and user settings
    config.reload()
    all = OrderedDict(_DEFAULT_SETTINGS)
    user_set = config.get_section('settings')
    all.update(user_set)

    return [_filterchained(  # remove all None values
                _putchained( # add key and value
                    _DEFAULT_SETTINGS_FULL[k].__dict__, ("key", k), ("value", v)
                    )
                )
                for k, v in all.items() if not (browser_only and not _DEFAULT_SETTINGS_FULL[k].browser)
            ]


def get_browser_settings(config):
    return get_settings(config, browser_only=True)

def set_setting(config, key, value):
    settings = config.get_section('settings')
    settings[key] = value

    config.write()
