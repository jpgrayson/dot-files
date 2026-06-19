# dot-files

These are jpgrayson's dot files. They are meant to be portable to Linux
and Mac OS X.

## Installation

The `install.py` script cautiously creates symlinks from the repo to
`$HOME`. Example usage:

    $ git clone https://github.com/jpgrayson/dot-files.git
    $ cd dot-files
    $ ./install.py

For already existing dot files, they will only be replaced by symlinks
if their contents are identical to the corresponding dot file in the
repo. Otherwise they are left untouched.

For existing dot directories, `install.py` descends into them and links
individual files, leaving any of your own files alongside the linked
ones in place. A directory that is already a symlink is left as-is.
