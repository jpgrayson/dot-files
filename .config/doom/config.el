;;; ~/.doom.d/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here

(when (memq window-system '(mac ns x))
  (exec-path-from-shell-initialize))

(setq
  doom-font (font-spec :family "Iosevka Term SS01" :size 14)
  doom-big-font (font-spec :family "Iosevka Term SS01" :size 24)
  doom-theme 'doom-one
  python-shell-interpreter "python3"
  markdown-command "markdown_py"
  )

(after! company
  (setq
   company-idle-delay 0.5
   ))

(after! which-key
  (setq
   which-key-idle-delay 0.3
   which-key-idle-secondary-delay 0.1
   ))

(after! evilmi
  (setq
   evilmi-always-simple-jump t
  ))

(after! flycheck
  (setq
   flycheck-python-flake8-executable "python3"
   ))
