// Lists word-object and display-column "deviations" that don't look like the
// documented cause, to make sure the buckets hide nothing else.
import { readFileSync } from "node:fs";
import { makeMode, press } from "./harness.mjs";
const cases = JSON.parse(readFileSync(new URL("cases.json", import.meta.url)));
const expected = JSON.parse(readFileSync(new URL("oracle.json", import.meta.url)));
let odd = 0;
cases.forEach((c, i) => {
  const mode = press(makeMode(c.lines, c.row, c.col, 10, c.width ?? 0), c.keys);
  const exp = expected[i];
  if (/[ia][wW]/.test(c.keys) && c.yank) {
    const want = exp.yank === "" ? null : exp.yank;
    if (mode.copied === want) return;
    const crossLine = (want ?? "").includes("\n") || c.lines[c.row] === "";
    if (!crossLine && odd++ < 999) console.log("word object:", JSON.stringify({ keys: c.keys, line: c.lines[c.row], at: c.col, got: mode.copied, nvim: want }));
  }
  if (!c.yank && /[jkG|%]|gg/.test(c.keys) && !/[\t⺀-￿]/.test(c.lines.join("")) ) {
    if (mode.cursor.row !== exp.row || mode.cursor.col !== exp.col) { odd++; console.log("vertical:", c.keys, JSON.stringify(c.lines), c.row, c.col, mode.cursor, exp); };
  }
});
console.log(`${odd} unexpected`);
