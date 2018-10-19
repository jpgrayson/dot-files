# vi:set et sw=4 ts=4:

fpath=("$HOME/.zsh.d" $fpath)

autoload -Uz compinit
compinit

if [ $SSH_CLIENT ]
then
    prompt_color=red
else
    prompt_color=cyan
fi

export PROMPT="%F{$prompt_color}@%f%m:%B%4~%b %F{$prompt_color}%(?..%B)%#%(?..%b)%f "

export EDITOR=nvim

if [ "$(uname)" = "Darwin" ] ; then
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
