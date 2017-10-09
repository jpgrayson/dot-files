;; -*- mode: emacs-lisp -*-

(defun dotspacemacs/layers ()
  (setq-default
   dotspacemacs-distribution 'spacemacs
   dotspacemacs-enable-lazy-installation 'unused
   dotspacemacs-ask-for-lazy-installation t
   dotspacemacs-configuration-layer-path '()
   dotspacemacs-configuration-layers
   '(
     ;; helm
     ivy

     ;; auto-completion
     better-defaults
     cscope
     git
     (ibuffer :variables
              ibuffer-group-buffers-by 'projects)
     org
     semantic
     (shell :variables
            shell-default-height 30
            shell-default-position 'bottom)
     ;; spell-checking
     (stgit :location local)
     syntax-checking
     version-control
     ;; vim-powerline
     vimscript
     vinegar

     ;; Languages
     c-c++
     emacs-lisp
     ipython-notebook
     latex
     markdown
     plantuml
     (python :variables
             python-fill-column 79
             python-test-runner 'pytest)
     restructuredtext
     rust
     yaml
     )
   dotspacemacs-additional-packages '()
   dotspacemacs-frozen-packages '()
   dotspacemacs-excluded-packages '(evil-escape evil-tutor)
   dotspacemacs-install-packages 'used-only))

(defun dotspacemacs/init ()
  (setq-default
   dotspacemacs-elpa-https t
   dotspacemacs-elpa-timeout 5
   dotspacemacs-check-for-update nil
   dotspacemacs-elpa-subdirectory nil
   dotspacemacs-editing-style 'vim
   dotspacemacs-verbose-loading nil
   dotspacemacs-startup-banner 'official
   dotspacemacs-startup-lists '((projects . 5)
                                (recents . 5))
   dotspacemacs-startup-buffer-responsive t
   dotspacemacs-scratch-mode 'text-mode
   dotspacemacs-themes '(solarized-dark
                         spacemacs-dark
                         spacemacs-light)
   dotspacemacs-colorize-cursor-according-to-state t
   dotspacemacs-default-font
   '(("Iosevka"         :size 26 :weight medium :width normal :powerline-scale 1.1)
     ("Source Code Pro" :size 12 :weight normal :width normal :powerline-scale 1.1))
   dotspacemacs-leader-key "SPC"
   dotspacemacs-emacs-command-key "SPC"
   dotspacemacs-ex-command-key ":"
   dotspacemacs-emacs-leader-key "M-m"
   dotspacemacs-major-mode-leader-key ","
   dotspacemacs-major-mode-emacs-leader-key "C-M-m"
   dotspacemacs-distinguish-gui-tab nil
   dotspacemacs-remap-Y-to-y$ nil
   dotspacemacs-retain-visual-state-on-shift t
   dotspacemacs-visual-line-move-text nil
   dotspacemacs-ex-substitute-global nil
   dotspacemacs-default-layout-name "Default"
   dotspacemacs-display-default-layout t
   dotspacemacs-auto-resume-layouts t
   dotspacemacs-auto-generate-layout-names t
   dotspacemacs-large-file-size 1
   dotspacemacs-auto-save-file-location 'cache
   dotspacemacs-max-rollback-slots 5
   dotspacemacs-helm-resize nil
   dotspacemacs-helm-no-header nil
   dotspacemacs-helm-position 'bottom
   dotspacemacs-helm-use-fuzzy 'always
   dotspacemacs-enable-paste-transient-state nil
   dotspacemacs-which-key-delay 0.4
   dotspacemacs-which-key-position 'bottom
   dotspacemacs-switch-to-buffer-prefers-purpose nil
   dotspacemacs-loading-progress-bar t
   dotspacemacs-fullscreen-at-startup nil
   dotspacemacs-fullscreen-use-non-native nil
   dotspacemacs-maximized-at-startup nil
   dotspacemacs-active-transparency 90
   dotspacemacs-inactive-transparency 90
   dotspacemacs-show-transient-state-title t
   dotspacemacs-show-transient-state-color-guide t
   dotspacemacs-mode-line-unicode-symbols t
   dotspacemacs-smooth-scrolling t
   dotspacemacs-line-numbers '(:relative nil
                               :disabled-for-modes dired-mode
                                                   doc-view-mode
                                                   markdown-mode
                                                   org-mode
                                                   pdf-view-mode
                                                   text-mode
                               :size-limit-kb 1000)
   dotspacemacs-folding-method 'evil
   dotspacemacs-smartparens-strict-mode nil
   dotspacemacs-smart-closing-parenthesis nil
   dotspacemacs-highlight-delimiters 'all
   dotspacemacs-persistent-server nil
   dotspacemacs-search-tools '("rg" "ag" "pt" "ack" "grep")
   dotspacemacs-default-package-repository nil
   dotspacemacs-frame-title-format "%t %b (%m)"
   dotspacemacs-icon-title-format nil
   dotspacemacs-whitespace-cleanup nil
   dotspacemacs-zone-out-when-idle nil
   dotspacemacs-pretty-docs nil
   ))

(defun dotspacemacs/user-init ()
  (setq solarized-distinct-fringe-background t)
  (setq solarized-use-more-italic t)
  (setq solarized-high-contrast-mode-line nil)
  )

(defun dotspacemacs/user-config ()
  (spacemacs/toggle-highlight-current-line-globally-off)
  (remove-hook 'prog-mode-hook #'smartparens-mode)
  (setq create-lockfiles nil)
  (setq evil-magit-want-horizontal-movement t)
  (setq evilmi-always-simple-jump t)
  (setq powerline-default-separator 'arrow-fade)
  (setq evil-search-module 'evil-search)
  (setq-default evil-symbol-word-search t)
  (setq neo-theme 'arrow)
  (setq magit-revision-show-gravatars nil)
  (setq ein:slice-image t)
  (setq fci-rule-color "#073642")
  (define-key evil-motion-state-map (kbd "C-w C-h") 'evil-window-left)
  (define-key evil-motion-state-map (kbd "C-w C-l") 'evil-window-right)
  (define-key evil-motion-state-map (kbd "C-w C-j") 'evil-window-down)
  (define-key evil-motion-state-map (kbd "C-w C-k") 'evil-window-up)
  (define-key evil-normal-state-map (kbd "C-l")
    'spacemacs/evil-search-clear-highlight)
  (define-key evil-normal-state-map (kbd "C-p") 'counsel-projectile-find-file)
  (add-to-list 'auto-mode-alist '("\\.uml\\'" . plantuml-mode))
  )

;; -------------------------------------------------------------------

;; Do not write anything past this comment. This is where Emacs will
;; auto-generate custom variable definitions.
(defun dotspacemacs/emacs-custom-settings ()
  "Emacs custom settings.
This is an auto-generated function, do not modify its content directly, use
Emacs customize menu instead.
This function is called at the very end of Spacemacs initialization."
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(evil-want-Y-yank-to-eol nil)
 '(package-selected-packages
   (quote
    (counsel evil flycheck helm projectile org-plus-contrib magit magit-popup git-commit dash powerline ivy xcscope realgud test-simple loc-changes load-relative disaster cmake-mode cmake-ide levenshtein clang-format auctex-latexmk auctex stickyfunc-enhance srefactor helm-themes helm-swoop helm-purpose helm-projectile helm-mode-manager helm-flx helm-descbinds helm-ag evil-tutor evil-escape ace-jump-helm-line yapfify yaml-mode xterm-color ws-butler winum which-key wgrep volatile-highlights vimrc-mode vi-tilde-fringe uuidgen use-package unfill toml-mode toc-org symon string-inflection spaceline solarized-theme smex smeargle shell-pop restart-emacs rainbow-delimiters racer pyvenv pytest pyenv-mode py-isort popwin plantuml-mode pip-requirements persp-mode pcre2el password-generator paradox orgit org-projectile org-present org-pomodoro org-download org-bullets org-brain open-junk-file neotree mwim multi-term move-text mmm-mode markdown-toc magit-gitflow macrostep lorem-ipsum live-py-mode linum-relative link-hint ivy-purpose ivy-hydra info+ indent-guide ibuffer-projectile hy-mode hungry-delete htmlize hl-todo highlight-parentheses highlight-numbers highlight-indentation hide-comnt help-fns+ helm-make google-translate golden-ratio gnuplot gitignore-mode gitconfig-mode gitattributes-mode git-timemachine git-messenger git-link git-gutter-fringe git-gutter-fringe+ gh-md flycheck-rust flycheck-pos-tip flx-ido fill-column-indicator fancy-battery eyebrowse expand-region exec-path-from-shell evil-visualstar evil-visual-mark-mode evil-unimpaired evil-surround evil-search-highlight-persist evil-org evil-numbers evil-nerd-commenter evil-mc evil-matchit evil-magit evil-lisp-state evil-lion evil-indent-plus evil-iedit-state evil-exchange evil-ediff evil-args evil-anzu eval-sexp-fu eshell-z eshell-prompt-extras esh-help elisp-slime-nav ein editorconfig dumb-jump diff-hl define-word dactyl-mode cython-mode counsel-projectile column-enforce-mode clean-aindent-mode cargo browse-at-remote auto-highlight-symbol auto-compile anaconda-mode aggressive-indent adaptive-wrap ace-window ace-link)))
 '(safe-local-variable-values
   (quote
    ((eval when
           (fboundp
            (quote rainbow-mode))
           (rainbow-mode 1))))))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
)
