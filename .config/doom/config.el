;;; ~/.doom.d/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here

(setq
  ;; doom-font (font-spec :family "Iosevka Fixed SS08" :size 14)
  ;; doom-big-font (font-spec :family "Iosevka Fixed SS08" :size 24)
  doom-font (font-spec :family "Iosevka Term Nerd Font" :size 14)
  doom-big-font (font-spec :family "Iosevka Term Nerd Font" :size 24)
  doom-theme 'doom-one
  ;enable-local-variables t
  org-directory "~/org"
  org-journal-file-type 'weekly
  python-shell-interpreter "python3"
  rustic-lsp-server 'rust-analyzer
  markdown-command "markdown_py"
  projectile-enable-caching (not (executable-find doom-projectile-fd-binary))
  projectile-project-search-path '("~/code")
  read-process-output-max 8192
  case-replace nil
  case-fold-search nil
  ;; delete-window-choose-selected 'pos ;; default is 'mru
  )

(setq-default display-fill-column-indicator-character 9482)

(add-to-list 'auto-mode-alist '("\\.uml\\'" . plantuml-mode))

(add-hook 'diff-mode-hook (lambda() (set-fill-column 72)))
(add-hook 'swift-mode-hook (lambda() (set-fill-column 100)))

(after! corfu
  (setq corfu-auto nil
        corfu-preselect 'valid))

(after! company
  (setq company-idle-delay nil))

(after! dabbrev
  (setq dabbrev-case-fold-search nil))

(after! which-key
  (setq which-key-idle-delay 0.5
        which-key-idle-secondary-delay 0.3))

(after! evil-matchit
  (setq evilmi-always-simple-jump t))

(after! evil-snipe
  (setq evil-snipe-skip-leading-whitespace nil))

(after! flycheck
  (setq flycheck-python-flake8-executable "flake8"
        flycheck-python-pycompile-executable "python3"))

; (after! vterm
;   (advice-add #'vterm-redraw :after (lambda (&rest args) (evil-refresh-cursor evil-state))))

(after! magit
  (let ((width 150))
    (set-popup-rules!
      `(("^ ?\\*jj"
         :slot 2 :vslot 1 :width ,width :height '+popup-shrink-to-fit :autosave t :quit t :ttl nil :side right)))))

(after! vterm
  (let ((width 150))
    (set-popup-rules!
      `(("^\\*doom:\\(?:v?term\\|e?shell\\)-popup"
         :slot 3 :vslot 1 :width ,width :select t :modeline nil :quit nil :ttl nil :side right)))))

; (after! lsp-python-ms
;   (set-lsp-priority! 'mspyls 1))

(after! lsp-ui
  (setq lsp-ui-doc-enable nil
        lsp-enable-snippet nil)
  (add-to-list 'lsp-file-watch-ignored-directories "[/\\\\]\\.jj\\'"))

(after! swift-mode
  (setq swift-mode:parenthesized-expression-offset 4
        swift-mode:multiline-statement-offset 4
        swift-mode:switch-case-offset 4))

(defvar jj-mode-fontlock-keywords '(
    ("^JJ: " (0 'font-lock-comment-delimiter-face)
             ("    \\(M\\) .*" nil nil (1 'font-lock-variable-name-face))
             ("    \\(A\\) .*" nil nil (1 'font-lock-string-face))
             ("    \\(D\\) .*" nil nil (1 'font-lock-warning-face))
             (".*"       nil nil (0 'font-lock-comment-face)))
    ;; ("^\\(feat\\|fix\\|build\\|chore\\|ci\\|docs\\|style\\|refactor\\|perf\\|test\\)\\(([[:word:]]+)\\)?\\(!\\)?:\\(.*\\)" . 'font-lock-variable-name-face)
    ("^\\(feat\\|fix\\|build\\|chore\\|ci\\|docs\\|style\\|refactor\\|perf\\|test\\)\\(([[:word:]]+)\\)?\\(!\\)?:" .
     '((1 'font-lock-keyword-face nil t)
       (2 'font-lock-constant-face nil t)
       (3 'font-lock-warning-face nil t)))
    ("^\\(wip\\)\\(([[:word:]]+)\\)?\\(!\\)?:" .
     '((1 'font-lock-warning-face nil t)
       (2 'font-lock-constant-face nil t)
       (3 'font-lock-warning-face nil t)))
))

(define-derived-mode jj-mode
  text-mode
  "jj"
  (setq-local font-lock-defaults '(jj-mode-fontlock-keywords))
  "Major mode for editing jj descriptions.")

(defconst my-with-editor-regexp "\\(\.jjdescription\\|\.stgit-edit\\(\.txt\\|\.patch\\)\\)$")

(defun my-with-editor-check-buffer ()
  (when (and buffer-file-name
             (string-match-p my-with-editor-regexp buffer-file-name))
    (progn
      (setq! fill-column 72)
      (unless with-editor-mode
        (with-editor-mode 1))
      (jj-mode))))

(add-hook 'find-file-hook #'my-with-editor-check-buffer)

(map!
 :after evil
 :gi "C-u" #'doom/backward-kill-to-bol-and-indent
 :gi "C-w" #'evil-delete-backward-word
 :gi "C-b" #'evil-backward-char
 :gi "C-f" #'evil-forward-char)

(map!
 :after evil
 :map evil-ex-completion-map
 "C-b" #'backward-char
 "C-f" #'forward-char
 "C-d" #'delete-char
 "C-h" #'delete-backward-char)

(map!
 :after evil
 :map evil-insert-state-map
 "C-w" #'evil-delete-backward-word)

(map!
 :after evil
 :map evil-motion-state-map
 "C-l" #'evil-ex-nohighlight)

(define-key! :keymaps +default-minibuffer-maps
  "C-b" #'backward-char)

(map!
 :after python
 :localleader
 :map python-mode-map
 (:prefix ("b" . "black")
   "b" #'python-black-buffer
   "r" #'python-black-region
   "s" #'python-black-statement
   "S" #'python-black-on-save-mode))

;; (map!
;;  :leader
;;  (:prefix-map ("t" . "toggle")
;;    :desc "Auto-revert mode" "r" #'global-auto-revert-mode
;;    )
;;  )

(map!
 :leader
 (:prefix "p"
  :desc "Display project info" "I" #'projectile-project-info))

;; (map!
;;  :leader
;;  (:prefix "g"
;;   :desc "StGit dispatch" "_" #'magit-stgit-dispatch))

;; (use-package! magit-stgit)

;; (after! (:and magit magit-stgit)
;;   (transient-append-suffix 'magit-dispatch "Z"
;;     '("/" "StGit" magit-stgit)))
;;; config.el ends here
