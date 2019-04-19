;;; ~/.doom.d/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here

(when (memq window-system '(mac ns x))
  (exec-path-from-shell-initialize))

(setq
  doom-font (font-spec :family "Iosevka Term SS01" :size 14)
  doom-big-font (font-spec :family "Iosevka Term SS01" :size 24)
  doom-theme 'doom-sourcerer
  flycheck-python-flake8-executable "python3"
  python-shell-interpreter "python3"
  which-key-idle-delay 0.5
  which-key-idle-secondary-delay 0.2
  evilmi-always-simple-jump t
  )
