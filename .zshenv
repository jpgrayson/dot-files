# vi:set et sw=4 ts=4:

if [ "$(uname)" = "Darwin" ] ; then
    path=(
      /usr/local/bin
      /usr/local/sbin
      /opt/local/bin
      /opt/local/sbin
      /opt/local/libexec/gnubin
      /usr/bin
      /bin
      /usr/sbin
      /sbin
    )
fi

path[1,0]="$HOME/.cargo/bin"
path[1,0]="$(python -m site --user-base)/bin"
path[1,0]="$HOME/.local/bin"
