-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
local wk = require("which-key")
local Util = require("lazyvim.util")

wk.register({
  ["<leader>fs"] = { "<cmd>write<cr>", "Save File" },
  ["<leader>*"] = {
    Util.telescope("grep_string", { word_match = "-w" }),
    "Search Word",
  },
})
