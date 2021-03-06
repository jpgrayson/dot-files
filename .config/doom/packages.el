;; -*- no-byte-compile: t; -*-
;;; ~/.doom.d/packages.el

;;; Examples:
;; (package! some-package)
;; (package! another-package :recipe (:fetcher github :repo "username/repo"))
;; (package! builtin-package :disable t)

;; (package! stgit
;;   :recipe (:local-repo "~/code/stgit"
;;            :files ("/contrib/stgit.el")))

(disable-packages!
  anaconda-mode
  nose
  pipenv
  conda
  poetry
  )

(package! python-black
  :recipe (:host github :repo "wbolster/emacs-python-black"))

(package! cython-mode)

;;; packages.el ends here
