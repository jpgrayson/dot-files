// Regex search tests. Run: node regex.mjs (after sh build.sh)
import { makeMode, press, search } from "./harness.mjs";

let failed = 0, passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const pos = (m) => [m.cursor.row, m.cursor.col];
const lines = ["foo bar baz", "Error: thing 42", "", "  x = foo(12, 345)", "日本語 abc 中文", "last"];

{ const m = makeMode(lines); search(m, "/", "\\d+"); eq("\\d+ finds 42", pos(m), [1, 13]);
  press(m, "n"); eq("n: 12", pos(m), [3, 10]); press(m, "n"); eq("n: 345", pos(m), [3, 14]);
  eq("match lengths", m.matchesByRow.get(3), [{ col: 10, length: 2 }, { col: 14, length: 3 }]); }
{ const m = makeMode(lines); search(m, "/", "ba[rz]"); eq("class", pos(m), [0, 4]); press(m, "n"); eq("class n", pos(m), [0, 8]); }
{ const m = makeMode(lines); search(m, "/", "error"); eq("smartcase lower ignores case", pos(m), [1, 0]); }
{ const m = makeMode(lines); search(m, "/", "Foo"); eq("upper is case-sensitive: no match stays", pos(m), [0, 0]);
  eq("not found message", m.message, "not found: Foo"); }
{ const m = makeMode(lines); search(m, "/", "\\S+:"); eq("escaped \\S doesn't force case", m.lastSearch.ignoreCase, true); eq("\\S+: finds Error:", pos(m), [1, 0]); }
{ const m = makeMode(lines); search(m, "/", "^$"); eq("^$ finds the empty line", pos(m), [2, 0]); }
{ const m = makeMode(lines); search(m, "/", "o$"); eq("o$ none... foo( not end", pos(m), [0, 0]); }
{ const m = makeMode(lines); search(m, "/", "z$"); eq("z$ end of line 0 (from 0,0 wraps to itself)", pos(m), [0, 10]); }
{ const m = makeMode(lines, 1, 0); search(m, "/", "$"); eq("$ lands on last glyph of next line", pos(m), [1, 14]); }
{ const m = makeMode(lines); search(m, "/", "^\\s+x"); eq("^\\s+x", pos(m), [3, 0]); }
{ const m = makeMode(lines); search(m, "/", "abc"); eq("glyph cols after CJK", pos(m), [4, 4]); }
{ const m = makeMode(lines); search(m, "/", "中"); eq("CJK literal", pos(m), [4, 8]); }
{ const m = makeMode(lines); search(m, "/", "x*"); eq("empty-able x* doesn't hang", Array.isArray(m.matches), true); }
{ const m = makeMode(lines); search(m, "/", "foo"); search(m, "/", "("); 
  eq("invalid pattern message", /^invalid pattern: /.test(m.message ?? ""), true);
  eq("invalid keeps previous search", m.lastSearch.text, "foo"); }
{ const m = makeMode(lines); press(m, "/"); m.query = "a("; m.computeMatches();
  eq("error while typing", typeof m.searchError, "string"); m.query = "a"; m.computeMatches(); eq("error clears", m.searchError, null); }
{ const m = makeMode(lines, 5, 0); search(m, "?", "fo+"); eq("? backward regex", pos(m), [3, 6]); press(m, "n"); eq("? n", pos(m), [0, 0]); }
{ const m = makeMode(lines); search(m, "/", "b.."); eq("dot", pos(m), [0, 4]); press(m, "vny"); }
{ const m = makeMode(lines); press(m, "*"); eq("* stays literal whole word", m.lastSearch.wholeWord, true); }
{ const m = makeMode(["a.b a.b axb"]); press(m, "sa."); eq("jump stays literal (2, not 3)", m.jump?.count, 2); }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
