// Drives the mod headless: a CopyMode over some lines, fed tokens as keys.
import CopyMode from "./main.under-test.mjs";
import { state } from "./stubs.mjs";

export function tokens(keys) {
  const named = { CR: "enter", BS: "backspace", Space: " ", PageUp: "pageup", PageDown: "pagedown" };
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === "<") {
      const end = keys.indexOf(">", i);
      if (end > i) {
        const name = keys.slice(i + 1, end);
        out.push(name.startsWith("C-") ? `ctrl-${name.slice(2).toLowerCase()}` : (named[name] ?? name));
        i = end;
        continue;
      }
    }
    out.push(keys[i]);
  }
  return out;
}

export function makeMode(lines, row = 0, col = 0, viewRows = 10, viewCols = 0) {
  const mode = new CopyMode();
  mode.handle = { focus() {}, is_focused: () => true };
  mode.status = null;
  mode.setLines(lines);
  mode.viewLen = viewRows; // the terminal's rows in view
  mode.cols = viewCols || Infinity; // its width; 0: no wrapping
  mode.cursor = { row, col };
  mode.wantCol = col;
  mode.scrollToCursor();
  mode.copied = null;
  mode.tasks = [];
  mode.cx = {
    write_to_clipboard: (text) => (mode.copied = text),
    notify() {},
    stop_propagation() {},
    spawn(task) {
      mode.tasks.push(task(mode.cx));
    },
  };
  return mode;
}

export function press(mode, keys) {
  for (const token of tokens(keys)) {
    mode.message = null;
    // While searching, characters go to the query until Enter (searchline.mjs
    // covers the real key path).
    if (mode.searching) {
      if (token === "enter") mode.commitSearch();
      else {
        mode.query += token;
        mode.computeMatches();
      }
      continue;
    }
    if (token === "escape") mode.escape(mode.cx);
    else mode.feed(token, mode.cx);
  }
  return mode;
}

// Types a search: "/" or "?" then text then Enter.
export function search(mode, prefix, text) {
  press(mode, prefix);
  mode.query = text;
  mode.computeMatches();
  mode.commitSearch();
  return mode;
}

export { state };
