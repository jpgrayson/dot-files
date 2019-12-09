;;; ~/.doom.d/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here

(setq
  doom-font (font-spec :family "Iosevka Term SS01" :size 14)
  doom-big-font (font-spec :family "Iosevka Term SS01" :size 24)
  doom-theme 'doom-one
  python-shell-interpreter "python3"
  markdown-command "markdown_py"
  )

(after! projectile
  (setq
   projectile-project-root-files-functions '(projectile-root-local
                                             projectile-root-top-down
                                             )
    ))

(after! company
  (setq
   company-idle-delay 0.5
   ))

(after! which-key
  (setq
   which-key-idle-delay 0.5
   which-key-idle-secondary-delay 0.3
   ))

(after! evil-matchit
  (setq
   evilmi-always-simple-jump t
   ))

(after! flycheck
  (setq
   flycheck-python-flake8-executable "flake8"
   flycheck-python-pycompile-executable "python3"
   ))

(map!
 :after evil
 :gi "C-u" #'doom/backward-kill-to-bol-and-indent
 :gi "C-w" #'evil-delete-backward-word
 :gi "C-b" #'evil-backward-char
 :gi "C-f" #'evil-forward-char
 )

(map!
 :after evil
 :map evil-ex-completion-map
 "C-b" #'backward-char
 "C-f" #'forward-char
 "C-d" #'delete-char
 "C-h" #'delete-backward-char
 )

(map!
 :after evil
 :map evil-insert-state-map
 "C-w" #'evil-delete-backward-word
 ;; "C-b" #'evil-backward-word-begin
 ;; "C-f" #'evil-forward-word-end
 )

(map!
 :after evil
 :map evil-motion-state-map
 "C-l" #'evil-ex-nohighlight
 )

(define-key! :keymaps +default-minibuffer-maps
  "C-b"    #'backward-char
)

(map!
 :after python
 :localleader
 :map python-mode-map
 (:prefix ("b" . "black")
   "b" #'python-black-buffer
   "r" #'python-black-region
   "s" #'python-black-statement
   "S" #'python-black-on-save-mode
   )
 )

(map!
 :map ein:notebook-mode-map
 :localleader
 "," #'+ein-hydra/body
 )

(map!
 :leader
 (:prefix-map ("t" . "toggle")
   :desc "Auto-revert mode" "r" #'global-auto-revert-mode
   )
 )
;;; config.el ends here
