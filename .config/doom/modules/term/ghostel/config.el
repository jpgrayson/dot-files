;;; modules/term/ghostel/config.el -*- lexical-binding: t; no-byte-compile: t; -*-

(use-package! ghostel
  :commands (ghostel ghostel-project)
  :config
  ;; Drop ghostel into the same right-side popup as the vterm/eshell popups.
  (let ((width 150))
    (set-popup-rules!
      `(("^\\*ghostel"
         :slot 3 :vslot 1 :width ,width :select t :modeline nil :quit nil :ttl nil :side right))))

  ;; comint companion: route shell/REPL output through libghostty-vt instead of
  ;; ansi-color -> OSC 8 hyperlinks, OSC 7 dir tracking, colored/curly underlines.
  (when (fboundp 'ghostel-comint-global-mode)
    (ghostel-comint-global-mode +1)))

;; evil parity layer: ESC -> normal state snaps to the terminal cursor, i/a/I/A
;; sync the cursor before insert, d/c/r/p/u map to shell equivalents, and the
;; cursor shape follows evil state.
(use-package! evil-ghostel
  :after (ghostel evil)
  :hook (ghostel-mode . evil-ghostel-mode))

;; compile companion: run compile-style commands in a ghostel buffer with
;; `compilation-mode' error navigation + true color + clickable file:line.
;; `SPC c g' = ghostel-compile (read-only, uses `compile-command'; `C-u' prompts
;; and runs in an interactive/writable buffer); `SPC c G' = ghostel-recompile.
;; In the result buffer (`ghostel-compile-view-mode'): n/p next/prev error,
;; g recompile; live mode switch via C-c C-j / C-c C-e / C-c C-t.
(use-package! ghostel-compile
  :commands (ghostel-compile ghostel-recompile ghostel-compile-global-mode))

;; Opt-in: reroute *all* `compile' / `recompile' / `project-compile' through
;; ghostel.  Enable once trusted -- it intercepts the compile workflow your
;; lang/LSP modes drive.
;; (add-hook 'doom-after-init-hook #'ghostel-compile-global-mode)

;; vterm-style entry points.  Doom binds `SPC o t' -> `+vterm/toggle' (summon/
;; dismiss a project-rooted popup) and `SPC o T' -> `+vterm/here' (terminal in
;; the current window).  Mirror that UX for ghostel; the popup itself is the
;; `^\\*ghostel' rule set above.
(defun +ghostel/toggle (arg)
  "Toggle a dedicated ghostel popup terminal, mirroring `+vterm/toggle'.
Summons (or dismisses) a single, persp-scoped popup terminal rooted at the
project -- without touching any other ghostel buffers.  The buffer is named to
match the `^\\*ghostel' popup rule so it opens in the side popup rather than
replacing the current window.  With prefix ARG, recreate it in
`default-directory'."
  (interactive "P")
  (let* ((name (format "*ghostel-popup:%s*"
                       (if (bound-and-true-p persp-mode)
                           (safe-persp-name (get-current-persp))
                         "main")))
         (default-directory (if arg
                                default-directory
                              (or (doom-project-root) default-directory))))
    (when arg
      (when-let* ((buf (get-buffer name)))
        (kill-buffer buf)))
    (if-let* ((win (and (not arg) (get-buffer-window name))))
        ;; Visible -> dismiss its window (guard against it being the sole one).
        (when (> (count-windows) 1)
          (delete-window win))
      ;; Hidden/absent -> open or reuse the dedicated popup buffer.  `require'
      ;; ghostel first so its `ghostel-buffer-name' defcustom marks the symbol
      ;; special *before* we let-bind it -- otherwise this lexical-binding file
      ;; binds it lexically and loading the defcustom errors ("already lexical").
      (progn
        (require 'ghostel)
        (let ((ghostel-buffer-name name))
          (ghostel))))))

(defun +ghostel/here (arg)
  "Open a ghostel terminal in the current window, mirroring `+vterm/here'.
Runs at the project root by default; with prefix ARG, in `default-directory'."
  (interactive "P")
  (let ((default-directory (if arg default-directory
                             (or (doom-project-root) default-directory)))
        (display-buffer-alist nil))   ; bypass the popup rule -> current window
    (ghostel)))

;; Leader keys.  Doom's `:config default' module owns the SPC o ("open") prefix
;; and binds it via `:prefix-map', which *replaces* the keymap and drops any
;; bindings a module's config.el added earlier (it loads before default).  Bind
;; ours from `doom-after-modules-config-hook' -- it runs after every module's
;; config (including default), so they land in the established map and survive.
;; Mirrors vterm's `SPC o t' / `SPC o T'.
(add-hook 'doom-after-modules-config-hook
          (lambda ()
            (map! :leader
                  :desc "Ghostel terminal (toggle)"  "o g" #'+ghostel/toggle
                  :desc "Ghostel terminal (here)"    "o G" #'+ghostel/here
                  :desc "Ghostel compile"            "c g" #'ghostel-compile
                  :desc "Ghostel recompile"          "c G" #'ghostel-recompile)))
