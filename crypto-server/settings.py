import json
from collections import namedtuple, OrderedDict

import config

_True  = "true"
_False = "false"

def _convert_btos(settings):
    return {k: str(v).lower() if isinstance(v, bool) else v for k, v in settings.items()}


def _convert_stob(settings):
    def _convert(x):
        if x == "true":  return True
        if x == "false": return False
        return x

    return {k: _convert(v) for k, v in settings.items()}

def _popchained(d, key):
    d.pop(key)
    return d

def _putchained(d, *key_values):
    for k, v in key_values:
        d[k] = v
    return d

Setting = namedtuple("Setting", ["title", "description", "value"])
Setting.__str__ = str(Setting.__dict__)

_DEFAULT_CONVO_SETTINGS = {
        "encryption": _False,
        "signing":    _False
        }

_DEFAULT_SETTINGS_FULL = {
        "ignore-revoked": Setting("Ignore revoked keys", "Don't use revoked public keys for encryption", _True),
        "verbose-header": Setting("Show verbose message status", "Show decryption and signature status above every GPG message", _True),
        "block-files": Setting("Block attachments and stickers", "Block the sending of attachments and stickers, as their encryption is not currently supported", _False),
        "numerical-hotkeys": Setting("Enable numerical hotkeys", "Enable jumping to a user's key in the participants tab with their index - e.g. to edit user #2's key, type 2 followed by Enter", _True)
        }

_DEFAULT_SETTINGS = {k: v.value for k, v in _DEFAULT_SETTINGS_FULL.items()}


def update_convo_settings_handler(msg):
    config.reload()
    settings = config.get_section('conversations')

    msg = json.loads(msg)
    convoID = msg.pop("id")
    msg = _convert_btos(msg)

    if msg == _DEFAULT_CONVO_SETTINGS:
        del settings[convoID]
    else:
        settings[convoID] = msg

    config.save()


def get_convo_settings_handler(msg):
    convoID = msg['id'][0]
    settings = get_convo_settings(convoID)

    # convert to string format
    return json.dumps(_convert_btos(settings))


# returns python booleans
def get_convo_settings(convoID):
    config.reload()
    settings = config.get_section('conversations')

    response = settings.get(convoID, _DEFAULT_CONVO_SETTINGS)
    return _convert_stob(response)

def get_settings_handler(msg):
    settings_values = get_settings()

    keys = msg.get("key", None)
    if keys:
        settings_values = OrderedDict((key, settings_values.get(key, None)) for key in keys if key in settings_values)

    settings_descriptions = [_putchained(_DEFAULT_SETTINGS_FULL[k].__dict__, ("key", k), ("value", v)) for k, v in settings_values.items()]
    return json.dumps(settings_descriptions)

def update_settings_handler(msg):
    parsed = json.loads(msg)
    settings = get_settings()
    settings[parsed['key']] = parsed['value']

    config.set_item('settings', settings)
    config.save()

def get_settings():
    config.reload()
    user_set = config.get_section('settings')
    merged = dict(_DEFAULT_SETTINGS)
    merged.update(user_set)

    return _convert_stob(merged)

