// The / line typed through onKeyDown, as the app delivers keys. Run: node searchline.mjs
import { makeMode, press } from "./harness.mjs";
let failed = 0, passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const ev = (key, char, mods = {}) => ({ key, key_char: char, modifiers: mods });
const type = (m, text) => { for (const ch of text) m.onKeyDown(ev(ch === " " ? "space" : ch.toLowerCase(), ch, ch !== ch.toLowerCase() ? { shift: true } : {}), m.cx); };
const lines = ["foo bar baz", "Error: 42 things", "last"];
{ const m = makeMode(lines); m.onKeyDown(ev("/", "/"), m.cx); eq("/ starts search", m.searching, true);
  type(m, "b.r"); eq("typed", m.query, "b.r"); eq("live matches", m.matches.length, 1);
  m.onKeyDown(ev("backspace"), m.cx); eq("backspace", m.query, "b.");
  type(m, "z"); m.onKeyDown(ev("enter"), m.cx); eq("enter commits", [m.searching, m.cursor.row, m.cursor.col], [false, 0, 8]); }
{ const m = makeMode(lines); m.onKeyDown(ev("/", "/"), m.cx); m.onKeyDown(ev("backspace"), m.cx); eq("backspace on empty cancels", m.searching, false); }
{ const m = makeMode(lines); m.onKeyDown(ev("/", "/"), m.cx); type(m, "foo bar"); m.onKeyDown(ev("w", undefined, { control: true }), m.cx);
  eq("ctrl-w deletes a word", m.query, "foo "); m.onKeyDown(ev("u", undefined, { control: true }), m.cx); eq("ctrl-u clears", m.query, ""); }
{ const m = makeMode(lines); m.cx.read_from_clipboard = () => "Err\nmore"; m.onKeyDown(ev("/", "/"), m.cx);
  m.onKeyDown(ev("v", "v", { platform: true }), m.cx); eq("cmd-v pastes first line", m.query, "Err");
  eq("smartcase upper", m.lastSearch === null || m.lastSearch?.text !== "Err", true); m.onKeyDown(ev("enter"), m.cx); eq("found Err", [m.cursor.row, m.cursor.col], [1, 0]); }
{ const m = makeMode(lines); m.onKeyDown(ev("/", "/"), m.cx); type(m, "a("); eq("error shown while typing", typeof m.searchError, "string");
  m.onKeyDown(ev("escape"), m.cx); eq("esc cancels", m.searching, false); eq("error cleared", m.searchError, null); }
{ const m = makeMode(lines); m.onKeyDown(ev("/", "/"), m.cx); m.onKeyDown(ev("left"), m.cx); m.onKeyDown(ev("x", "x", { control: true }), m.cx); eq("named/ctrl keys ignored", m.query, ""); }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
