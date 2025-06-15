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

; (package! cython-mode)

(package! meson-mode
  :recipe (:host github :repo "wentasah/meson-mode"))

(package! systemd)

(package! kdl-ts-mode :recipe (:host github :repo "merrickluo/kdl-ts-mode"))

;; (package! magit-stgit
;;   ;:recipe (:host github :repo "stacked-git/magit-stgit")
;;   :recipe (:local-repo "~/code/magit-stgit"
;;            :build (:not compile)))

(add-load-path! "~/code/magit-stgit")

; (use-package! magit-stgit
;   :after magit
;                                         ; :defer-incrementally t
;   )

;;; packages.el ends here
