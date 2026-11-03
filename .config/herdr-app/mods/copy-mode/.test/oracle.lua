-- Runs each case of cases.json in nvim and writes the cursor and the yanked
-- text to oracle.json. Run: nvim --clean --headless -l oracle.lua
local dir = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":h")
local cases = vim.json.decode(table.concat(vim.fn.readfile(dir .. "/cases.json"), "\n"))
vim.o.wrapscan = true
vim.o.ignorecase = true
vim.o.smartcase = true
-- Headless, 'columns' doesn't resize the only window; a split's width can be set.
vim.cmd("vsplit")
local out = {}
for i, c in ipairs(cases) do
  vim.api.nvim_win_set_width(0, c.width or 70)
  vim.api.nvim_buf_set_lines(0, 0, -1, false, c.lines)
  -- byte column of glyph c.col
  local line = c.lines[c.row + 1]
  local byte = vim.str_byteindex(line, "utf-32", math.min(c.col, vim.fn.strchars(line)), false)
  vim.api.nvim_win_set_cursor(0, { c.row + 1, byte })
  vim.fn.setreg('"', "<none>")
  vim.fn.setreg("/", "")
  vim.fn.histdel("search")
  local ok, err = pcall(vim.cmd, "silent! normal! " .. vim.api.nvim_replace_termcodes(c.vim or c.keys, true, false, true))
  local pos = vim.api.nvim_win_get_cursor(0)
  local cur = vim.api.nvim_buf_get_lines(0, pos[1] - 1, pos[1], false)[1]
  local col = vim.fn.strchars(cur:sub(1, pos[2]))
  local reg = vim.fn.getreg('"')
  local regtype = vim.fn.getregtype('"')
  if regtype == "V" then reg = reg:gsub("\n$", "") end
  out[i] = { row = pos[1] - 1, col = col, yank = reg ~= "<none>" and reg or vim.NIL, err = (not ok) and err or vim.NIL }
  vim.cmd("silent! normal! \27")
end
vim.fn.writefile({ vim.json.encode(out) }, dir .. "/oracle.json")
