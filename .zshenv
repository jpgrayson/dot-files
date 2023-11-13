# vi:set et sw=4 ts=4:

typeset -gU path

if [ "$(uname)" = "Darwin" ] ; then
    path[1,0]=/opt/homebrew/bin
    path[1,0]=/opt/homebrew/sbin
    # path[1,0]=/opt/homebrew/opt/coreutils/libexec/gnubin
    # path[1,0]=/opt/homebrew/opt/postgresql@13/bin

    export HOMEBREW_PREFIX="/opt/homebrew";
    export HOMEBREW_CELLAR="/opt/homebrew/Cellar";
    export HOMEBREW_REPOSITORY="/opt/homebrew";
    export MANPATH="/opt/homebrew/share/man${MANPATH+:$MANPATH}:";
    export INFOPATH="/opt/homebrew/share/info:${INFOPATH:-}";
fi

path[1,0]="$HOME/.cargo/bin"
path[1,0]="$HOME/.local/bin"
