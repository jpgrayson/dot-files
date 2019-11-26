;; -*- no-byte-compile: t; -*-
;;; ~/.doom.d/packages.el

;;; Examples:
;; (package! some-package)
;; (package! another-package :recipe (:fetcher github :repo "username/repo"))
;; (package! builtin-package :disable t)

;; (package! stgit
;;   :recipe (:host file :path "~/code/stgit/contrib/stgit.el"))

(package! python-black
  :recipe (:host github :repo "wbolster/emacs-python-black"))

;;; packages.el ends here
