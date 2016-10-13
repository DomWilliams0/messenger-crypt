CONFIG_PATH = "settings.conf"


def join_list(l):
    length = len(l)

    if length == 0:
        return ""
    if length == 1:
        return str(l[0])

    strs = map(str, l)
    return "%s and %s" % (", ".join(strs[:-1]), strs[-1])
