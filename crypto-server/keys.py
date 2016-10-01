#!/usr/bin/env python2
import argparse
import sys

def link_handler(args):
    pass

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

    handler(args)


if __name__ == "__main__":
    main()

