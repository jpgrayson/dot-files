return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      -- autoformat = false,
      servers = {
        sourcekit = {
          cmd = { "sourcekit-lsp" },
        },
      },
    },
  },
}
