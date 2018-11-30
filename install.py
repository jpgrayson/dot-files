#!/usr/bin/env python3
"""Safely install dot-files to home directory."""

from pathlib import Path
import argparse
import hashlib
import os
import shutil


HERE = Path(__file__).parent.absolute()

EXCLUDE = [
    HERE / 'install.py',
    HERE / 'README.md',
    HERE / 'LICENSE.md',
    HERE / '.git',
    HERE / '.gitmodules',
    HERE / '.gitignore',
]


def hash_digest(path):
    return hashlib.md5(path.read_bytes()).hexdigest()


def identical(path0, path1):
    return hash_digest(path0) == hash_digest(path1)


def link(src, dst):
    target = Path(os.path.relpath(src, os.path.dirname(dst)))
    os.symlink(target, dst)
    print(f'{dst}: linked to {target}')


def install(src_dir, dst_dir):
    if not dst_dir.exists():
        print(f'{dst_dir}: mkdir')
        dst_dir.mkdir(parents=True)
        make_links(src_dir, dst_dir)
    elif dst_dir.is_symlink():
        print(f'{dst_dir}: is symlink, skipping')
    elif dst_dir.is_dir():
        make_links(src_dir, dst_dir)
    else:
        print(f'{dst_dir}: exists but is not dir')


def make_links(src_dir, dst_dir):
    for src in src_dir.iterdir():
        if src in EXCLUDE:
            continue

        dst = dst_dir / src.relative_to(src_dir)

        if src.is_dir():
            install(src, dst)
        elif not dst.exists():
            link(src, dst)
        elif dst.samefile(src):
            print(f'{dst}: already linked')
        elif dst.is_file():
            if identical(dst, src):
                dst.unlink()
                link(src, dst)
            else:
                print(f'{dst}: differs, not messing')
        else:
            print(f'{dst}: exists but is not file')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        'dst',
        metavar='DIR',
        nargs='?',
        default=Path.home(),
        type=Path,
        help='Installation destination. Default: %(default)s',
    )
    args = parser.parse_args()
    install(HERE, args.dst)


if __name__ == '__main__':
    main()
