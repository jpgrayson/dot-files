# vi:set et sw=4 ts=4:

fpath=("$HOME/.zsh.d" $fpath)

autoload -U compinit; compinit

if [ $SSH_CLIENT ]
then
    prompt_color=red
else
    prompt_color=cyan
fi

export PROMPT="%F{$prompt_color}@%f%m:%B%4~%b %F{$prompt_color}%(?..%B)%#%(?..%b)%f "

export EDITOR=vim

if [ "$(uname)" = "Darwin" ] ; then
    PATH=/opt/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
    export CLICOLOR=1
elif [ "$(uname -o)" = "Cygwin" ] ; then
    export CYGWIN="winsymlinks:nativestrict"
    alias ls='ls --color=auto'
else
    alias ls='ls --color=auto'

    my-font() {
        if [ -z $1 ]
        then
            local font="xft:DejaVu Sans Mono:pixelsize=12"
        else
            local font=$1
        fi

        if [ -z "$TMUX" ]
        then
            printf '\e]710;%s\007' "$font"
        else
            printf '\ePtmux;\e\e]710;%s\007\e\\' "$font"
        fi
    }
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
setopt completeinword
setopt numericglobsort

bindkey -e

autoload -U edit-command-line;
zle -N edit-command-line
bindkey "^X^E" edit-command-line
