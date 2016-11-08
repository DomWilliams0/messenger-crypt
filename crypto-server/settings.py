import json
from collections import namedtuple, OrderedDict

import config

def _popchained(d, key):
    d.pop(key)
    return d

def _putchained(d, *key_values):
    for k, v in key_values:
        d[k] = v
    return d

def _filterchained(d):
    return {k: v for k, v in d.items() if v is not None}


SettingType = namedtuple("Setting", ["title", "description", "type", "value", "data"])
def Setting(title, description, setting_type, value, data=None): return SettingType(title, description, setting_type, value, data)
SETTING_TYPE_TEXT = "TEXT"
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
        Setting("Block attachments and stickers",
            "Block the sending of attachments and stickers, as their encryption is not currently supported",
            SETTING_TYPE_BOOL,
            False)
        ),
    ("decrypt-key",
        Setting("Decryption key",
            "The public and secret key to use for self-encryption and decryption",
            SETTING_TYPE_TEXT,
            None,
            data={"key-id": "self-decrypt"})
        ),
    ("signing-key",
        Setting("Secret signing key",
            "Defaults to decryption key if not specified",
            SETTING_TYPE_TEXT,
            None,
            data={"key-id": "self-sign"})
        ),
    ])

_DEFAULT_SETTINGS = OrderedDict([(k, v.value) for k, v in _DEFAULT_SETTINGS_FULL.items()])


def update_convo_settings_handler(msg):
    config.reload()
    settings = config.get_section('conversations')

    msg = json.loads(msg)
    convoID = msg.pop("id")

    if msg == _DEFAULT_CONVO_SETTINGS:
        del settings[convoID]
    else:
        settings[convoID] = msg

    config.save()


def get_convo_settings_handler(msg):
    convoID = msg['id'][0]
    settings = get_convo_settings(convoID)

    # convert to string format
    return json.dumps(settings)


# returns python booleans
def get_convo_settings(convoID):
    config.reload()
    settings = config.get_section('conversations')

    response = settings.get(convoID, _DEFAULT_CONVO_SETTINGS)
    return response

def get_settings_handler(msg):
    settings_values = get_settings()

    keys = msg.get("key", None)
    if keys:
        settings_values = OrderedDict((key, settings_values.get(key, None)) for key in keys if key in settings_values)

    settings_descriptions = [
            _filterchained(  # remove all None values
                _putchained( # add key and value
                    _DEFAULT_SETTINGS_FULL[k].__dict__, ("key", k), ("value", v)
                    )
                )
            for k, v in settings_values.items()
            ]

    return json.dumps(settings_descriptions)

def update_settings_handler(msg):
    parsed = json.loads(msg)
    settings = get_settings()
    settings[parsed['key']] = parsed['value']

    # remove Nones
    settings = {k: v for k, v in settings.iteritems() if v is not None}

    config.set_item('settings', settings)
    config.save()

def get_settings():
    config.reload()
    merged = OrderedDict(_DEFAULT_SETTINGS)
    user_set = config.get_section('settings')
    merged.update(user_set)
    # merged = {k: v for k, v in merged.items() if v is not None}

    return merged

