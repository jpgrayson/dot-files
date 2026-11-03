// When history is read: never on open or dismiss, once when wanted. Run: node history.mjs
import { makeMode } from "./harness.mjs";
import { state } from "./stubs.mjs";
let failed = 0, passed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? passed++ : failed++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const screen = Array.from({ length: 30 }, (_, i) => `s${i}`);
const history = Array.from({ length: 5 }, (_, i) => `h${i}`);
let reads = [];
state.hc = (args) => {
  reads.push(args[3]);
  return { code: 0, stdout: JSON.stringify({ text: [...history, ...screen].join("\n"), complete: true }) };
};
const open = () => { reads = []; const m = makeMode(screen, 29, 0); m.target = "t1"; return m; };
const ev = (key, char, mods = {}) => ({ key, key_char: char, modifiers: mods });
const typed = (m, ...keys) => keys.forEach((k) => m.onKeyDown(ev(k, k), m.cx));
const settle = async (m) => { await Promise.all(m.tasks); };

(async () => {
  { const m = open(); m.onKeyDown(ev("escape"), m.cx); await settle(m); eq("dismiss right away reads nothing", reads, []); }
  { const m = open(); typed(m, "k", "h", "w", "v", "j", "$"); await settle(m); eq("ordinary motions read nothing", reads, []); }
  { const m = open(); typed(m, "s", "s"); await settle(m); eq("jump reads nothing", reads, []); }
  { const m = open(); typed(m, "G"); m.onKeyDown(ev("g", "g"), m.cx); m.onKeyDown(ev("g", "g"), m.cx); eq("loading shows", m.loadingHistory, true);
    await settle(m); eq("gg reads history", reads, ["2000"]); eq("gg lands on the true first line", [m.cursor.row, m.lines[0]], [0, "h0"]); eq("loading ends", m.loadingHistory, false); }
  { const m = open(); m.cursor = { row: 1, col: 0 }; m.scrollToCursor(); typed(m, "k"); await settle(m);
    eq("k reaching the top reads history", reads, ["2000"]); eq("cursor stays on its text", m.lines[m.cursor.row], "s0"); }
  { const m = open(); typed(m, "/"); await settle(m); eq("/ reads history", reads, ["2000"]); }
  { const m = open(); typed(m, "/"); await settle(m); m.onKeyDown(ev("enter"), m.cx); typed(m, "n"); await settle(m); eq("read only once", reads, ["2000"]); }
  { const m = open(); typed(m, "*"); await settle(m); eq("* reads history", reads, ["2000"]); }
  { const m = makeMode(["a", "b"], 1, 0); m.target = "t1"; reads = []; m.onKeyDown(ev("y", "y", { control: true }), m.cx); await settle(m); eq("ctrl-y at the top of the view reads history", reads, ["2000"]); }
  { const m = open(); typed(m, "/"); m.closed = true; await settle(m); eq("closing before it arrives leaves the text alone", m.lines.length, 30); }
  { const m = open(); m.cursor = { row: 0, col: 0 }; state.props = { overlay: "o" }; typed(m, "y", "y"); state.props = {}; await settle(m); eq("a copy that closes reads nothing", [m.closed, reads], [true, []]); }
  { const m = open(); const real = state.hc; state.hc = () => ({ code: 0, stdout: JSON.stringify({ text: screen.join("\n"), complete: false, why: "working" }) });
    typed(m, "/"); await settle(m); state.hc = real; eq("no history while working", [m.note, m.lines.length], ["no history while the agent works", 30]); }
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
