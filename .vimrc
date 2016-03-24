call plug#begin('~/.vim/plugged')
Plug 'tpope/vim-sensible'
Plug 'tpope/vim-rsi'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround'

Plug 'altercation/vim-colors-solarized'
Plug 'kien/ctrlp.vim'
Plug 'mileszs/ack.vim'
Plug 'belike81/vim-bufkill'

Plug 'tpope/vim-commentary'
Plug 'tpope/vim-flagship'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-markdown'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-speeddating'
Plug 'tpope/vim-tbone'

Plug 'itchyny/lightline.vim'
" Plug 'vim-airline/vim-airline'
" Plug 'vim-airline/vim-airline-themes'

Plug 'scrooloose/syntastic'
Plug 'mhinz/vim-signify'
Plug 'majutsushi/tagbar'

Plug 'davidhalter/jedi-vim'
Plug 'hdima/python-syntax'
Plug 'hynek/vim-python-pep8-indent'
Plug 'nvie/vim-flake8'

Plug 'JuliaLang/julia-vim'
Plug 'aklt/plantuml-syntax'
Plug 'wting/rust.vim'

"Plug 'junkblocker/patchreview-vim'
call plug#end()

if has('win32') || has('win64')
  let &runtimepath = '~\.vim,' . &runtimepath . ',~\.vim\after'
endif

syntax on
filetype plugin indent on

set background=dark

"let g:solarized_termcolors=256
"let g:solarized_termtrans=1
"let g:solarized_bold=1
"let g:solarized_italic=1
"let g:solarized_degrade=1
"let g:solarized_contrast="high"
"let g:solarized_visibility="high"

if has("gui_running")
  colorscheme solarized
else
  colorscheme solarized
  "colorscheme wombat256mod
endif

set nobackup
set nowritebackup
set noswapfile
set directory=~/tmp/vim,/var/tmp,/tmp

if has("gui_running")
  if has("gui_win32")
    set guifont=Consolas:h9:cANSI
  else
    set guifont="Menlo 10"
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
set wildignore+=*/__pycache__/*,*.pyo,*.o,*.obj

let g:rsi_no_meta=1

map <Leader>/ :silent Ack!<CR>

" python-syntax options
let g:python_highlight_all=1

set cinoptions=N-s,:0,(0,W4,g0,i0

autocmd BufNew,BufRead SConstruct,SConscript set filetype=python

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

let g:signify_vcs_list = ['hg', 'git', 'svn']

if executable('ag')
  let g:ackprg = 'ag --vimgrep'
endif

let g:jedi#popup_on_dot = 0

" vim: set et sw=2 ts=2
