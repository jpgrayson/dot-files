// Unit tests for what the nvim oracle can't cover: view-relative keys, jump,
// history prepend, Esc, copy and close, key tokens. Run: node unit.mjs
import { makeMode, press, search, state } from "./harness.mjs";
import { keyToken, foldCase, textOf } from "./main.under-test.mjs";

let failed = 0;
let passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const pos = (m) => [m.cursor.row, m.cursor.col];
const numbered = (n) => Array.from({ length: n }, (_, i) => `line ${i}`);

// --- scrolling, 10-row view over 100 lines
{
  const m = makeMode(numbered(100), 0, 3);
  eq("initial top", m.top, 0);
  press(m, "<C-d>");
  eq("ctrl-d moves view and cursor half a page", [m.top, ...pos(m)], [5, 5, 3]);
  press(m, "<C-u>");
  eq("ctrl-u back", [m.top, ...pos(m)], [0, 0, 3]);
  press(m, "3<C-d>");
  eq("3 ctrl-d scrolls 3", [m.top, m.cursor.row], [3, 3]);
  press(m, "gg<C-f>");
  eq("ctrl-f: page less two, cursor to new top", [m.top, m.cursor.row], [8, 8]);
  press(m, "<C-b>");
  eq("ctrl-b back", [m.top, m.cursor.row], [0, 8]);
  press(m, "<C-b>");
  eq("ctrl-b at top goes to first line", [m.top, m.cursor.row], [0, 0]);
  press(m, "G<C-f>");
  eq("ctrl-f at end stays on last line", [m.top, m.cursor.row], [90, 99]);
  press(m, "<PageUp>");
  eq("pageup", [m.top, m.cursor.row], [82, 91]);
  press(m, "<C-e>");
  eq("ctrl-e: view down a line, cursor stays", [m.top, m.cursor.row], [83, 91]);
  press(m, "gg<C-e>");
  eq("ctrl-e drags cursor along at top", [m.top, m.cursor.row], [1, 1]);
  press(m, "<C-y>");
  eq("ctrl-y", [m.top, m.cursor.row], [0, 1]);
  press(m, "50Gzz");
  eq("zz centers", m.top, 45);
  press(m, "zt");
  eq("zt", m.top, 49);
  press(m, "zb");
  eq("zb", m.top, 40);
  press(m, "H");
  eq("H top of view", m.cursor.row, 40);
  press(m, "L");
  eq("L bottom of view", m.cursor.row, 49);
  press(m, "M");
  eq("M middle", m.cursor.row, 44);
  press(m, "3H");
  eq("3H", m.cursor.row, 42);
  press(m, "2L");
  eq("2L", m.cursor.row, 48);
  press(m, "j");
  eq("j at the bottom of the view", [m.top, m.cursor.row], [40, 49]);
  press(m, "j");
  eq("j scrolls the view by one", [m.top, m.cursor.row], [41, 50]);
}

// --- M on a short buffer, H/L counts beyond view
{
  const m = makeMode(numbered(4), 0, 0);
  press(m, "M");
  eq("M in a short buffer", m.cursor.row, 1);
  press(m, "9H");
  eq("9H clamps to the last row in view", m.cursor.row, 3);
  press(m, "9L");
  eq("9L clamps to top", m.cursor.row, 0);
}

// --- counts, gg vs single g, prefixes
{
  const m = makeMode(numbered(30), 10, 0);
  press(m, "g");
  eq("g alone waits", [m.prefix, m.cursor.row], ["g", 10]);
  press(m, "g");
  eq("gg goes to the top", m.cursor.row, 0);
  press(m, "12gg");
  eq("12gg", m.cursor.row, 11);
  press(m, "1");
  press(m, "0");
  eq("10 counts", m.count, 10);
  press(m, "j");
  eq("10j", m.cursor.row, 21);
  press(m, "0");
  eq("0 without count is a motion", [m.count, m.cursor.col], [0, 0]);
  press(m, "99999999j");
  eq("count capped, j clamps", m.cursor.row, 29);
  press(m, "3<escape>");
  eq("Esc drops a count", [m.count, m.closed], [0, false]);
  press(m, "gx");
  eq("unknown g key resets", [m.prefix, m.count], [null, 0]);
}

// --- visual modes, o, O, toggling, Esc
{
  const m = makeMode(["abcdef", "ghijkl", "mnopqr"], 0, 1);
  press(m, "vlj");
  eq("v selection", textOf(m.rows, m.selection()), "bcdef\nghi");
  press(m, "V");
  eq("v to V keeps the anchor", [m.visual, m.anchor], ["line", { row: 0, col: 1 }]);
  press(m, "<C-v>");
  eq("block", textOf(m.rows, m.selection()), "bc\nhi");
  press(m, "O");
  eq("O: other corner, same line", [pos(m), m.anchor], [[1, 1], { row: 0, col: 2 }]);
  press(m, "o");
  eq("o: other end", [pos(m), m.anchor], [[0, 2], { row: 1, col: 1 }]);
  press(m, "<C-v>");
  eq("ctrl-v again ends it", [m.visual, m.anchor], [null, null]);
  press(m, "v$");
  eq("v$ stands past the end", pos(m), [0, 6]);
  press(m, "<escape>");
  eq("Esc ends the selection, cursor back on the line", [m.visual, pos(m), m.closed], [null, [0, 5], false]);
}

// --- copying
{
  state.closed = 0;
  const lines = ["foo bar baz", "  second line", "third"];
  const copy = (keys, row = 0, col = 0) => {
    const m = makeMode(lines, row, col);
    m.copied = null;
    press(m, keys);
    return m.copied;
  };
  eq("yy", copy("yy"), "foo bar baz");
  eq("2yy", copy("2yy"), "foo bar baz\n  second line");
  eq("Enter: the line", copy("<CR>"), "foo bar baz");
  eq("Enter: the selection", copy("vw<CR>"), "foo b");
  eq("Y is y$", copy("Y", 0, 4), "bar baz");
  eq("2Y", copy("2Y", 0, 4), "bar baz\n  second line");
  eq("visual Y copies whole lines", copy("vjY", 0, 4), "foo bar baz\n  second line");
  eq("y3w", copy("y3w", 0, 0), "foo bar baz");
  eq("2y2w = y4w crosses lines", copy("2y2w"), "foo bar baz\n  second ");
  eq("yw on a line's last word stops at its end", copy("yw", 0, 8), "baz");
  eq("yiw", copy("yiw", 0, 5), "bar");
  eq("yi\"", copy('yi"', 0, 0), null);
  eq("y/ isn't an operator target: operator cancelled", copy("y/"), null);
  const m = makeMode(lines, 0, 0);
  press(m, "yv");
  eq("y then v cancels the operator", [m.operator, m.visual, m.copied], [null, null, null]);
  eq("copy closes the overlay", (() => {
    state.props = { overlay: "o1" };
    const before = state.closed;
    copy("yy");
    state.props = {};
    return state.closed - before;
  })(), 1);
  eq("copy notifies with a line count", state.notifications.at(-1), { title: "Copied", body: "1 line", level: "info" });
  const empty = makeMode(lines, 0, 0);
  press(empty, "yl".slice(0, 1) + "h");
  eq("yh at col 0 copies nothing and says so", [empty.copied, empty.message, empty.closed], [null, "nothing to copy", false]);
}

// --- search
{
  const m = makeMode(["Foo foo", "bar FOO", "foobar"], 0, 0);
  search(m, "/", "foo");
  eq("smartcase lower: ignores case", m.matches.length, 4);
  eq("/ moves to the next match", pos(m), [0, 4]);
  press(m, "n");
  eq("n", pos(m), [1, 4]);
  press(m, "2n");
  eq("2n wraps", pos(m), [0, 0]);
  eq("wrap message", m.message, "search wrapped to the top");
  search(m, "/", "FOO");
  eq("smartcase upper: case-sensitive", m.matches.length, 1);
  search(m, "?", "o");
  press(m, "n");
  const back = pos(m);
  search(m, "?", "");
  eq("empty ? repeats the last search backward", m.lastSearch.text, "o");
  eq("n after ? goes backward", back[0] <= 1, true);
  search(m, "/", "zzz");
  eq("not found message", [m.message, pos(m)].map(String)[0], "not found: zzz");
  const w = makeMode(["foo foobar foo", "xfoo foo"], 0, 0);
  press(w, "*");
  eq("* whole word", pos(w), [0, 11]);
  press(w, "n");
  eq("* skips foobar and xfoo", pos(w), [1, 5]);
  press(w, "#");
  eq("# backward", pos(w), [0, 11]);
}

// --- f/t/;/, and Esc during a pending f
{
  const m = makeMode(["a,b,c,d"], 0, 0);
  press(m, "f,;");
  eq("f, ;", pos(m), [0, 3]);
  press(m, ",");
  eq(",", pos(m), [0, 1]);
  press(m, "f<escape>");
  eq("Esc cancels a pending f", [m.prefix, m.closed], [null, false]);
  press(m, "2t,");
  eq("2t,", pos(m), [0, 4]);
  press(m, "f<Left>");
  eq("f + a named key cancels", [m.prefix, pos(m)], [null, [0, 4]]);
}

// --- jump
{
  const m = makeMode(["alpha beta", "alphabet gamma", "delta alps"], 0, 0);
  press(m, "sal");
  eq("jump: 3 matches, labels after 2 chars", [m.jump.count, m.jump.targetsByLabel.size], [3, 3]);
  // characters after matches ("p", "p", "p") are never labels
  eq("labels skip the next characters", [...m.jump.targetsByLabel.keys()].includes("p"), false);
  const [label, target] = [...m.jump.targetsByLabel].find(([, t]) => t.row === 2);
  press(m, label);
  eq("label jumps", [m.jump, pos(m)], [null, [target.row, target.col]]);
  press(m, "sgam");
  eq("a sole match jumps at once", [m.jump, pos(m)], [null, [1, 9]]);
  press(m, "sal<BS>");
  eq("backspace edits", m.jump.query, "a");
  press(m, "<escape>");
  eq("Esc ends jump without closing", [m.jump, m.closed], [null, false]);
  const v = makeMode(["one two three"], 0, 0);
  press(v, "vsth");
  eq("jump extends a selection", [v.visual, pos(v)], ["char", [0, 8]]);
}

// --- Esc: each press undoes one thing, then closes
{
  state.props = { overlay: "o2" };
  const m = makeMode(["abc"], 0, 0);
  press(m, "v");
  m.escape(m.cx);
  eq("Esc ends the selection", [m.visual, m.closed], [null, false]);
  m.escape(m.cx);
  eq("then Esc closes", m.closed, true);
  const j = makeMode(["abc"], 0, 0);
  press(j, "s");
  j.escape(j.cx);
  eq("Esc in jump mode only ends the jump", [j.jump, j.closed], [null, false]);
  const s = makeMode(["abc"], 0, 0);
  press(s, "/");
  s.escape(s.cx);
  eq("Esc in search only cancels the search", [s.searching, s.closed], [false, false]);
  const c = makeMode(["abc"], 0, 0);
  press(c, "3y");
  c.escape(c.cx);
  eq("Esc clears a half-typed command", [c.pendingKeys(), c.closed], ["", false]);
  const k = makeMode(["abc"], 0, 0);
  press(k, "v");
  k.onKeyDown({ key: "[", modifiers: { control: true } }, k.cx);
  eq("ctrl-[ is Esc", [k.visual, k.closed], [null, false]);
  state.props = {};
}

// --- the status line's mode badge
{
  const colors = { accent: "A", accent_foreground: "a", ansi2: "G", ansi5: "M", background: "b" };
  const m = makeMode(["abc"], 0, 0);
  eq("normal badge", [m.modeName(), m.modeColors(colors)], ["NORMAL", ["A", "a"]]);
  for (const [keys, name] of [["v", "VISUAL"], ["V", "V-LINE"], ["<C-v>", "V-BLOCK"]]) {
    const v = makeMode(["abc"], 0, 0);
    press(v, keys);
    eq(`${name} badge`, [v.modeName(), v.modeColors(colors)], [name, ["M", "b"]]);
  }
  const j = makeMode(["abc"], 0, 0);
  press(j, "s");
  eq("jump badge", [j.modeName(), j.modeColors(colors)], ["JUMP", ["G", "b"]]);
}

// --- history prepend keeps everything in place
{
  const m = makeMode(["s1 foo", "s2", "s3 foo"], 2, 3);
  search(m, "/", "foo");
  press(m, "gg");
  press(m, "v$");
  m.prependHistory(["h1", "h2 foo", "s1 foo", "s2", "s3 foo"], 2);
  eq("cursor shifts", pos(m), [2, 6]);
  eq("anchor shifts", m.anchor, { row: 2, col: 3 });
  eq("matches recomputed", m.matches.map((x) => x.row), [1, 2, 4]);
  const j = makeMode(numbered(5), 4, 0);
  press(j, "sli");
  j.prependHistory(["h", ...numbered(5)], 1);
  eq("jump targets follow", [...j.jump.targetsByLabel.values()].map((t) => t.row), [1, 2, 3, 4, 5]);
}

// --- key tokens
{
  const k = (key, key_char, modifiers = {}) => keyToken({ key, key_char, modifiers });
  eq("letter", k("w", "w"), "w");
  eq("shifted", k("g", "G", { shift: true }), "G");
  eq("shift without key_char", k("g", undefined, { shift: true }), "G");
  eq("named", k("enter", "\r"), "enter");
  eq("ctrl", k("d", undefined, { control: true }), "ctrl-d");
  eq("cmd chords ignored", k("d", "d", { platform: true }), null);
  eq("bare modifier ignored", k("shift", undefined, { shift: true }), null);
  eq("space", k("space", " "), " ");
  eq("dollar", k("4", "$", { shift: true }), "$");
}

// --- empty and unloaded buffers don't throw
{
  const m = makeMode([], 0, 0);
  for (const keys of ["j", "G", "w", "v", "y", "yy", "<CR>", "*", "n", "s", "<C-d>", "zz", "%", "yiw", "vi(", "H"]) {
    try {
      press(m, keys);
      press(m, "<escape>");
    } catch (err) {
      eq(`empty buffer: ${keys}`, String(err), "no error");
    }
  }
  passed++;
}

// --- case folding keeps offsets
eq("foldCase keeps length", foldCase("İx").length, "İx".length);
{
  const m = makeMode(["İstanbul x"], 0, 0);
  search(m, "/", "x");
  eq("match after a length-changing capital", pos(m), [0, 9]);
  const e = makeMode(["😀 a😀b"], 0, 0);
  search(e, "/", "b");
  eq("astral glyph offsets", pos(e), [0, 4]);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
