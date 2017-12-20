call plug#begin('~/.vim/plugged')
Plug 'tpope/vim-sensible'
Plug 'tpope/vim-rsi'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround'

Plug 'iCyMind/NeoSolarized'
"Plug 'lifepillar/vim-solarized8'
"Plug 'altercation/vim-colors-solarized'
Plug 'kien/ctrlp.vim'
Plug 'junegunn/fzf'
Plug 'junegunn/fzf.vim'
Plug 'dbakker/vim-projectroot'
Plug 'mileszs/ack.vim'
Plug 'qpkorr/vim-bufkill'
Plug 'tmux-plugins/vim-tmux-focus-events'

Plug 'tpope/vim-commentary'
Plug 'tpope/vim-dispatch'
Plug 'tpope/vim-flagship'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-markdown'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-speeddating'
Plug 'tpope/vim-tbone'

Plug 'itchyny/lightline.vim'

Plug 'bfredl/nvim-ipy'
Plug 'yggdroot/indentline'
Plug 'vim-syntastic/syntastic'
Plug 'mhinz/vim-signify'
"Plug 'majutsushi/tagbar'

Plug 'sheerun/vim-polyglot'
Plug 'editorconfig/editorconfig-vim'
"Plug 'junkblocker/patchreview-vim'
call plug#end()

if has('win32') || has('win64')
  let &runtimepath = '~\.vim,' . &runtimepath . ',~\.vim\after'
endif

syntax on
filetype plugin indent on

set t_8f=[38;2;%lu;%lu;%lum
set t_8b=[48;2;%lu;%lu;%lum

set termguicolors
set background=dark
colorscheme NeoSolarized
"colorscheme solarized8_dark

set nobackup
set nowritebackup
set noswapfile
set directory=~/tmp/vim,/var/tmp,/tmp

if has("gui_running")
  if has("gui_win32")
    set guifont=Consolas:h9:cANSI
  else
    set guifont="Iosevka Medium 10"
  endif
  set guioptions=agi
endif

if has("gui_running") || &t_Co > 2
  set hlsearch
endif

set showfulltag
set nowrap
set sidescroll=8
set sidescrolloff=1
set wildmode=list:longest,full
set wildignore+=*/__pycache__/*,*.pyo,*.pyc,*.o,*.obj

let g:rsi_no_meta=1

set cinoptions=N-s,:0,(0,W4,g0,i0

autocmd BufNew,BufRead SConstruct,SConscript setfiletype python

autocmd FileType c setlocal sw=8 ts=8 noet number
autocmd FileType cpp setlocal sw=4 et number
autocmd FileType python setlocal sw=4 tw=79 cc=+1 number
autocmd FileType markdown setlocal sw=4 et tw=72 spell
autocmd FileType rst setlocal sw=4 et tw=72 spell
autocmd FileType yaml setlocal sw=2 et
autocmd FileType html setlocal sw=2 et
autocmd FileType htmldjango setlocal sw=2 et
autocmd FileType javascript setlocal sw=4 et
autocmd FileType rust setlocal sw=4 et tw=100
autocmd FileType hgcommit setlocal tw=72 cc=+1 spell ff=unix

" Aggressively check for files' timestamps changing
autocmd InsertEnter,BufEnter,CursorHold * checktime

let g:ctrlp_custom_ignore = {
  \ 'dir': '\v[\/]_?build_?$',
  \ 'file': '\v\.pyc',
  \ }
" let g:ctrlp_custom_ignore = '\v\.pyc'
let g:ctrlp_root_markers = ['.projectroot', 'setup.py']

let g:signify_vcs_list = ['hg', 'git', 'svn']
let g:signify_realtime = 0
let g:signify_sign_show_count = 0

if executable('rg')
  let g:ackprg = 'rg --vimgrep'
  "set grepprg=rg\ --vimgrep
elseif executable('ag')
  let g:ackprg = 'ag --vimgrep'
  "set grepprg=rg\ --vimgrep
endif

let g:jedi#popup_on_dot = 0
let g:jedi#smart_auto_mappings = 0

let g:lightline = {
\   'active': {
\     'left': [['mode', 'paste'],
\              ['readonly', 'modified', 'relativepath', 'syntastic']],
\     'right': [['lineinfo'],
\               ['percent'],
\               ['fileformat', 'fileencoding', 'filetype']]
\   },
\   'inactive': {
\     'left': [['modified', 'relativepath']],
\     'right': [['lineinfo'],
\               ['percent']]
\   },
\   'component_expand': {
\     'syntastic': 'SyntasticStatuslineFlag',
\   },
\   'component_type': {
\     'syntastic': 'warning',
\   },
\   'component': {'relativepath': '%{expand("%:h:t") . "/" . expand("%:t")}'},
\ }

let g:syntastic_mode_map = { 'mode': 'passive' }

augroup AutoSyntastic
  autocmd!
  autocmd BufWritePost *.py,*.c,*.cpp call s:syntastic()
augroup END

function! s:syntastic()
  SyntasticCheck
  call lightline#update()
endfunction

"let g:solarized8_term_italics = 1

let g:neosolarized_italic = 1

"let g:indentLine_color_term = 0
let g:indentLine_char = '┆'

let g:polyglot_disabled = []

let g:python_indent_multiline_statement = 1

let g:python_highlight_all=1

let g:flagship_skip = 'fugitive#statusline'
let g:tabprefix = ''

let g:fzf_colors =
\ { 'fg':      ['fg', 'Normal'],
  \ 'bg':      ['bg', 'Normal'],
  \ 'hl':      ['fg', 'Comment'],
  \ 'fg+':     ['fg', 'CursorLine', 'CursorColumn', 'Normal'],
  \ 'bg+':     ['bg', 'CursorLine', 'CursorColumn'],
  \ 'hl+':     ['fg', 'Statement'],
  \ 'info':    ['fg', 'PreProc'],
  \ 'border':  ['fg', 'Ignore'],
  \ 'prompt':  ['fg', 'Conditional'],
  \ 'pointer': ['fg', 'Exception'],
  \ 'marker':  ['fg', 'Keyword'],
  \ 'spinner': ['fg', 'Label'],
  \ 'header':  ['fg', 'Comment'] }

command! -bang -nargs=* Rg
  \ call fzf#vim#grep(
  \   'rg -nSFL --column --no-heading --color=always '.shellescape(<q-args>), 1,
  \   <bang>0 ? fzf#vim#with_preview('up:60%')
  \           : fzf#vim#with_preview('right:50%:hidden', '?'),
  \   <bang>0)

map <leader>/ :silent Rg<CR>
map <leader>* :silent Ack!<CR>

" vim: set et sw=2 ts=2
