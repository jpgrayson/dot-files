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
export VISUAL="gvim -geom=80x25 -f 2>/dev/null"
export PATH=$PATH:/sbin:/usr/sbin:~/bin:~/opt/bin:/usr/local/bin
if [ "$(uname)" = "Darwin" ] ; then
    PATH=/opt/local/bin:$PATH
    MANPATH=/opt/local/man:$MANPATH
fi
if [ -d "/usr/local/heroku/bin" ] ; then
    export PATH="/usr/local/heroku/bin:$PATH"
fi

export PYTHONSTARTUP=~/.pythonstartup
export HISTSIZE=1024
export SAVEHIST=1020
export HIST_EXPIRE_DUPS_FIRST=1
export HIST_FIND_NO_DUPS=1
export ZLE_SPACE_SUFFIX_CHARS=$'&|'
export WORDCHARS=${WORDCHARS//\//}

setopt extendedglob
setopt histfindnodups

alias ls='ls --color=auto'
### alias gvim='gvim -geom=80x45 2>/dev/null'
alias gvim='gvim -geom=80x45'
