// The terminal's side: a stand-in for herdr-app's terminal.select,
// adjust_selection and scroll, behaving as 0.1.16's were seen to (see
// fakeTerminal), driven by copy mode's sync(). Run: node native.mjs
import { makeMode, press } from "./harness.mjs";
import { layoutText } from "./main.under-test.mjs";
import { state } from "./stubs.mjs";

let failed = 0;
let passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const digits = (n) => Array.from({ length: n }, (_, i) => String(i % 10)).join("");

// A terminal showing `m`'s text, rows 0..total-1, `cols` wide. Up and down
// (and pages) keep the column, even past the text; line_start and line_end go
// to the row's first and last cell; left and right step from glyph to glyph,
// left from past the text lands on the last glyph, and right from the last
// glyph (or left from the first) goes on to the next (previous) row. Its view
// follows the selection's end when adjusted, not when selected. Anything
// out of range is an error (Herdr shows a toast).
function fakeTerminal(m, { cursor = { row: 0, col: 0 }, alt = false } = {}) {
  const t = { selection: null, top: 0, errors: [], commands: 0 };
  const total = () => m.totalRows;
  const len = () => m.viewRows();
  const starts = (row) => m.glyphCellsAt(row);
  const lastTextRow = () => m.lastTextRow(); // the last row with anything but blanks
  const follow = () => {
    const end = t.selection.end;
    if (end.row < t.top) t.top = end.row;
    if (end.row > t.top + len() - 1) t.top = end.row - len() + 1;
  };
  const step = (end, direction) => {
    const { row, col } = end;
    const glyphs = starts(row);
    const last = glyphs.at(-1) ?? 0;
    switch (direction) {
      case "up":
        return { row: Math.max(0, row - 1), col };
      case "down":
        return { row: Math.min(total() - 1, row + 1), col };
      case "page_up":
        return { row: Math.max(0, row - len()), col };
      case "page_down":
        return { row: Math.min(total() - 1, row + len()), col };
      case "line_start":
        return { row, col: 0 };
      case "line_end":
        return { row, col: m.cols - 1 };
      case "home":
        return { row: 0, col: 0 };
      case "end":
        return { row: lastTextRow(), col: m.cols - 1 };
      case "left":
        if (col > last) return { row, col: last };
        if (col === 0) return row > 0 ? { row: row - 1, col: starts(row - 1).at(-1) ?? 0 } : end;
        return { row, col: Math.max(...glyphs.filter((start) => start < col)) };
      case "right":
        if (col >= last) return row < total() - 1 ? { row: row + 1, col: 0 } : end;
        return { row, col: Math.min(...glyphs.filter((start) => start > col)) };
    }
    t.errors.push(`unknown direction ${direction}`);
    return end;
  };
  state.run = (name, args) => {
    t.commands++;
    if (args.terminal !== "t") t.errors.push(`${name} for ${args.terminal}`);
    if (name === "terminal.select") {
      const at = args.at === "cursor" ? cursor : args.at;
      if (!(at.row >= 0 && at.row < total() && at.col >= 0 && at.col < m.cols))
        return t.errors.push(`select outside: ${JSON.stringify(at)}`);
      t.selection = { start: at, end: at };
    } else if (name === "terminal.adjust_selection") {
      if (!t.selection) return t.errors.push("adjust without a selection");
      t.selection = { start: t.selection.start, end: step(t.selection.end, args.direction) };
      if (!alt) follow();
    } else if (name === "terminal.scroll") {
      if (alt) return t.errors.push("scroll on the alternate screen");
      const max = Math.max(0, total() - len());
      if (args.to === "top") t.top = 0;
      else if (args.to === "bottom") t.top = max;
      else t.top = Math.min(max, Math.max(0, t.top + args.lines));
    } else if (name === "terminal.clear_selection") t.selection = null;
    else if (name !== "pane.focus") t.errors.push(`unexpected ${name}`);
  };
  state.terminals = [
    {
      address: "t",
      get cols() {
        return m.cols;
      },
      get rows() {
        return len();
      },
      get selection() {
        return t.selection;
      },
    },
  ];
  state.panes = [
    {
      pane: "p",
      terminal: "t",
      get scroll() {
        return alt ? null : { total: total(), offset: t.top, len: len(), from_bottom: total() - len() - t.top };
      },
    },
  ];
  return t;
}

// A mode on `lines` driving a fake terminal.
// `pad`: the last line padded out to the last cell but one, as padToCell does.
function live(lines, row, col, viewRows, cols, pad = false) {
  const m = makeMode(lines, row, col, viewRows, cols);
  m.target = "t";
  m.rowStartTable();
  if (pad) {
    m.padToCell({ row: m.totalRows - 1, col: Math.max(0, cols - 2) });
    m.rowStartTable();
  }
  const t = fakeTerminal(m);
  m.sync();
  return { m, t };
}

// --- laying out what hc read returns
eq("stacked up from the last row, blanks above and below", layoutText(["a", digits(15), "b"], 10, 8, 5), { lines: ["", "", "a", digits(15), "b", "", ""], first: 2 });
eq("lines that would start above row 0 are dropped", layoutText(["a", digits(15), "b"], 10, 8, 2), { lines: [digits(15), "b", "", "", "", "", ""], first: 0 });
eq("a line partly above row 0 is dropped whole", layoutText([digits(25), "b"], 10, 3, 1), { lines: ["", "b", ""], first: 1 });
eq("the alternate screen: from row 0 down", layoutText(["a", "b"], 10, 4, null), { lines: ["a", "b", "", ""], first: 0 });

// --- whatever the keys, the terminal shows what the mode wants, by valid calls
{
  let seed = 4242;
  const random = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  const KEYS = [
    "h", "j", "k", "l", "w", "b", "e", "0", "$", "^", "G", "gg", "H", "M", "L", "{", "}", "%",
    "<C-e>", "<C-y>", "<C-d>", "<C-u>", "<C-f>", "<C-b>", "zz", "zt", "zb", "v", "V", "o",
    "gj", "gk", "5gj", "5gk", "3j", "7k", "40l", "20h", "9<C-e>", "2<C-f>", "n", "N", "<escape>", "*", "iw", "a(",
  ];
  const lines = ["", "short", digits(10), digits(20), "漢字".repeat(20), "f(a, b) (x)", digits(137), "  word  ".repeat(30), "🎉".repeat(25), "", digits(9), digits(400), "end", ...Array.from({ length: 40 }, (_, i) => `line ${i} word`)];
  const failures = [];
  let most = 0;
  for (const [viewRows, cols, pad] of [[5, 10], [3, 7], [8, 40], [20, 80], [2, 3], [5, 40, true], [3, 80, true], [8, 20, true]]) {
    const { m, t } = live(pad ? [...lines, "$ "] : lines, 0, 0, viewRows, cols, pad);
    for (let step = 0; step < 3000 && failures.length < 5; step++) {
      const key = KEYS[random(KEYS.length)];
      // Esc with nothing to cancel would close copy mode.
      if (key === "<escape>" && !m.visual && !m.pendingKeys()) continue;
      const before = t.commands;
      press(m, key);
      if (m.landed && !m.visual && m.landed.row === m.cursor.row && m.landed.col === m.cursor.col) m.flash = m.landed;
      m.scrollToCursor();
      m.sync();
      const want = m.wantedSelection();
      m.flash = m.landed = null;
      if (t.commands - before > most && process.env.WORST) console.log("worst", t.commands - before, viewRows, cols, key, JSON.stringify(m.cursor), m.visual);
      most = Math.max(most, t.commands - before);
      const top = Math.min(Math.max(0, m.totalRows - m.viewRows()), m.cellRowOf(m.topPos()));
      const shown = JSON.stringify(t.selection) === JSON.stringify(want);
      const cursorRow = m.cellOf(m.cursor).row;
      const inView = cursorRow >= t.top && cursorRow < t.top + m.viewRows();
      if (!shown || t.top !== top || !inView || t.errors.length)
        failures.push({ viewRows, cols, key, step, cursor: m.cursor, want, got: t.selection, top, viewTop: t.top, errors: t.errors.splice(0) });
    }
  }
  eq("fuzz: selection and view as wanted, no invalid calls", failures, []);
  console.log(`  (at most ${most} terminal commands for one key)`);
}

// --- normal mode costs one select; a selection grows by adjusting its end
{
  const { m, t } = live([digits(30), "abc def", "x"], 1, 0, 10, 10);
  let before = t.commands;
  press(m, "w");
  m.sync();
  eq("a move in normal mode: one select", [t.commands - before, t.selection], [1, { start: { row: 3, col: 4 }, end: { row: 3, col: 4 } }]);
  press(m, "v");
  before = t.commands;
  press(m, "b");
  m.sync();
  eq("v then b: the start stays, the end goes to the row start (and the view is put back)", [t.selection, t.commands - before], [{ start: { row: 3, col: 4 }, end: { row: 3, col: 0 } }, 1 + 1]);
  press(m, "k");
  m.sync();
  eq("onto a wrapped line above", t.selection, { start: { row: 3, col: 4 }, end: { row: 0, col: 0 } });
}

// --- adopt: a selection or view changed outside copy mode
{
  const { m, t } = live(Array.from({ length: 30 }, (_, i) => `line ${i}`), 29, 0, 5, 10);
  m.lastCommandAt = 0; // long since settled
  t.top = 3; // scrolled with the wheel
  m.adopt();
  eq("the view where the wheel left it, the cursor pulled into it", [m.top, m.cursor.row], [3, 7]);
  t.selection = null; // a click cleared it
  m.lastCommandAt = 0;
  m.adopt();
  m.sync();
  eq("a cleared selection is made again", t.selection, { start: { row: 7, col: 0 }, end: { row: 7, col: 0 } });
}

// --- opening: cursor, last row and text from the terminal, then shown
{
  // The terminal, 10 cols by 4 rows in view, rows 0..9: a blank row hc read
  // doesn't return, an older line, the screen (one line wrapped onto 3 rows),
  // then two blank rows; the program's cursor just after "$ ".
  const screen = ["older", "$ ls", "a b c", digits(25), "$ "];
  const shown = makeMode(["", ...screen, "", ""], 0, 0, 4, 10);
  shown.rowStartTable();
  const t = fakeTerminal(shown, { cursor: { row: 7, col: 2 } });
  t.top = 6; // at the end
  const reads = [];
  state.hc = async (args) => {
    reads.push(args);
    return { code: 0, stdout: JSON.stringify({ text: `${screen.join("\n")}\n\n`, complete: true }) };
  };
  const m = makeMode([], 0, 0, 0, 0);
  m.target = "t";
  await m.load({ sleep: async () => {} });
  eq("read all of the view's history", reads[0], ["read", "t", "--lines", "6", "--json"]);
  eq("laid out on the terminal's rows, the cursor's line padded out to it", m.lines, ["", ...screen.slice(0, -1), "$  ", "", ""]);
  eq("the cursor on the program's very cell, past the text", m.cursor, { row: 5, col: 2 });
  eq("the view kept where it was", t.top, 6);
  eq("the cursor shown", t.selection, { start: { row: 7, col: 2 }, end: { row: 7, col: 2 } });
  eq("no invalid calls", t.errors, []);
  press(m, "y");
  press(m, "y");
  eq("the padding isn't copied", m.copied, "$ ");
  state.hc = null;
}

// --- opening on a mouse selection starts in VISUAL with it
{
  const shown = makeMode(["abc def", "ghi"], 0, 0, 2, 10);
  shown.rowStartTable();
  const t = fakeTerminal(shown, { cursor: { row: 1, col: 3 } });
  t.selection = { start: { row: 0, col: 4 }, end: { row: 1, col: 1 } };
  state.hc = async () => ({ code: 0, stdout: JSON.stringify({ text: "abc def\nghi", complete: true }) });
  const m = makeMode([], 0, 0, 0, 0);
  m.target = "t";
  await m.load({ sleep: async () => {} });
  eq("visual, from the mouse selection", [m.visual, m.anchor, m.cursor], ["char", { row: 0, col: 4 }, { row: 1, col: 1 }]);
  eq("shown again", t.selection, { start: { row: 0, col: 4 }, end: { row: 1, col: 1 } });
  press(m, "y");
  eq("y copies it", m.copied, "def\ngh");
  eq("closing clears it", t.selection, null);
  state.hc = null;
}

// --- a terminal showing more than hc read returns (its history lost): the
// rows above the text read are filler the cursor stays out of
{
  const shown = makeMode(["lost one", "lost two", "lost three", "$ nvim x", "$ "], 0, 0, 5, 20);
  shown.rowStartTable();
  const t = fakeTerminal(shown, { cursor: { row: 4, col: 2 } });
  state.hc = async () => ({ code: 0, stdout: JSON.stringify({ text: "$ nvim x\n$ ", complete: false }) });
  const m = makeMode([], 0, 0, 0, 0);
  m.target = "t";
  await m.load({ sleep: async () => {} });
  eq("filler above the text read, noted", [m.lines, m.firstRow, m.note], [["", "", "", "$ nvim x", "$  "], 3, "can't read above line 4"]);
  const keys = (list) => list.map((key) => (press(m, key), [m.cursor.row, m.cursor.col]));
  eq("b, k, gg, {, H stop on the first line read", keys(["b", "b", "b", "b", "k", "G", "gg", "G", "{", "G", "H", "G", "5k"]),
    [[4, 0], [3, 7], [3, 2], [3, 0], [3, 0], [4, 0], [3, 0], [4, 0], [3, 0], [4, 0], [3, 0], [4, 0], [3, 0]]);
  press(m, "y");
  press(m, "gg");
  eq("ygg copies only text read", m.copied, "$ nvim x");
  eq("no invalid calls", t.errors, []);
  state.hc = null;
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
