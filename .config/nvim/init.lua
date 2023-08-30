local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", "--branch=stable", lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  {
    'mrjones2014/legendary.nvim',
    priority = 10000,
    lazy = false,
    opts = { which_key = { auto_register = true } }
  },

  {
    'folke/which-key.nvim',
    init = function()
      vim.o.timeout = true
      vim.o.timeoutlen = 300
    end,
    opts = {},
  },

  {'navarasu/onedark.nvim', lazy = true, opts = { style = 'cool' }},
  {'tpope/vim-commentary'},
  {'tpope/vim-fugitive'},
  {'tpope/vim-rsi'},
  {'tpope/vim-sleuth'},
  {'qpkorr/vim-bufkill'},

  { -- Reimplementation of tpope/vim-surround
    'kylechui/nvim-surround',
    event = "VeryLazy",
    config = function()
      require'nvim-surround'.setup({
        opts = {
          keymaps = {
            -- Unmap C-g from insert mode
            insert = nil,
            insert_line = nil,
          },
        },
      })
    end
  },


  { -- Fuzzy finder over lists.
    'nvim-telescope/telescope.nvim',
    dependencies = { 'nvim-lua/plenary.nvim' },
    opts = {},
  },

  {'nvim-treesitter/nvim-treesitter'},
  {'stevearc/dressing.nvim', opts = {}},
  {
    'hrsh7th/nvim-cmp',
    event = 'InsertEnter',
    dependencies = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-buffer',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-cmdline',
    },
  },

  {
    'neovim/nvim-lspconfig',
    keys = {
      -- { '<space>e', mode = { "n" }, vim.diagnostic.open_float, desc = "LSP Diag Float" },
      -- { '<space>q', mode = { "n" }, vim.diagnostic.setloclist, desc = "Open LSP Diags" },
    },

  },

  {
    "folke/flash.nvim",
    event = "VeryLazy",
    ---@type Flash.Config
    opts = {
      modes = {
        search = {
          enabled = false,
        },
      },
    },
    -- stylua: ignore
    keys = {
      { "s", mode = { "n", "o", "x" }, function() require("flash").jump() end, desc = "Flash" },
      -- { "S", mode = { "n", "o", "x" }, function() require("flash").treesitter() end, desc = "Flash Treesitter" },
      { "r", mode = "o", function() require("flash").remote() end, desc = "Remote Flash" },
      { "R", mode = { "o", "x" }, function() require("flash").treesitter_search() end, desc = "Treesitter Search" },
      { "<c-s>", mode = { "c" }, function() require("flash").toggle() end, desc = "Toggle Flash Search" },
    },
  },

  {
    'nvim-lualine/lualine.nvim',
    dependencies = { 'nvim-tree/nvim-web-devicons' },
    opts = {},
  },
})

vim.g.mapleader = ' '

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
vim.cmd[[colorscheme onedark]]
vim.o.completeopt = 'menuone,noinsert'

-- require('legendary').setup({
--   keymaps = {
--     {
--       itemgroup = "file ID",
--       description = "file...",
--       icon = "",
--       keymaps = {
--         { '<leader>ff', ':Telescope find_files<CR>', description = 'Find files' },
--         { '<leader>fs', ':w<CR>', description = 'Save file' },
--       },
--     },
--     { '<leader>cj', ':Telescope lsp_document_symbols<CR>', desc = "LSP Document Symbols" },
--     { '<leader>cd', ':Telescope lsp_definitions<CR>', desc = "Jump to definition" },
--     { '<leader>cJ', ':Telescope lsp_references<CR>', desc = "Jump to references" },
--     { '<leader>qq', ':qall<CR>', desc = "Exit Vim" },
--     { '<leader>ts', function() require'onedark'.toggle() end, desc = "Toggle Style" },
--   },
-- })

local toggle_line_numbering = function() 
  if not vim.o.number and not vim.o.relativenumber then
    vim.o.number = true
  elseif vim.o.number and not vim.o.relativenumber then
    vim.o.relativenumber = true
  elseif vim.o.relativenumber then
    vim.o.number = false
    vim.o.relativenumber = false
  end
end

local toggle_read_only = function()
  vim.bo.readonly = not vim.bo.readonly
  vim.bo.modifiable = not vim.bo.readonly
end

require('which-key').register({
  ['<leader>'] = {
    b = {
      name = '+buffer',
      d = { '<cmd>BD<cr>', 'Kill buffer' },
      k = { '<cmd>BD<cr>', 'Kill buffer' },
      n = { '<cmd>bnext<cr>', 'Next buffer' },
      p = { '<cmd>bprev<cr>', 'Prev buffer' },
      N = { '<cmd>enew<cr>', 'New buffer' },
    },
    c = {
      name = '+code',
      j = { '<cmd>Telescope lsp_document_symbols<cr>', 'LSP Document Symbols' },
      d = { '<cmd>Telescope lsp_definitions<cr>', 'Jump to definition' },
      J = { '<cmd>Telescope lsp_references<cr>', 'Jump to references' },
    },
    f = {
      name = '+file',
      f = { '<cmd>Telescope find_files<cr>', 'Find file' },
      s = { '<cmd>write<cr>', 'Save file' },
    },
    q = {
      name = '+quit',
      q = { '<cmd>qall<cr>', 'Exit Vim' },
    },
    t = {
      name = '+toggle',
      c = { function() vim.o.signcolumn = vim.o.signcolumn == 'yes' and 'no' or 'yes' end, 'Sign column' },
      l = { toggle_line_numbering, 'Line numbers' },
      r = { toggle_read_only, 'Read-only' },
      s = { function() require'onedark'.toggle() end, 'Rotate OneDark Style' },

    },
  }
})

local lspconfig = require('lspconfig')
lspconfig.pyright.setup {}
lspconfig.rust_analyzer.setup {}

local cmp = require'cmp'
cmp.setup({
  completion = { autocomplete = false },
  mapping = cmp.mapping.preset.insert({
    ['<C-b>'] = cmp.mapping.scroll_docs(-4),
    ['<C-f>'] = cmp.mapping.scroll_docs(4),
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<C-g>'] = cmp.mapping.abort(),
    ['<CR>'] = cmp.mapping.confirm({ select = true }),
  }),
  sources = cmp.config.sources({
    { name = 'nvim_lsp' },
  }, {
    { name = 'buffer' },
  }),
})

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
