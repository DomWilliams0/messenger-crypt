#!/usr/bin/env python2
import argparse
import sys

import encryption

def link_handler(args):
    fbid  = args['fbid']
    keyid = args['pubkey']

    # validate
    if fbid.startswith("fbid:"):
        fbid = fbid[5:]
    if not fbid.isdigit():
        return "fbid must be numeric"

    # find valid public key
    pubkey, error = encryption.get_single_key(keyid)
    if error:
        return error

    if not pubkey.subkeys:
        return "There are no subkeys associated with this key"

    primkey = pubkey.subkeys[0]
    uid = pubkey.uids[0]
    user = {
            "fbid": fbid,
            "key": primkey.fpr,
            "name": uid.name
            }

    # TODO save to config


def parse_args():
    class Parser(argparse.ArgumentParser):
        def error(self, message):
            sys.stderr.write('error: %s\n' % message)
            self.print_help()
            sys.exit(2)

    parser = Parser(description="Manage Facebook GPG keys")
    subparsers = parser.add_subparsers(dest="subcommand")

    parser_link = subparsers.add_parser("link")
    parser_link.add_argument("fbid", help="The numerical Facebook user ID, optionally with fbid: prefix")
    parser_link.add_argument("pubkey", help="Any valid key selector (i.e. fingerprint, email, name etc.)")

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

