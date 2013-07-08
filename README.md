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
repo.

For existing dot directories, `install.py` asks whether to replace the
existing dot directory with a symlink to the repo.
