#!/usr/bin/env python2
import argparse
import urllib2
import urllib
import sys
import json
import operator

import config
import encryption

def _format_id(user):
    return "%s <%s>" % (user['name'], user['email'])

def _format_user(user, shorten_key=False):
    key = user['key']
    if shorten_key:
        key = key[-8:]
    return "%s %s" % (key, _format_id(user))

def get_key(fbid):
    config.reload()
    contacts = config.get_section("keys.contacts")

    return contacts.get(fbid, None) if contacts else None

# returns (key_user, error)
def set_key(fbid, key_id, secret=False, raise_keyerror=False, raw_key=False):
    # linking
    user = None
    key = None

    if key_id is not None:
        with encryption.GPGContext.LOCK:

            # search for key if linking
            key, error = encryption.get_single_key(key_id, secret=secret)
            if error:
                return None, error

            if not key.subkeys:
                return None, "There are no subkeys associated with this key"

            primkey = key.subkeys[0]
            uid = key.uids[0]
            user = {
                    "key":   primkey.fpr,
                    "name":  uid.name,
                    "email": uid.email
                    }

    # save to contacts
    config.reload()
    contacts = config.get_section("keys.contacts")

    # linking
    if key_id:
        contacts[fbid] = user

    # unlinking
    else:
        try:
            user = contacts[fbid]
            del contacts[fbid]
        except KeyError:
            if raise_keyerror:
                raise
            else:
                return None, "Cannot unlink non-existent fbid '%s'" % fbid

    config.save()
    if raw_key:
        return (user, key), None
    else:
        return user, None


def get_keys_handler(args):
    fbids = args.get("id", [])
    users = {fbid: get_key(fbid) for fbid in fbids}
    for fbid, user in users.items():
        if not user:
            del users[fbid]
        else:
            user['str'] = _format_user(user)
            users[fbid] = user

    out = { "count": len(users), "keys":  users}
    return json.dumps(out)

def set_keys_handler(input_json):
    parsed = json.loads(input_json)
    fbid   = parsed['fbid']
    keyid  = parsed['identifier']
    secret = parsed.get("secret", False)

    user, err = set_key(fbid, keyid, secret)
    response = { "error": err }
    if user:
        response['user'] = _format_user(user)
        response['user_id'] = _format_id(user)
        response['key']  = user['key']

    return json.dumps(response)

def link_handler(args):
    def find_fbid(profile):
        sys.stdout.write("Searching for profile '%s'... " % profile)
        sys.stdout.flush()

        data = urllib.urlencode({"url": profile})
        path = urllib2.urlopen("http://findmyfbid.com", data).url
        print "done"
        fbid = path[path.rindex("/") + 1:]
        if fbid == "failure" or not fbid.isdigit():
            return None
        return fbid


    fbid  = args['fbid']
    keyid = args['pubkey']

    # validate and normalise fbid
    if fbid.startswith("fbid:"):
        fbid = fbid[5:]
    if not fbid.isdigit():
        fbid = find_fbid(fbid)
        if fbid is None:
            return "Profile not found. Maybe it's not publicly visible; copy their ID from the browser extension popup instead."

    # attempt to set key
    user, error = set_key(fbid, keyid)
    if error:
        return error

    # beautiful elegance
    if keyid:
        verb = "Registered"
        direction = "to"
    else:
        verb = "Unregistered"
        direction = "from"

    print "%s '%s' %s %s (%s)" % (verb, user["key"], direction, user["name"], fbid)


def self_handler(args):
    key = args.pop("seckey")
    which = args.pop("which")

    # find secret key
    contacts_to_set = []
    both = which == "both"
    if both or which == "sign":
        contacts_to_set.append("self-sign")
    if both or which == "decrypt":
        contacts_to_set.append("self-decrypt")

    err = None
    success = False
    for contact_fbid in contacts_to_set:
        try:
            user_rawkey, error = set_key(contact_fbid, key, True, raise_keyerror=True, raw_key=True)
            err = error
            if error is None:
                success = True
        except KeyError:
            # don't overwrite any existing error
            if err is None:
                err = True

    if not success and err:
        return err if isinstance(err, str) else "Cannot unlink non-existent key"

    # validation
    user, raw_key = user_rawkey
    if raw_key and which == "sign" and not raw_key.can_sign:
        return "Secret key cannot be used to %s" % which

    action = "%sing" % which if not both else "both signing and decrypting"
    if key:
        print "Registered secret key for %s: %s" % (action, _format_user(user))
    else:
        print "Unregistered secret key for %s" % action

def list_handler(args):
    contacts = config.get_section("keys.contacts")
    selfs = (contacts.pop("self-decrypt", None), contacts.pop("self-sign", None))

    if not contacts:
        print "No linked contacts."
    else:
        for k, v in contacts.iteritems():
            print "%-24s %s" % (k, _format_user(v))
    print

    decrypt, sign = selfs

    print_pairs = []

    # both set
    if decrypt and sign:
        # same key
        if decrypt == sign:
            print_pairs.append(("signing and decrypting", decrypt))

        # different
        else:
            print_pairs.append(("decrypting", decrypt))
            print_pairs.append(("signing", sign))

    # one key
    elif decrypt != sign and (decrypt or sign):
        set_verb = "decrypting" if decrypt else "signing"
        not_set_verb = "decrypting" if not decrypt else "signing"

        print_pairs.append((set_verb, decrypt or sign))
        print_pairs.append((not_set_verb, "not explicitly set, so will use the key set for %s" % set_verb))

    if not print_pairs:
        print "No secret keys specified."
    else:
        max_len = str(max(map(lambda x: len(x[0]), print_pairs)))
        for action, user in print_pairs:
            print ("Secret key for %-" + max_len + "s: %s") % (action, _format_user(user) if isinstance(user, dict) else user)

def parse_args():
    class Parser(argparse.ArgumentParser):
        def error(self, message):
            sys.stderr.write('error: %s\n' % message)
            self.print_help()
            sys.exit(2)

    parser = Parser(description="Manage Facebook GPG keys")
    subparsers = parser.add_subparsers(dest="subcommand")

    parser_link = subparsers.add_parser("link",
            help="Link facebook profiles to public keys")
    parser_link.add_argument("fbid",
            help="The numerical Facebook user ID, optionally with the prefix 'fbid:'.")
    parser_link.add_argument("pubkey", nargs="?",
            help="Any valid key selector (i.e. fingerprint, email, name etc.). If left blank, the fbid is unlinked from any existing key.")

    parser_list = subparsers.add_parser("list",
            help="List currently stored keys")

    parser_self = subparsers.add_parser("self",
            help="Set your private keys to decrypt and sign incoming messages")
    parser_self.add_argument("--which", "-w", nargs="?", choices=["sign", "decrypt", "both"], default="both",
            help="Which secret key to set. Defaults to both.")
    parser_self.add_argument("seckey", nargs="?",
            help="The new secret key which will be used to decrypt/sign messages. If left blank, the specified secret key is unlinked.")

    parsed = vars(parser.parse_args())
    cmd = parsed.pop("subcommand", None)
    return cmd, parsed


def main():
    cmd, args = parse_args()
    if not cmd or args is None:
        return

    handler = globals().get("%s_handler" % cmd, None)
    if not handler:
        raise NotImplementedError("Command '%s' has not yet been implemented" % cmd)

    err = handler(args)
    if err:
        sys.stderr.write("ERROR: %s\n" % err)
        sys.stderr.flush()
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
