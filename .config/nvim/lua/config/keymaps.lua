-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
local wk = require("which-key")
local Util = require("lazyvim.util")

wk.add({
  {
    "<leader>*",
    function() Util.pick("grep_string", { word_match = "-w" }) end,
    desc = "Search Word"
  },
  { "<leader>fs", "<cmd>write<cr>", desc = "Save File" },
})
