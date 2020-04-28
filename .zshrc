# vi:set et sw=4 ts=4:

typeset -gU cdpath fpath mailpath path

fpath=("$HOME/.zsh.d" $fpath)

if [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]
then
    source "${ZDOTDIR:-$HOME}/.zprezto/init.zsh"

    # Do not user prezto's partial-word and substring completions
    zstyle -d ':completion:*' matcher-list

    # Do not use approximations/corrections
    zstyle -d ':completion:*:approximate:*'
    zstyle ':completion:*' completer _complete _match

    prompt sorin
else
    autoload -Uz compinit
    compinit

    PROMPT=""
    if [ -n "${SSH_CLIENT:-}" ]; then
        PROMPT="%F{red}@%f%m:"
    fi
    PROMPT+="%B%4~%b %F{cyan}%(?.%#.%B%#%b)%f "
    export PROMPT

    setopt completeinword
    setopt extendedglob
    setopt histfindnodups

    export HISTSIZE=1024
    export SAVEHIST=1020
    export WORDCHARS=${WORDCHARS//\//}
    export ZLE_SPACE_SUFFIX_CHARS=$'&|'

    bindkey -e

    autoload -Uz edit-command-line
    zle -N edit-command-line
    bindkey "^X^E" edit-command-line
fi

setopt numericglobsort

export EDITOR=nvim
export PYTHONBREAKPOINT=pudb.set_trace
export PYTHONSTARTUP=~/.pythonstartup

# source <(pip completion --zsh)
