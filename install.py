#!/usr/bin/env python3

import hashlib
import os
import shutil
import sys


excludes = [os.path.basename(__file__),
            'README.md',
            'LICENSE.md',
            '.git',
            '.gitmodules',
            '.gitignore']


def hash_digest(path):
    with open(path) as f:
        return hashlib.md5(f.read().encode()).hexdigest()


def identical(path0, path1):
    return hash_digest(path0) == hash_digest(path1)


def link(src, dst):
    target = os.path.relpath(src, os.path.dirname(dst))
    os.symlink(target, dst)
    print('linked {} {}'.format(target, dst))


def ask(prompt):
    return input(prompt).strip().lower().startswith('y')


def main(argv):
    home = os.environ['HOME']
    here = os.path.dirname(os.path.join(os.path.curdir, __file__))

    for x in os.listdir(here):
        if x in excludes:
            continue
        home_x = os.path.join(home, x)
        here_x = os.path.join(here, x)
        if os.path.exists(home_x) and os.path.samefile(home_x, here_x):
            print('{}: already linked'.format(home_x))
        elif os.path.isfile(home_x):
            if identical(home_x, here_x):
                os.unlink(home_x)
                link(here_x, home_x)
            else:
                print('{}: differs, not messing'.format(home_x))
        elif not os.path.exists(home_x):
            link(here_x, home_x)
        elif os.path.isdir(home_x):
            if ask('Replace {} with link? '.format(home_x)):
                backup = home_x + '.backup'
                os.rename(home_x, backup)
                try:
                    link(here_x, home_x)
                except Exception:
                    os.rename(backup, home_x)
                    raise
                finally:
                    shutil.rmtree(backup)


if __name__ == '__main__':
    main(sys.argv[1:])
