return { -- Reimplementation of tpope/vim-surround
  "kylechui/nvim-surround",
  event = "VeryLazy",
  config = function()
    require("nvim-surround").setup({
      opts = {
        keymaps = {
          -- Unmap C-g from insert mode
          insert = nil,
          insert_line = nil,
        },
      },
    })
  end,
}
