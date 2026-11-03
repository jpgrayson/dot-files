// Lines wider than the view wrap onto display lines. Run: node wrap.mjs
import { makeMode, press, search } from "./harness.mjs";
import { wrapStarts, cellsOf } from "./main.under-test.mjs";

let failed = 0;
let passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const glyphs = (text) => Array.from(text);
const view = (m) => [m.top, m.topLine];
const pos = (m) => [m.cursor.row, m.cursor.col];
const digits = (n) => Array.from({ length: n }, (_, i) => String(i % 10)).join("");
const numbered = (n) => Array.from({ length: n }, (_, i) => `line ${i}`);

// What a display line draws, read back from the builder calls.
const COLORS = { accent: "cursor", ansi3: "match", selection: "selected" };
const prop = (el, name) => el.calls.find((call) => call[0] === name)?.[1];
function drawn(m, row, line) {
  const selection = m.selection();
  const starts = m.lineStarts(row);
  const el = m.renderLine(row, line, starts, selection, COLORS, "mono", 14, 18);
  const parts = el.calls
    .filter(([name]) => name === "child" || name === "children")
    .flatMap(([name, arg]) => (name === "child" ? [arg] : arg));
  const box = (part) => ({
    kind: prop(part, "bg") ?? "text",
    cell: (prop(part, "left") ?? 0) / m.cellWidth,
    cells: (prop(part, "w") ?? 0) / m.cellWidth,
    text: prop(part, "child") ?? "",
  });
  return parts.map(box);
}
const kinds = (parts, kind) => parts.filter((part) => part.kind === kind);

// --- where lines break
eq("fits", wrapStarts(glyphs("abc"), 10), [0]);
eq("exactly fits", wrapStarts(glyphs(digits(10)), 10), [0]);
eq("one over", wrapStarts(glyphs(digits(11)), 10), [0, 10]);
eq("several", wrapStarts(glyphs(digits(25)), 10), [0, 10, 20]);
eq("empty", wrapStarts([], 10), [0]);
eq("no width yet: no wrapping", wrapStarts(glyphs(digits(500)), Infinity), [0]);
eq("wide glyphs take two cells", wrapStarts(glyphs("漢字漢字漢字"), 4), [0, 2, 4]);
eq("a wide glyph doesn't straddle the edge", wrapStarts(glyphs("abc漢d"), 4), [0, 3]);
eq("a wide glyph wider than the view still advances", wrapStarts(glyphs("漢字"), 1), [0, 1]);
eq("emoji is wide", cellsOf(glyphs("a🎉")), 3);

// --- before the view is laid out nothing wraps
{
  const m = makeMode([digits(500)], 0, 0, 5);
  eq("unmeasured view keeps one display line", m.lineCount(0), 1);
}

// --- j and k stay on whole lines, h and l cross display lines
{
  const m = makeMode([digits(25), "short", digits(15)], 0, 0, 10, 10);
  eq("counts display lines", [m.lineCount(0), m.lineCount(1), m.lineCount(2)], [3, 1, 2]);
  press(m, "j");
  eq("j goes to the next line, not display line", pos(m), [1, 0]);
  press(m, "k");
  press(m, "12l");
  eq("l crosses onto the next display line", [pos(m), m.cursorPos().line], [[0, 12], 1]);
  press(m, "j");
  eq("j clamps to a short line", pos(m), [1, 4]);
  press(m, "j");
  eq("wantCol survives", pos(m), [2, 12]);
}

// --- copying gives the line as it is, not as it is wrapped
{
  const line = digits(25);
  let m = makeMode([line, "x"], 0, 0, 10, 10);
  press(m, "yy");
  eq("yy has no breaks", m.copied, line);
  m = makeMode([line, "x"], 0, 0, 10, 10);
  press(m, "ly$");
  eq("y$ across display lines", m.copied, line.slice(1));
  m = makeMode([line, "x"], 0, 5, 10, 10);
  press(m, "v10ly");
  eq("v across a wrap", m.copied, line.slice(5, 16));
}

// --- the cursor past the end of a line that fills its last display line
{
  const m = makeMode([digits(20), "x"], 0, 0, 10, 10);
  eq("a full line takes no extra line", m.lineCount(0), 2);
  press(m, "v$");
  eq("in a selection $ goes past the end", pos(m), [0, 20]);
  eq("it gets a display line of its own", [m.lineCount(0), m.cursorPos().line], [3, 2]);
  const parts = drawn(m, 0, 2);
  eq("the cursor is at its start", kinds(parts, "cursor").map((p) => p.cell), [0]);
  press(m, "<escape>");
  eq("gone once the cursor leaves", m.lineCount(0), 2);
}

// --- the view follows the cursor through a line taller than it
{
  const m = makeMode([digits(100)], 0, 0, 5, 10);
  eq("ten display lines", m.lineCount(0), 10);
  press(m, "$");
  eq("$ brings the end into view", [pos(m), view(m)], [[0, 99], [0, 5]]);
  press(m, "0");
  eq("0 brings the start back", [pos(m), view(m)], [[0, 0], [0, 0]]);
  press(m, "42l");
  eq("l scrolls just enough", [pos(m), view(m)], [[0, 42], [0, 0]]);
  press(m, "10l");
  eq("further on", [pos(m), view(m)], [[0, 52], [0, 1]]);
}

// --- scrolling keys move by display lines, so they get through a tall line
{
  let m = makeMode([digits(100), "after"], 0, 0, 5, 10);
  press(m, "<C-e>");
  eq("ctrl-e moves a display line, cursor kept on screen", [view(m), pos(m)], [[0, 1], [0, 10]]);
  press(m, "<C-e><C-e>");
  eq("again", [view(m), pos(m)], [[0, 3], [0, 30]]);
  press(m, "<C-y>");
  eq("ctrl-y leaves a cursor still in view", [view(m), pos(m)], [[0, 2], [0, 30]]);
  m = makeMode([digits(100), "after"], 0, 0, 5, 10);
  press(m, "<C-d>");
  eq("ctrl-d", [view(m), pos(m)], [[0, 2], [0, 20]]);
  press(m, "<C-d>");
  eq("ctrl-d again", [view(m), pos(m)], [[0, 4], [0, 40]]);
  press(m, "<C-u>");
  eq("ctrl-u", [view(m), pos(m)], [[0, 2], [0, 20]]);
  m = makeMode([digits(100), "after"], 0, 0, 5, 10);
  press(m, "<C-f>");
  eq("ctrl-f", [view(m), pos(m)], [[0, 3], [0, 30]]);
  press(m, "<C-f>");
  eq("ctrl-f on to the end", [view(m), pos(m)], [[0, 6], [0, 60]]);
  press(m, "<C-f>");
  eq("ctrl-f at the end goes to the last line", [view(m), pos(m)], [[0, 6], [1, 0]]);
  press(m, "gg");
  eq("gg with the column kept", [view(m), pos(m)], [[0, 0], [0, 0]]);
}

// --- gj and gk (diff.mjs checks them against nvim; these cover what it can't)
{
  const m = makeMode([digits(100), "after"], 0, 3, 5, 10);
  press(m, "gj");
  eq("gj: the next display line, same cell", pos(m), [0, 13]);
  press(m, "6gj");
  eq("the view follows", [pos(m), view(m)], [[0, 73], [0, 3]]);
  press(m, "gk");
  eq("gk stays in view", [pos(m), view(m)], [[0, 63], [0, 3]]);
  press(m, "9gj");
  eq("on to the next line", pos(m), [1, 3]);
  press(m, "9gk");
  eq("and back through it", [pos(m), m.cursorPos().line], [[0, 13], 1]);
  const j = makeMode([digits(100), "after"], 0, 3, 5, 10);
  press(j, "j");
  eq("j still moves a whole line", pos(j), [1, 3]);
  const n = makeMode(["abc", "def", "ghi"], 1, 2);
  press(n, "gj");
  eq("unwrapped, gj is j", pos(n), [2, 2]);
  press(n, "2gk");
  eq("unwrapped, gk is k", pos(n), [0, 2]);
  press(n, "gk");
  eq("gk on the first display line stays", pos(n), [0, 2]);
  const w = makeMode(["漢字漢字漢字", "abcdefgh"], 0, 1, 5, 4);
  eq("wide glyphs wrap by cells", w.lineStarts(0), [0, 2, 4]);
  press(w, "gj");
  eq("gj keeps the glyph's cell", pos(w), [0, 3]);
  press(w, "2gj");
  eq("gj from wide to narrow, by cell", pos(w), [1, 2]);
  const half = makeMode(["abcd", "漢字"], 0, 1, 5, 4);
  press(half, "gj");
  eq("gj onto the second cell of a wide glyph lands on that glyph", pos(half), [1, 0]);
}

// --- a cursor pulled along by the view stays on the display line it was pulled to
{
  const m = makeMode([digits(100)], 0, 0, 5, 10);
  press(m, "$<C-y>");
  eq("ctrl-y after $: the end of the last display line in view", [view(m), pos(m)], [[0, 4], [0, 89]]);
  press(m, "<C-y>");
  eq("and keeps going", [view(m), pos(m)], [[0, 3], [0, 79]]);
  press(m, "$");
  eq("$ still goes to the end", pos(m), [0, 99]);
}

// --- part of the first line above the view isn't the top of the text
{
  const m = makeMode([digits(100), "a", "b"], 0, 0, 5, 10);
  press(m, "<C-e><C-e>3G");
  m.top = 0;
  m.topLine = 2;
  eq("more to scroll up to, so no history yet", Boolean(m.wantsHistory("ctrl-y")), false);
  m.topLine = 0;
  eq("at the very top, history", Boolean(m.wantsHistory("ctrl-y")), true);
}

// --- moving onto a wrapped line shows all of it when it fits
{
  const m = makeMode([...numbered(20), digits(35), ...numbered(20)], 0, 0, 5, 10);
  press(m, "20G");
  eq("line above it, at the bottom", [m.cursor.row, m.top], [19, 15]);
  press(m, "j");
  eq("j shows every display line", [m.cursor.row, view(m), m.lastPos()], [20, [19, 0], { row: 20, line: 3 }]);
  press(m, "22G3|");
  press(m, "k");
  eq("still in view", m.cursor.row, 20);
  press(m, "21Gzb");
  eq("zb ends on the line's last display line", m.lastPos(), { row: 20, line: 3 });
  press(m, "zt");
  eq("zt starts on its first", view(m), [20, 0]);
  press(m, "$zt");
  eq("zt with the cursor on its last still shows the start", view(m), [20, 0]);
  press(m, "zz");
  eq("zz centers the cursor's display line", m.linesFrom(m.topPos(), 2), m.cursorPos());
}

// --- H M L count display lines
{
  const m = makeMode(["a", digits(35), "b", "c", "d", "e"], 0, 0, 5, 10);
  eq("shows part of the wrapped line", m.lastPos(), { row: 1, line: 3 });
  press(m, "L");
  eq("L: the last line shown whole", m.cursor.row, 1);
  const n = makeMode(["a", "b", digits(45), "c", "d"], 0, 0, 5, 10);
  eq("a partly shown line isn't the bottom", n.bottomRow(), 1);
  press(n, "L");
  eq("L stops above it", n.cursor.row, 1);
  press(n, "M");
  eq("M: the middle display line", n.cursor.row, 2);
}

// --- what is drawn
{
  const line = digits(25);
  const m = makeMode([line], 0, 12, 10, 10);
  eq("each display line draws its own text", [0, 1, 2].map((l) => kinds(drawn(m, 0, l), "text")[0].text), [line.slice(0, 10), line.slice(10, 20), line.slice(20)]);
  eq("the cursor only on its own display line", [0, 1, 2].map((l) => kinds(drawn(m, 0, l), "cursor").map((p) => p.cell)), [[], [2], []]);
  const v = makeMode([line], 0, 5, 10, 10);
  press(v, "v15l");
  const boxes = [0, 1, 2].map((l) => kinds(drawn(v, 0, l), "selected").map((p) => [p.cell, p.cells]));
  eq("a selection is boxed on each display line", boxes, [[[5, 5]], [[0, 10]], [[0, 1]]]);
  const s = makeMode([line], 0, 0, 10, 10);
  search(s, "/", "8901");
  const matches = [0, 1].map((l) => kinds(drawn(s, 0, l), "match").map((p) => [p.cell, p.text]));
  eq("a match over a wrap is drawn in two parts", matches[0], [[8, "89"]]);
  eq("and its second part, then the next match", matches[1], [[0, "01"], [8, "89"]]);
  const w = makeMode(["漢字ab"], 0, 3, 10, 10);
  eq("after a wide glyph the cursor is at its cell", kinds(drawn(w, 0, 0), "cursor").map((p) => p.cell), [5]);
  const wide = makeMode(["漢字ab"], 0, 1, 10, 10);
  eq("on a wide glyph the cursor is two cells", kinds(drawn(wide, 0, 0), "cursor").map((p) => p.cells), [2]);
  const e = makeMode(["ab", "", digits(5)], 1, 0, 10, 10);
  press(e, "Vj");
  eq("an empty line in a selection is one selected cell", kinds(drawn(e, 1, 0), "selected").map((p) => [p.cell, p.cells]), [[0, 1]]);
}

// --- jump only offers what is on screen
{
  const m = makeMode([`${digits(100)}qz${digits(10)}`, `qz`], 0, 0, 5, 10);
  press(m, "sqz");
  eq("a match on a display line out of view isn't offered", [m.jump.count, pos(m)], [0, [0, 0]]);
  const n = makeMode([`${digits(15)}qz`, `qz`], 0, 0, 5, 10);
  press(n, "sqz");
  eq("both in view: labelled", n.jump.count, 2);
  const label = Array.from(n.jump.targetsByLabel.keys())[1];
  press(n, label);
  eq("the label jumps", pos(n), [1, 0]);
}

// --- a label just past a full display line
{
  const m = makeMode([`${digits(8)}qz`, "qz"], 1, 0, 5, 10);
  press(m, "sqz");
  eq("a label past the end gets a display line", [m.lineCount(0), kinds(drawn(m, 0, 1), "cursor").map((p) => p.cell)], [2, [0]]);
}

// --- search lands on and shows the right display line
{
  const m = makeMode([`${digits(100)}needle`], 0, 0, 5, 10);
  search(m, "/", "needle");
  eq("n's target is brought into view", [pos(m), m.cursorPos().line, view(m)], [[0, 100], 10, [0, 6]]);
}

// --- resizing rewraps
{
  const m = makeMode([digits(100)], 0, 95, 5, 10);
  eq("before", [m.lineCount(0), view(m)], [10, [0, 5]]);
  m.viewWidth = 16 + 50 * 10;
  m.scrollToCursor();
  eq("wider", [m.lineCount(0), view(m)], [2, [0, 0]]);
  m.viewWidth = 16 + 5 * 10;
  m.scrollToCursor();
  eq("narrower", [m.lineCount(0), m.cursorPos().line >= m.topLine], [20, true]);
}

// --- history arriving keeps the view on the same text
{
  const m = makeMode([digits(100)], 0, 95, 5, 10);
  m.prependHistory(["old 1", "old 2", digits(100)], 2);
  eq("the view moves down with it", [view(m), pos(m)], [[2, 5], [2, 95]]);
}

// --- whatever the keys, the cursor is on screen and inside the view's width
{
  let seed = 12345;
  const random = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  const KEYS = [
    "h", "j", "k", "l", "w", "b", "e", "0", "$", "^", "G", "gg", "H", "M", "L", "{", "}", "%",
    "<C-e>", "<C-y>", "<C-d>", "<C-u>", "<C-f>", "<C-b>", "zz", "zt", "zb", "v", "V", "<C-v>", "o", "O",
    "gj", "gk", "5gj", "5gk", "3j", "7k", "40l", "20h", "9<C-e>", "9<C-y>", "2<C-f>", "n", "N", "<escape>",
  ];
  const lines = ["", "short", digits(10), digits(20), digits(30), "漢字".repeat(20), digits(137), "  word  ".repeat(30), "🎉".repeat(25), "", digits(9), digits(400), "end"];
  const failures = [];
  for (const [viewRows, viewCols] of [[5, 10], [3, 7], [1, 3], [8, 40], [2, 1]]) {
    const m = makeMode(lines, 0, 0, viewRows, viewCols);
    search(m, "/", "word");
    for (let step = 0; step < 4000 && failures.length < 5; step++) {
      const key = KEYS[random(KEYS.length)];
      press(m, key);
      m.scrollToCursor(); // as render does
      const cursor = m.cursorPos();
      const first = m.topPos();
      const last = m.lastPos();
      const before = cursor.row < first.row || (cursor.row === first.row && cursor.line < first.line);
      const after = cursor.row > last.row || (cursor.row === last.row && cursor.line > last.line);
      const shown = kinds(drawn(m, cursor.row, cursor.line), "cursor");
      const cell = shown[0]?.cell;
      const inside = shown.length === 1 && cell + 1 <= Math.max(viewCols, 2);
      const text = kinds(drawn(m, cursor.row, cursor.line), "text")[0].text;
      const fits = cellsOf(glyphs(text)) <= Math.max(viewCols, 2);
      if (before || after || !inside || !fits) failures.push({ viewRows, viewCols, key, step, pos: pos(m), cursor, first, last, cell, text });
    }
  }
  eq("fuzz: cursor on screen and inside the width", failures, []);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
