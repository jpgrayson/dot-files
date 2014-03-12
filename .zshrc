# vi:set et sw=4 ts=4:

fpath=("$HOME/.zsh.d" $fpath)

autoload -U compinit; compinit

bindkey -e

if [ $SSH_CLIENT ]
then
    prompt_color=red
else
    prompt_color=cyan
fi
export PROMPT="%n%F{$prompt_color}@%f%m:%B%4~%b %F{$prompt_color}%(?..%B)%#%(?..%b)%f "

export EDITOR=vim

if [ "$(uname)" = "Darwin" ] ; then
    PATH=/opt/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
    MANPATH=~/opt/man:/opt/local/man:/usr/local/share/man:$MANPATH
    alias ls='ls -G'
    export VISUAL="mvim --cmd 'set lines=30 columns=80' -f"
else
    alias ls='ls --color=auto'
    alias gvim='gvim -geom=80x45'
    export VISUAL="gvim -geom=80x25 -f 2>/dev/null"
fi

if [ -d "/usr/local/heroku/bin" ] ; then
    export PATH="/usr/local/heroku/bin:$PATH"
fi

export PATH="$HOME/opt/bin:$PATH"

export PYTHONSTARTUP=~/.pythonstartup
export SCONSFLAGS="-Q"
export HISTSIZE=1024
export SAVEHIST=1020
export HIST_EXPIRE_DUPS_FIRST=1
export HIST_FIND_NO_DUPS=1
export ZLE_SPACE_SUFFIX_CHARS=$'&|'
export WORDCHARS=${WORDCHARS//\//}

setopt extendedglob
setopt histfindnodups
