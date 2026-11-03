// Differential test: every case runs in nvim (oracle.lua) and in the mod.
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { makeMode, press } from "./harness.mjs";

const dir = new URL(".", import.meta.url).pathname;
const texts = [
  ["foo.bar baz  qux", "", "  hello, world(1, 2)", "\tend;", "last line here"],
  ["let x = foo(\"a b\", 'c') + [1, [2, 3]];", "fn main() {", "    if (a) {", "        b(c);", "    }", "}", ""],
  ["a", "", "", "b c", "   ", "d-e_f g", "x"],
  ["héllo wörld ñ", "日本語 text 中文", "--- ==> <== ...", "x"],
  ["one two three four five six seven eight nine ten", "eleven twelve", "", "thirteen"],
];
const motions = [
  "w", "W", "b", "B", "e", "E", "ge", "gE", "2w", "3W", "2b", "3e", "2ge", "5w", "4B",
  "0", "^", "$", "2$", "g_", "|", "5|", "}", "{", "2}", "2{", "%",
  "fa", "Fa", "ta", "Ta", "fe;", "fe,", "te;", "Te;", "2fe", "f ", "t(",
  "+", "-", "2+", "gg", "G", "3G", "2gg", "j", "k", "3j", "3l", "5h", "l", "h",
  "jjj", "$j", "$jk", "50%",
  "*", "#", "2*", "*n", "*N", "#n", "#N", "/o<CR>", "/o<CR>n", "/o<CR>N", "?o<CR>", "?o<CR>n", "2/e<CR>", "/E<CR>", "/<CR>", "/a<CR>?<CR>", "3n",
];
const yanks = [
  "yw", "yW", "ye", "yb", "y2w", "y$", "y0", "y^", "yy", "2yy", "yj", "yk", "y}", "y{",
  "yiw", "yaw", "yiW", "yaW", "y2iw", "y2aw", "yi(", "ya(", "yi[", "ya[", "yi{", "ya{", "yib", "yaB",
  "yi\"", "ya\"", "yi'", "yfa", "yta", "yFa", "yTa", "yge", "yG", "ygg", "y%",
  "viwy", "vey", "Vjy", "vjy", "v$y", "<C-v>jy", "<C-v>2jhy", "<C-v>j$y", "<C-v>jjoy", "<C-v>jOhy", "vjoky", "vkoy", "Vjoky", "vey", "vwwy", "vbby", "v3ey", "veiwy", "vawy", "vi(y",
];
const cases = [];
for (const lines of texts) {
  for (let row = 0; row < lines.length; row++) {
    const length = Math.max(1, Array.from(lines[row]).length);
    for (let col = 0; col < length; col++) {
      for (const keys of motions) cases.push({ lines, row, col, keys });
      for (const keys of yanks) cases.push({ lines, row, col, keys, yank: true });
    }
  }
}
// Display-line motions, in a window narrow enough to wrap. Plain ASCII: elsewhere
// columns are glyphs (see the deviations below).
const WRAP_WIDTH = 20;
const wrapped = [
  [
    "one two three four five six seven eight nine ten eleven twelve thirteen",
    "short",
    "",
    "exactly twenty chars",
    "exactly twenty chars and then forty cols",
    "x",
    "another line long enough to wrap around once or more",
  ],
];
const wrapKeys = [
  "gj", "gk", "2gj", "3gk", "9gj", "9gk", "99gj", "99gk", "gjgj", "gkgk", "gjgk", "gkgj", "3gjgk", "gj3gk",
  "gjj", "gjk", "jgj", "kgk", "jgk", "kgj", "$gj", "$gk", "$gjgj", "$gkgk", "$gjgk", "$gjj", "$jgj", "$kgk",
  "0gj", "15|gj", "15|gjgj", "15|3gj", "15|gjgjgj", "45|gjgj", "45|gk", "45|jgj", "45|jgjgj", "45|jjjgj", "45|2jgk",
  "gjl", "gjh", "gjw", "gj$", "gj0", "wgj", "bgk",
];
const wrapYanks = [
  "ygj", "ygk", "y2gj", "y2gk", "vgjy", "vgky", "v2gjy", "Vgjy", "Vgky", "v$gjy", "v$gky", "vgjgjy", "vgjoy",
  "<C-v>gjy", "<C-v>gkly",
];
for (const lines of wrapped) {
  for (let row = 0; row < lines.length; row++) {
    const length = Math.max(1, lines[row].length);
    for (let col = 0; col < length; col++) {
      for (const keys of wrapKeys) cases.push({ lines, row, col, keys, width: WRAP_WIDTH });
      for (const keys of wrapYanks) cases.push({ lines, row, col, keys, yank: true, width: WRAP_WIDTH });
    }
  }
}
writeFileSync(dir + "cases.json", JSON.stringify(cases));
execFileSync("nvim", ["--clean", "--headless", "-l", dir + "oracle.lua"], { stdio: "inherit" });
const expected = JSON.parse(readFileSync(dir + "oracle.json", "utf8"));

// Deliberate differences from Vim, counted apart from real mismatches:
// - columns are glyphs, not display cells, so tabs and wide (CJK) glyphs count
//   as one column for j/k/|/blocks (terminal text has no tabs; see the notes);
// - whitespace-only lines are blank lines for { and };
// - copies never end in a newline (Vim's v$y and selections ending on an empty
//   line take the line break);
// - word objects stay on the cursor's line (Vim's counts and empty lines can
//   span lines).
const wide = (lines) => lines.some((line) => /[\t\u2e80-\uffff]/.test(line));
function deviation(c, got, exp) {
  if (wide(c.lines) && /[jkG|%]|gg|<C-v>/.test(c.keys)) return "display columns";
  if (c.lines.some((l) => /^\s+$/.test(l)) && /[{}]/.test(c.keys)) return "blank lines";
  if (typeof exp === "string" && exp.endsWith("\n") && got === exp.slice(0, -1)) return "no trailing newline";
  if (/[ia][wW]/.test(c.keys)) return "line-bound word objects";
  if (exp === "\n" && got === null) return "no trailing newline";
  if (c.keys.startsWith("<C-v>") && typeof exp === "string" && / +(\n|$)/.test(exp))
    return "block: no space padding of short lines";
  if (/<C-v>.*O/.test(c.keys)) return "block: O on ragged lines";
  return null;
}
const deviations = new Map();
const failures = new Map();
let passed = 0;
cases.forEach((c, i) => {
  const mode = press(makeMode(c.lines, c.row, c.col, 10, c.width ?? 0), c.keys);
  const want = expected[i];
  const got = c.yank ? mode.copied : { row: mode.cursor.row, col: mode.cursor.col };
  const exp = c.yank ? (want.yank === null || want.yank === "" ? null : want.yank) : { row: want.row, col: want.col };
  if (JSON.stringify(got) === JSON.stringify(exp)) return passed++;
  const why = deviation(c, got, exp);
  if (why) return deviations.set(why, (deviations.get(why) ?? 0) + 1);
  const list = failures.get(c.keys) ?? [];
  list.push({ text: c.lines, at: [c.row, c.col], got, nvim: exp });
  failures.set(c.keys, list);
});
console.log(`${passed}/${cases.length} cases match nvim`);
for (const [why, n] of deviations) console.log(`  known deviation (${why}): ${n}`);
const unexplained = [...failures.values()].reduce((a, l) => a + l.length, 0);
console.log(`  unexplained mismatches: ${unexplained}`);
for (const [keys, list] of failures) {
  console.log(`\n${JSON.stringify(keys)}: ${list.length} mismatches, e.g.`);
  for (const f of list.slice(0, process.env.ALL ? 999 : 3)) console.log("  ", JSON.stringify(f));
}
process.exit(unexplained ? 1 : 0);
