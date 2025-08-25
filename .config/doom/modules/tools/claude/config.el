;;; modules/tools/claude/config.el -*- lexical-binding: t; no-byte-compile: t; -*-

(use-package! claude-code-ide
  :config
  (claude-code-ide-emacs-tools-setup)
  (map! :leader :desc "Claude menu" ">" #'claude-code-ide-menu)
  (map! :leader
        (:prefix-map ("C" . "claude")
         :desc "Start Claude Code for the current project"         "C" #'claude-code-ide
         :desc "Switch to project’s Claude buffer"                 "b" #'claude-code-ide-switch-to-buffer
         :desc "Toggle visibility of Claude Code window"           "c" #'claude-code-ide-toggle
         :desc "Open transient menu with all Claude Code commands" "/" #'claude-code-ide-menu
         :desc "Send prompt to Claude from minibuffer input"       "." #'claude-code-ide-send-prompt
         :desc "Continue most recent conversation in directory"    "r" #'claude-code-ide-continue
         :desc "Resume Claude Code with previous conversation"     "R" #'claude-code-ide-resume
         :desc "Stop Claude Code for the current project"          "q" #'claude-code-ide-stop
         :desc "List all active Claude Code sessions and switch"   "l" #'claude-code-ide-list-sessions
         :desc "Check if Claude Code CLI is installed and working" "s" #'claude-code-ide-check-status
         :desc "Send selected text to Claude prompt"               "i" #'claude-code-ide-insert-at-mentioned
         :desc "Send escape key to Claude terminal"                "C-c" #'claude-code-ide-send-escape
         :desc "Insert newline in Claude prompt (sends \ + Enter)" "RET" #'claude-code-ide-insert-newline
         :desc "Show the debug buffer with WebSocket messages"     "d" #'claude-code-ide-show-debug
         :desc "Clear the debug buffer"                            "D" #'claude-code-ide-clear-debug)))
