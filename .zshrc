# vi:set et sw=4 ts=4:

fpath=("$HOME/.zsh.d" $fpath)

autoload -Uz compinit
compinit

PROMPT=""
if [ -n "${SSH_CLIENT:-}" ]; then
    PROMPT="%F{red}@%f%m:"
fi
PROMPT+="%B%4~%b %F{cyan}%(?.%#.%B%#%b)%f "
export PROMPT

export EDITOR=nvim

if [ "$(uname)" = "Darwin" ] ; then
    if ( ls --color=auto /dev/null 2>/dev/null 1>/dev/null); then
        alias ls='ls --color=auto'
    fi
    export CLICOLOR=1
elif [ "$(uname -o)" = "Cygwin" ] ; then
    export CYGWIN="winsymlinks:nativestrict"
    alias ls='ls --color=auto'
else
    alias ls='ls --color=auto'
fi

export PYTHONSTARTUP=~/.pythonstartup
export PYTHONBREAKPOINT=pudb.set_trace
export SCONSFLAGS="-Q"
export HISTSIZE=1024
export SAVEHIST=1020
export HIST_EXPIRE_DUPS_FIRST=1
export HIST_FIND_NO_DUPS=1
export ZLE_SPACE_SUFFIX_CHARS=$'&|'
export WORDCHARS=${WORDCHARS//\//}

setopt extendedglob
setopt histfindnodups
setopt completeinword
setopt numericglobsort

bindkey -e

autoload -Uz edit-command-line
zle -N edit-command-line
bindkey "^X^E" edit-command-line

# source <(pip completion --zsh)
