# dot-files

These are jpgrayson's dot files. They are meant to be portable to Linux
and Mac OS X.

## Installation

The `install.py` script cautiously populates `$HOME` with relative
symlinks pointing back into the repo, mirroring its directory structure.
Example usage:

    $ git clone https://github.com/jpgrayson/dot-files.git
    $ cd dot-files
    $ ./install.py

It works file by file and never clobbers anything it didn't put there,
so it is safe to re-run at any time:

- A missing dot file is symlinked into place.
- An existing dot file is replaced by a symlink only if its contents are
  identical to the repo's version; otherwise it is left untouched.
- An existing directory is descended into and its files linked
  individually, leaving any of your own files alongside them in place. A
  directory that is already a symlink is left as-is.
- An existing symlink that already points at the repo is left alone; a
  broken or unrelated symlink is reported and left untouched.
