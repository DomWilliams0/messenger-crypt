#!/usr/bin/env python2
import argparse
import urllib2
import urllib
import sys
import json

import config
import encryption

def get_key(fbid):
    # TODO stub
    return "AABBCCDD"

def get_keys_handler(fbids):
    keys = {fbid: get_key(fbid) for fbid in fbids}
    keys_filtered = {k: v for k, v in keys.iteritems() if v is not None}
    return json.dumps({"keys": keys_filtered})


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

    # find valid public key if given
    if keyid is not None:
        pubkey, error = encryption.get_single_key(keyid)
        if error:
            return error

        if not pubkey.subkeys:
            return "There are no subkeys associated with this key"

        primkey = pubkey.subkeys[0]
        uid = pubkey.uids[0]
        user = {
                "key": primkey.fpr,
                "name": uid.name
                }
        print "Found key for %s" % uid.name

    # validate and normalise
    if fbid.startswith("fbid:"):
        fbid = fbid[4:]
    if not fbid[5:].isdigit():
        fbid = find_fbid(fbid)
        if fbid is None:
            return "Profile not found. Maybe it's not publicly visible; copy their ID from the browser extension popup instead."

    # update contacts
    contacts = config.get_section("keys.contacts")

    # linking
    if keyid:
        contacts[fbid] = user

    # unlinking
    else:
        try:
            user = contacts[fbid]
            del contacts[fbid]
        except KeyError:
            return "Cannot unlink non-existant fbid '%s'" % fbid

    config.save()

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

    # find secret key
    seckey, error = encryption.get_single_key(key, True)
    if error:
        return error

    subkey = seckey.subkeys[0]  # TODO need to specify subkey?
    keyid  = subkey.fpr

    if not subkey.can_sign:
        return "Secret key '%s' cannot be used to sign" % keyid

    # save
    config.set_item("keys.self", keyid)
    config.save()

    print "Registered '%s' as self" % keyid

def list_handler(args):
    print "=== CONTACTS ==="
    contacts = config.get_section("keys.contacts").items()
    if not contacts:
        print "No linked contacts."
    else:
        for k, v in contacts:
            print "%-24s %s (%s)" % (k, v['key'], v['name'])

    print
    self = config.get_item("keys.self")
    if not self:
        print "Secret key not set."
    else:
        print "Secret key: %s" % self

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
            help="Set your private key to decrypt incoming messages")
    parser_self.add_argument("seckey",
            help="The new secret key which will be used to decrypt and sign messages.")

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
