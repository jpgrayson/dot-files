local install_path = vim.fn.stdpath('data') .. '/site/pack/packer/start/packer.nvim'
if vim.fn.empty(vim.fn.glob(install_path)) > 0 then
  vim.api.nvim_command(
    '!git clone --depth=1 https://github.com/wbthomason/packer.nvim ' ..  install_path
  )
  vim.cmd 'packadd packer.nvim'
end

-- Only if your version of Neovim doesn't have https://github.com/neovim/neovim/pull/12632 merged
--vim._update_package_paths()

require('packer').startup(function (use)
  use 'wbthomason/packer.nvim'

  use 'tpope/vim-commentary'
  use 'tpope/vim-fugitive'
  use 'tpope/vim-rsi'
  use 'tpope/vim-sleuth'
  use 'tpope/vim-surround'

  use {
    'nvim-telescope/telescope.nvim',
    requires = {
      {'nvim-lua/popup.nvim'},
      {'nvim-lua/plenary.nvim'}
    }
  }

  use 'nvim-treesitter/nvim-treesitter'

  use 'joshdick/onedark.vim'
  use 'itchyny/lightline.vim'
  use 'neovim/nvim-lspconfig'
  use 'hrsh7th/nvim-compe'
  use 'qpkorr/vim-bufkill'
end)

vim.o.backup = false
vim.o.writebackup = false
vim.o.swapfile = false
vim.o.background = 'dark'

vim.o.showfulltag = true
vim.o.wrap = false
vim.o.sidescroll = 8
vim.o.sidescrolloff = 1

vim.o.hlsearch = true
vim.o.incsearch = true
vim.o.inccommand = 'nosplit'

vim.o.mouse = 'a'

vim.o.breakindent = true

vim.opt.wildignore = {
  '*.__pycache__/*',
  '*.pyo',
  '*.pyc',
  '*.o',
  '*.obj',
}

vim.o.termguicolors = true
vim.g.onedark_terminal_italics = 2
vim.cmd[[colorscheme onedark]]

vim.g.lightline = {
  colorscheme = 'onedark';
  active = {
    left = {
      {'mode', 'paste'},
      {'gitbranch', 'readonly', 'filename', 'modified'},
    },
    right = {
      {'lineinfo'},
      {'percent'},
      {'fileformat', 'fileencoding', 'filetype'},
    }
  };
  inactive = {
    left = {
      {'modified', 'relativepath'},
    },
    right = {
      {'lineinfo'},
      {'percent'},
    },
  };
  component_function = {
    gitbranch = 'fugitive#head',
  };
}

vim.o.completeopt = 'menuone,noinsert'

require('compe').setup {}

require'nvim-treesitter.configs'.setup {
  ensure_installed = {
    "bash",
    "c",
    "cmake",
    "cpp",
    "diff",
    "dockerfile",
    "git_config",
    "git_rebase",
    "gitattributes",
    "gitcommit",
    "gitignore",
    "json",
    "lua",
    "make",
    "markdown_inline",
    "python",
    "rust",
    "sql",
    "swift",
    "typescript",
    "vim",
    "vimdoc",
    "yaml",
    "zig",
  },
  auto_install = true,
  highlight = {
    enable = true,
  },
  additional_vim_regex_highlighting = false,
}
