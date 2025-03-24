# vi:set et sw=4 ts=4:

typeset -gU cdpath fpath mailpath path

if [ -n "$HOMEBREW_PREFIX" ] && [ -d "$HOMEBREW_PREFIX/share/zsh" ]; then
    fpath=(
        "$HOMEBREW_PREFIX/share/zsh/site-functions"
        "$HOMEBREW_PREFIX/share/zsh/functions"
        $fpath
    )
fi

if [ -d "$HOME/code/zsh" ]; then
    fpath=(
        "$HOME/code/zsh/Functions/VCS_Info"
        "$HOME/code/zsh/Functions/VCS_Info/Backends"
        $fpath
    )
fi

fpath=(
    "$HOME/.zsh.d"
    "$HOME/.local/share/zsh/site-functions"
    $fpath
)

if [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]
then
    source "${ZDOTDIR:-$HOME}/.zprezto/init.zsh"

    # Do not user prezto's partial-word and substring completions
    zstyle -d ':completion:*' matcher-list

    # Do not use approximations/corrections
    zstyle -d ':completion:*:approximate:*'
    zstyle ':completion:*' completer _complete _match

    export VIRTUAL_ENV_DISABLE_PROMPT=1

    prompt jpgrayson

    zstyle ':vcs_info:*' enable git hg
    zstyle ':vcs_info:*' check-for-changes true
    zstyle ':vcs_info:*' get-unapplied true
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

    bindkey -e

    autoload -Uz edit-command-line
    zle -N edit-command-line
    bindkey "^X^E" edit-command-line
fi

export ZLE_SPACE_SUFFIX_CHARS=$'&|'

setopt numericglobsort

if [ -n "$INSIDE_EMACS" ]; then
    export EDITOR=emacsclient
    export JJ_EDITOR=emacsclient
else
    export EDITOR=nvim
fi
export PYTHONBREAKPOINT=pudb.set_trace
export PYTHONSTARTUP=~/.pythonstartup
export VIRTUAL_ENV_DISABLE_PROMPT=1
export RIPGREP_CONFIG_PATH=~/.config/ripgrep/ripgreprc
#export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/ssh-agent.socket"
export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/gnupg/S.gpg-agent.ssh"
export GPG_TTY=$(tty)

# source <(pip completion --zsh)

if command -v bat 1>/dev/null; then
    # export MANPAGER="sh -c 'col -bx | bat --language=man --style=plain --paging=always'"
    unset LESS_TERMCAP_mb
    unset LESS_TERMCAP_md
    unset LESS_TERMCAP_me
    unset LESS_TERMCAP_se
    unset LESS_TERMCAP_so
    unset LESS_TERMCAP_ue
    unset LESS_TERMCAP_us
fi

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

osc-133-prompt-marker() {
    print -Pn "\e]133;A\e\\"
}

add-zsh-hook precmd osc-133-prompt-marker

function osc7 {
    local LC_ALL=C
    export LC_ALL

    setopt localoptions extendedglob
    input=( ${(s::)PWD} )
    uri=${(j::)input/(#b)([^A-Za-z0-9_.\!~*\'\(\)-\/])/%${(l:2::0:)$(([##16]#match))}}
    print -n "\e]7;file://${HOSTNAME}${uri}\e\\"
}
add-zsh-hook -Uz chpwd osc7
