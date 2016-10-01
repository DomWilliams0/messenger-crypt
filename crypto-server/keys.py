#!/usr/bin/env python2
import argparse
import sys

import encryption
import config


def link_handler(args):
    fbid  = args['fbid']
    keyid = args['pubkey']

    # validate
    if fbid.startswith("fbid:"):
        fbid = fbid[5:]
    if not fbid.isdigit():
        return "fbid must be numeric"

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

    # update contacts
    contacts = config.get_section("keys", "contacts")

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
    config["self"] = keyid
    config.save()

    print "Registered '%s' as self" % keyid

def parse_args():
    class Parser(argparse.ArgumentParser):
        def error(self, message):
            sys.stderr.write('error: %s\n' % message)
            self.print_help()
            sys.exit(2)

    parser = Parser(description="Manage Facebook GPG keys")
    subparsers = parser.add_subparsers(dest="subcommand")

    parser_link = subparsers.add_parser("link")
    parser_link.add_argument("fbid",
            help="The numerical Facebook user ID, optionally with the prefix 'fbid:'.")
    parser_link.add_argument("pubkey", nargs="?",
            help="Any valid key selector (i.e. fingerprint, email, name etc.). If left blank, the fbid is unlinked from any existing key.")

    parser_self = subparsers.add_parser("self")
    parser_self.add_argument("seckey",
            help="The new secret key which will be used to decrypt and sign messages.")

    parsed = vars(parser.parse_args())
    cmd = parsed.pop("subcommand", None);
    return cmd, parsed


def main():
    cmd, args = parse_args()
    if not cmd or not args:
        return

    handler = globals().get("%s_handler" % cmd, None)
    if not handler:
        raise NotImplementedError("Command '%s' has not yet been implemented" % cmd)

    err = handler(args)
    if err:
        sys.stderr.write("ERROR: %s\n" % err)
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
