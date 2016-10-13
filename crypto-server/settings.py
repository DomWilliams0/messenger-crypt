import json

import config

def _convert_btos(settings):
    return {k: str(v).lower() if isinstance(v, bool) else v for k, v in settings.items()}

def _convert_stob(settings):
    def _convert(x):
        if x == "true":  return True
        if x == "false": return False
        return x

    return {k: _convert(v) for k, v in settings.items()}

_DEFAULT_SETTINGS = _convert_btos({
        "encryption": False,
        "signing":    False
        })


def update_settings_handler(msg):
    config.reload()
    settings = config.get_section('conversations')

    msg = json.loads(msg)
    convoID = msg.pop("id")
    msg = _convert_btos(msg)

    if msg == _DEFAULT_SETTINGS:
        del settings[convoID]
    else:
        settings[convoID] = msg

    config.save()

def get_settings_handler(msg):
    convoID = msg['id'][0]
    settings = get_settings(convoID)

    # convert to string format
    return json.dumps(_convert_btos(settings))

# returns python booleans
def get_settings(convoID):
    config.reload()
    settings = config.get_section('conversations')

    response = settings.get(convoID, _DEFAULT_SETTINGS)
    return _convert_stob(response)
