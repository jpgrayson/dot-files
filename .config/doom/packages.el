;; -*- no-byte-compile: t; -*-
;;; ~/.doom.d/packages.el

;;; Examples:
;; (package! some-package)
;; (package! another-package :recipe (:fetcher github :repo "username/repo"))
;; (package! builtin-package :disable t)

(package! exec-path-from-shell)

;;(package! emacs-doom-themes
;;  :recipe (:fetcher file :path "~/code/emacs-doom-themes"))

(package! stgit
  :recipe (:fetcher file :path "~/code/stgit/contrib/stgit.el"))

(package! python-black
  :recipe (:fetcher github :repo "wbolster/emacs-python-black"))

;;; packages.el ends here
