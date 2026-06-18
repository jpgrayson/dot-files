;;; modules/term/ghostel/packages.el -*- lexical-binding: t; -*-

;; ghostel: terminal emulator powered by libghostty-vt.
;; The companion features (ghostel-comint, ghostel-compile, ghostel-eshell,
;; ghostel-ime) ship inside this package -- no separate install needed.
;; A prebuilt native module auto-downloads on first `M-x ghostel'.
(package! ghostel)

;; evil-ghostel is a separate MELPA package that bridges evil-mode and ghostel.
(package! evil-ghostel)
