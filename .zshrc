# vi:set et sw=4 ts=4:

typeset -gU cdpath fpath mailpath path

fpath=("$HOME/.zsh.d" "$HOME/.local/share/zsh/site-functions" $fpath)

if [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]
then
    source "${ZDOTDIR:-$HOME}/.zprezto/init.zsh"

    # Do not user prezto's partial-word and substring completions
    zstyle -d ':completion:*' matcher-list

    # Do not use approximations/corrections
    zstyle -d ':completion:*:approximate:*'
    zstyle ':completion:*' completer _complete _match

    export VIRTUAL_ENV_DISABLE_PROMPT=1

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
export VIRTUAL_ENV_DISABLE_PROMPT=1
#export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/ssh-agent.socket"
export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/gnupg/S.gpg-agent.ssh"

# source <(pip completion --zsh)

if command -v pyenv 1>/dev/null 2>&1; then
    export PYENV_VIRTUALENV_DISABLE_PROMPT=1

    eval "$(pyenv init -)"

    if command -v pyenv-virtualenv-init 1>/dev/null 2>&1; then
        eval "$(pyenv-virtualenv-init -)"
    fi

    if ! [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]
    then
        get-pyenv-version-name() {
            psvar[9]="$(pyenv version-name)"
        }

        add-zsh-hook precmd get-pyenv-version-name

        export PROMPT="(%9v) $PROMPT"
    fi
fi
