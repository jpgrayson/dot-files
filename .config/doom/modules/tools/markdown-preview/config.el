;;; modules/tools/markdown-preview/config.el -*- lexical-binding: t; no-byte-compile: t; -*-

(defconst my-markdown-preview-directory
  (expand-file-name "emacs-markdown-preview/" temporary-file-directory)
  "Directory for temporary Markdown preview exports.")

(defconst my-markdown-preview-extra-css
  "<style>
  /* Keep prose comfortably readable while allowing wide tables to scroll. */
  body { max-width: 1980px; }
  .markdown-body table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
</style>"
  "CSS appended to Markdown xwidget and browser previews.")

(defun my-markdown-preview-output-file ()
  "Return the temporary HTML filename for the current Markdown buffer."
  (unless buffer-file-name
    (user-error "Must be visiting a Markdown file"))
  (make-directory my-markdown-preview-directory t)
  (expand-file-name
   (format "%s-%s.html"
           (substring (secure-hash 'sha1 (expand-file-name buffer-file-name)) 0 12)
           (file-name-base buffer-file-name))
   my-markdown-preview-directory))

(defun my-markdown-preview-base-url (source-buffer)
  "Return a file URL for SOURCE-BUFFER's directory."
  (require 'url-util)
  (url-encode-url
   (concat "file://"
           (file-name-as-directory
            (file-name-directory (buffer-file-name source-buffer))))))

(defun my-markdown-preview-header (markdown-xwidget-header source-buffer theme)
  "Add local-resource and style support to a Markdown preview header."
  (concat (format "<base href=\"%s\" />\n"
                  (my-markdown-preview-base-url source-buffer))
          (funcall markdown-xwidget-header theme)
          "\n"
          my-markdown-preview-extra-css))

(defun my-markdown-preview-export ()
  "Export the current Markdown buffer to its temporary preview file."
  (interactive)
  (require 'markdown-xwidget)
  (let* ((source-buffer (current-buffer))
         (markdown-command markdown-xwidget-command)
         (markdown-css-paths
          (list (markdown-xwidget-github-css-path markdown-xwidget-github-theme)
                (markdown-xwidget-highlightjs-css-path
                 markdown-xwidget-code-block-theme)))
         (markdown-xhtml-header-content
          (my-markdown-preview-header #'markdown-xwidget-header-html
                                      source-buffer
                                      markdown-xwidget-mermaid-theme)))
    (markdown-export (my-markdown-preview-output-file))))

(defun my-markdown-preview-open-in-browser ()
  "Export the current Markdown buffer and open its rendered HTML in a browser."
  (interactive)
  (browse-url-of-file (my-markdown-preview-export)))

(defun my-markdown-xwidget-preview-mode--enable-a (original-function)
  "Give xwidget previews the same temporary output and HTML header as exports."
  (let ((source-buffer (current-buffer))
        (header-function (symbol-function 'markdown-xwidget-header-html)))
    (cl-letf (((symbol-function 'markdown-xwidget-header-html)
               (lambda (theme)
                 (my-markdown-preview-header header-function source-buffer theme))))
      (funcall original-function))))

(use-package! markdown-xwidget
  :commands markdown-xwidget-preview-mode
  :init
  ;; `pandoc' puts the mermaid class on <pre>, which Mermaid cannot render.
  ;; MultiMarkdown emits the class on <code>, which is the shape the bundled
  ;; Mermaid runtime expects.  `--snippet' is essential for documents with
  ;; MultiMarkdown metadata: without it MMD emits a complete HTML document,
  ;; causing markdown-mode to omit this package's script header.
  (setq markdown-xwidget-command "multimarkdown --snippet"
        markdown-xwidget-github-theme "dark"
        markdown-xwidget-mermaid-theme "dark")
  :config
  ;; markdown-mode calls this function for each live-preview export.  Point it
  ;; at our temporary output rather than writing beside the source Markdown.
  (advice-add #'markdown-live-preview-get-filename :override
              #'my-markdown-preview-output-file)
  (advice-add #'markdown-xwidget-preview-mode--enable :around
              #'my-markdown-xwidget-preview-mode--enable-a))

(add-hook! 'doom-after-modules-config-hook
  ;; This module is loaded under :tools, before :lang markdown.  Delay these
  ;; bindings until all module configuration has run so they override Doom's
  ;; default Markdown preview bindings.
  (defun my-markdown-preview-bindings-h ()
    (after! markdown-mode
      (map! :map markdown-mode-map
            :localleader
            :desc "Export rendered Markdown" "e" #'my-markdown-preview-export
            :desc "Preview Markdown (xwidget)" "p" #'markdown-xwidget-preview-mode
            :desc "Open rendered Markdown in browser" "w" #'my-markdown-preview-open-in-browser))

    (after! markdown-ts-mode
      (map! :map markdown-ts-mode-map
            :localleader
            :desc "Export rendered Markdown" "e" #'my-markdown-preview-export
            :desc "Preview Markdown (xwidget)" "p" #'markdown-xwidget-preview-mode
            :desc "Open rendered Markdown in browser" "w" #'my-markdown-preview-open-in-browser))))
