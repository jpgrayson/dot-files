# vi:set et sw=4 ts=4:

# Arch sets PATH in /etc/profile which blows-away an PATH set in .zshenv.
#
# https://wiki.archlinux.org/index.php/Zsh#Configuration_files

if [ "$(uname)" = "Darwin" ] ; then
    PATH=/opt/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
fi
export PATH="$HOME/opt/bin:$PATH"

