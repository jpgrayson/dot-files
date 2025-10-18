;;; modules/tools/agent-shell/config.el -*- lexical-binding: t; no-byte-compile: t; -*-

(use-package! acp)
(use-package! agent-shell
  :config
  (setq agent-shell-show-welcome-message nil)
  ;; Global key bindings (SPC A prefix) - available from any buffer
  (map! :leader
        (:prefix-map ("A" . "agent-shell")
         :desc "Start/switch to agent shell"                    "A" #'agent-shell
         :desc "Send current file"                              "f" #'agent-shell-send-current-file
         :desc "Send current file"                              "F" #'agent-shell-send-other-file
         :desc "Agent shell help menu"                          "h" #'agent-shell-help-menu
         :desc "Add region to agent shell"                      "r" #'agent-shell-add-region
         :desc "Toggle agent shell visibility"                  "t" #'agent-shell-toggle
         :desc "Toggle logging"                                 "T" #'agent-shell-toggle-logging

         ;; Start specific agents (SPC A s prefix)
         (:prefix ("s" . "start agent")
          :desc "Start Claude Code"                             "c" #'agent-shell-anthropic-start-claude-code
          :desc "Start Gemini"                                  "g" #'agent-shell-google-start-gemini
          :desc "Start Goose"                                   "o" #'agent-shell-goose-start-agent
          :desc "Start Codex (OpenAI)"                          "x" #'agent-shell-openai-start-codex
          :desc "Start OpenCode"                                "O" #'agent-shell-opencode-start-agent
          :desc "Start Qwen"                                    "q" #'agent-shell-qwen-start)
         ;; Debugging/logging (SPC A d prefix)
         (:prefix ("d" . "debug")
          
          )))

  ;; Local leader key bindings (SPC m prefix) - only in agent-shell buffers
  (map! :map agent-shell-mode-map
        :localleader
        :desc "Agent shell help menu"                          "?" #'agent-shell-help-menu
        :desc "Insert shell command output"                    "!" #'agent-shell-insert-shell-command-output
        :desc "Cycle session mode"                             "m" #'agent-shell-cycle-session-mode
        :desc "Set session mode"                               "M" #'agent-shell-set-session-mode
        :desc "Clear buffer"                                   "C" #'agent-shell-clear-buffer
        :desc "Interrupt agent"                                "c" #'agent-shell-interrupt
        :desc "Delete interaction"                             "d" #'agent-shell-delete-interaction-at-point
        :desc "Search history"                                 "/" #'agent-shell-search-history
        :desc "Insert file"                                    "f" #'agent-shell-insert-file
        :desc "New shell"                                      "n" #'agent-shell-new-shell
        :desc "Jump to permission row"                         "p" #'agent-shell-jump-to-latest-permission-button-row
        :desc "Rename buffer"                                  "R" #'agent-shell-rename-buffer
        :desc "Toggle completion"                              "t" #'agent-shell-completion-mode
        (:prefix ("L" . "logging")
         :desc "View ACP logs"                                 "l" #'agent-shell-view-acp-logs
         :desc "Reset logs"                                    "r" #'agent-shell-reset-logs
         :desc "Toggle logging"                                "t" #'agent-shell-toggle-logging
         :desc "View traffic"                                  "v" #'agent-shell-view-traffic)
        (:prefix ("T" . "transcript")
         :desc "Save transcript"                               "s" #'agent-shell-save-session-transcript
         :desc "Restore transcript"                            "r" #'agent-shell-restore-session-from-transcript))

  ;; Insert mode key bindings (C-c prefix) - in agent-shell buffers
  (map! :map agent-shell-mode-map
        :i "C-c C-c" #'agent-shell-interrupt
        :i "C-c f"   #'agent-shell-insert-file
        :i "C-c !"   #'agent-shell-insert-shell-command-output))
