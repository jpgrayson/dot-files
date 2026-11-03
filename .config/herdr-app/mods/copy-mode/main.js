/**
 * Copy mode: a vim-style, read-only view of a terminal's text, for moving
 * around, searching, selecting and copying to the clipboard.
 *
 * Adapted from the copy-mode mod in github.com/ParadiseWitch/herdr-mods
 * (commit 932f429) and since substantially rewritten: macOS clipboard, the
 * terminal's own font and size, rows drawn as one text element each, focus
 * handed back to the terminal on close, and a much larger set of vim keys
 * (counts, operators, text objects, block selection).
 *
 * Opening: keys.json binds `cmd-x` (section `terminal`) to
 * `mod.open:copy-mode`, and the prefix mod runs the same on `ctrl-o [`. Either
 * shows this mod as the dialog described in mod.json, in herdr's own frame,
 * over the focused terminal. Herdr closes a dialog on Esc before the mod's key
 * handler sees the key, so init binds Esc in this view's own key context, which
 * comes first; Esc then cancels step by step and closes only when nothing is
 * left to cancel.
 *
 * Loading: the text comes from `hc read <terminal> --lines N --json`. Opening
 * reads only the screen, which is instant, with the cursor on its last line.
 * History (up to HISTORY_LINES) waits until it's wanted: the cursor reaching the
 * top line, scrolling up past the top of the view, or a search. For a
 * full-screen app herdr-core collects it by scrolling the app itself, which
 * takes seconds, holds up typing into the app meanwhile and can't be cancelled,
 * so opening and dismissing copy mode mustn't start it. When it arrives it is
 * slotted in above the screen, and the cursor, view, selection and matches move
 * down with it so nothing on screen jumps. The status line says while history
 * is loading, and why it is incomplete when it is.
 *
 * Wrapping: a line wider than the dialog wraps onto further display lines, as
 * in a terminal pane, and copies as the one line it is. As with Vim's 'wrap', j
 * and k move by whole lines and gj and gk by display lines; the scrolling keys
 * (ctrl-e, ctrl-d, ctrl-f...) also move by display lines, unlike Vim's, so a line
 * taller than the view can still be read through.
 *
 * Layout: the text, and below it one status line in the terminal's font, as
 * in Vim, on an edge-to-edge band: a badge colored for the mode and any message
 * on the left, keys typed so far and the cursor position (line/lines:column) on
 * the right. While searching it is the
 * / or ? prompt instead, with the match count or why the pattern is invalid.
 *
 * Keys. {count} is an optional number typed first (3j, 2w, 5G, y3e).
 *
 *   Motions: move the cursor, extend a selection, or follow y
 *     h j k l, arrows   left, down, up, right (also Backspace, Space)
 *     gj gk             down / up a display line, within a wrapped line
 *     w b e ge          next word / previous word / end of word / end of previous word
 *     W B E gE          the same for WORDs (runs of non-blanks)
 *     0 ^ $ g_          line start / first non-blank / line end / last non-blank
 *     Home End          line start / line end
 *     |                 column {count}
 *     + -               first non-blank of the next / previous line
 *     gg G              first / last line; with a count, line {count}
 *     H M L             top / middle / bottom of the view
 *     { }               previous / next blank line
 *     %                 matching bracket; with a count, {count} percent down
 *     f F t T {char}    to / back to / till / back till {char} on the line
 *     ; ,               repeat the last f F t T, same / opposite direction
 *     n N               next / previous search match
 *     * #               search forward / backward for the word under the cursor
 *
 *   Scrolling
 *     ctrl-d ctrl-u     half a page down / up ({count}: that many lines)
 *     ctrl-f ctrl-b     a page down / up (also PageDown, PageUp)
 *     ctrl-e ctrl-y     the view a line down / up, cursor kept on screen
 *     zz zt zb          put the cursor line in the middle / at the top / at the bottom
 *
 *   Search and jump
 *     / ?               search forward / backward for a JavaScript regular
 *                       expression, typed on the bottom line; smartcase (an
 *                       upper-case letter, unless escaped as in \S, makes it
 *                       case-sensitive); Backspace deletes (on an empty line,
 *                       cancels), ctrl-w a word, ctrl-u all, cmd-v pastes; Enter
 *                       accepts, Esc cancels, an empty search repeats the last.
 *                       * # and s match their text literally
 *     s {chars} {label} jump: type two or more characters of a match on screen,
 *                       then its label (a sole match jumps at once)
 *
 *   Selecting
 *     v V ctrl-v        characterwise / linewise / block selection; the same key
 *                       again ends it, another switches kind keeping the anchor
 *     o                 go to the other end of the selection
 *     O                 in a block, the other corner on the same line; else as o
 *   Text objects, in a selection (selecting the object) or after y:
 *     iw aw iW aW       a word / WORD, inner or with surrounding blanks; in a
 *                       selection of more than one glyph, the next word(s) too
 *     i" a" i' a' i` a` a quoted string on the line, inner or with the quotes
 *     i( a( ib ab       a ( ) block, inner or with the brackets; also i) a)
 *     i{ a{ iB aB       a { } block; also i} a}
 *     i[ a[ i< a<       a [ ] or < > block; also i] a] i> a>
 *
 *   Copying: each copies to the clipboard and closes copy mode
 *     y                 in a selection: the selection
 *     y{motion}         from the cursor over a motion or object (yw, y$, yG, yiw, yi")
 *     yy                the cursor line ({count}yy: that many lines)
 *     Y                 in a selection: its lines, whole; else to the end of the
 *                       line, like Neovim's Y (y$)
 *     Enter             the selection, or else the cursor line
 *
 *   Esc, ctrl-[         cancel a pending key, the search, the jump or the
 *                       selection; with nothing to cancel, close
 *   q                   close
 *
 * Where it differs from Vim: columns are glyphs, so a wide (CJK) glyph or
 * emoji counts as one column (though it is laid out as two cells, which its
 * font may not exactly fill, so the cursor and highlights after one can sit a
 * little off); / and ? take JavaScript regex
 * syntax, not Vim's (\d+ and (a|b), not \v or \<); a whitespace-only line
 * counts as blank for { and }; word objects and their
 * counts stay on the cursor's line; a block is not padded with spaces on
 * short lines; and a copy never ends with a line break, so a pasted line
 * doesn't run in a shell. Every other motion above was checked against nvim.
 */
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import {
  closeOverlay,
  focused,
  hc,
  notify,
  panes,
  props,
  run,
  setShared,
  settings,
  shared,
  theme,
} from "herdr";

const HISTORY_LINES = 2000;
const PADDING = 8;
const JUMP_LABELS = "asdfghjklqwertyuiopzxcvbnm";
const PROBE_CELLS = 100;
const KEY_CONTEXT = "CopyMode";
const SCROLL_UP_KEYS = new Set(["ctrl-y", "ctrl-b", "ctrl-u", "pageup"]);
const ESCAPE_ACTION = "copy_mode_escape";
const MAX_COUNT = 99999;

// The terminals' font and size, so the snapshot reads like the pane it came from.
const fontFamily = () => settings().font_family ?? "JetBrains Mono";
const fontSize = () => {
  const size = settings().font_size;
  return typeof size === "number" && size > 0 ? size : 14;
};
const lineHeight = () => Math.ceil(fontSize() * 1.25);
// The status line at the bottom, like Vim's: one row of the terminal font.
const statusLineHeight = () => lineHeight() + 4;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// --- text ------------------------------------------------------------------
//
// Pure functions over `rows`, the text as one array of glyphs (code points)
// per line. A position is { row, col } in glyphs. Motions may return col equal
// to the line's length (just past its end, where Vim's motions also land);
// moving the cursor clamps that back onto the line.

const BLANK = 0;
const PUNCTUATION = 1;
const KEYWORD = 2;
const KEYWORD_CHAR = /^[\p{L}\p{N}\p{M}_]$/u;

const isBlank = (ch) => ch === undefined || ch === " " || ch === "\t";
const isKeywordChar = (ch) => ch !== undefined && KEYWORD_CHAR.test(ch);
// Vim's classes for word motions: blanks, punctuation, keyword characters.
// For WORD motions there are just blanks and the rest.
const charClass = (ch, bigWord) =>
  isBlank(ch) ? BLANK : bigWord || isKeywordChar(ch) ? KEYWORD : PUNCTUATION;

const comparePos = (a, b) => a.row - b.row || a.col - b.col;
// The same for display positions, { row, line }.
const compareLines = (a, b) => a.row - b.row || a.line - b.line;
const lineLength = (rows, row) => rows[row]?.length ?? 0;
const lastCol = (rows, row) => Math.max(0, lineLength(rows, row) - 1);
const isBlankLine = (rows, row) => (rows[row] ?? []).every(isBlank);

// Index of the first non-blank glyph; the line's length when there is none.
const firstNonBlankIndex = (rows, row) => {
  const glyphs = rows[row] ?? [];
  let col = 0;
  while (col < glyphs.length && isBlank(glyphs[col])) col++;
  return col;
};
const firstNonBlank = (rows, row) => Math.min(firstNonBlankIndex(rows, row), lastCol(rows, row));
const lastNonBlank = (rows, row) => {
  const glyphs = rows[row] ?? [];
  let col = glyphs.length - 1;
  while (col > 0 && isBlank(glyphs[col])) col--;
  return Math.max(0, col);
};

// Steps through the text a glyph at a time the way Vim's inc()/dec() do, the
// end of each line counting as a blank. next() and prev() return 0 for a step
// within a line, 2 for a step onto the end of a line, 1 for a step onto
// another line, and -1 (without moving) at either end of the text.
class Walker {
  constructor(rows, pos) {
    this.rows = rows;
    this.row = pos.row;
    this.col = pos.col;
  }

  get pos() {
    return { row: this.row, col: this.col };
  }

  charClass(bigWord) {
    return charClass(this.rows[this.row]?.[this.col], bigWord);
  }

  onEmptyLine() {
    return this.col === 0 && lineLength(this.rows, this.row) === 0;
  }

  next() {
    const length = lineLength(this.rows, this.row);
    if (this.col < length) {
      this.col++;
      return this.col < length ? 0 : 2;
    }
    if (this.row >= this.rows.length - 1) return -1;
    this.row++;
    this.col = 0;
    return 1;
  }

  prev() {
    if (this.col > 0) {
      this.col--;
      return 0;
    }
    if (this.row <= 0) return -1;
    this.row--;
    this.col = lineLength(this.rows, this.row);
    return 1;
  }

  // Steps while the class stays `cls`; false when the text ran out first.
  skipClass(cls, bigWord, forward) {
    while (this.charClass(bigWord) === cls) {
      if ((forward ? this.next() : this.prev()) === -1) return false;
    }
    return true;
  }
}

// w / W: Vim's fwd_word(). An empty line counts as a word. With `forOperator`
// (yw) the last word stops at the end of its line rather than moving on to
// the next one, as in Vim.
function wordForward(rows, pos, count, bigWord, forOperator) {
  const walker = new Walker(rows, pos);
  for (let left = count - 1; left >= 0; left--) {
    const stopAtLineEnd = forOperator && left === 0;
    const start = walker.charClass(bigWord);
    const onLastLine = walker.row === rows.length - 1;
    let step = walker.next();
    if (step === -1 || (step >= 1 && onLastLine)) break;
    if (step >= 1 && stopAtLineEnd) break;
    let done = false;
    if (start !== BLANK) {
      while (walker.charClass(bigWord) === start) {
        step = walker.next();
        if (step === -1 || (step >= 1 && stopAtLineEnd)) {
          done = true;
          break;
        }
      }
    }
    while (!done && walker.charClass(bigWord) === BLANK && !walker.onEmptyLine()) {
      step = walker.next();
      if (step === -1 || (step >= 1 && stopAtLineEnd)) done = true;
    }
    if (done) break;
  }
  return walker.pos;
}

// b / B: Vim's bck_word().
function wordBackward(rows, pos, count, bigWord) {
  const walker = new Walker(rows, pos);
  for (let n = 0; n < count; n++) {
    if (walker.prev() === -1) break;
    let onEmptyLine = false;
    let atStart = false;
    while (walker.charClass(bigWord) === BLANK) {
      if (walker.onEmptyLine()) {
        onEmptyLine = true;
        break;
      }
      if (walker.prev() === -1) {
        atStart = true;
        break;
      }
    }
    if (atStart) break;
    if (onEmptyLine) continue;
    if (!walker.skipClass(walker.charClass(bigWord), bigWord, false)) break;
    walker.next(); // overshot: back onto the word's first glyph
  }
  return walker.pos;
}

// e / E: Vim's end_word().
function wordEnd(rows, pos, count, bigWord) {
  const walker = new Walker(rows, pos);
  for (let n = 0; n < count; n++) {
    const start = walker.charClass(bigWord);
    if (walker.next() === -1) break;
    if (walker.charClass(bigWord) !== start || start === BLANK) {
      // At the end of a word: skip blanks (and empty lines) to the next one.
      let atEnd = false;
      while (walker.charClass(bigWord) === BLANK) {
        if (walker.next() === -1) {
          atEnd = true;
          break;
        }
      }
      if (atEnd) break;
    }
    if (!walker.skipClass(walker.charClass(bigWord), bigWord, true)) break;
    walker.prev(); // overshot: back onto the word's last glyph
  }
  return walker.pos;
}

// ge / gE: Vim's bckend_word(). Stops on an empty line; null at the very start.
function wordEndBackward(rows, pos, count, bigWord) {
  if (pos.row === 0 && pos.col === 0) return null;
  const walker = new Walker(rows, pos);
  for (let n = 0; n < count; n++) {
    const start = walker.charClass(bigWord);
    if (walker.prev() === -1) break;
    if (start !== BLANK && !walker.skipClass(start, bigWord, false)) break;
    let atStart = false;
    while (walker.charClass(bigWord) === BLANK && !walker.onEmptyLine()) {
      if (walker.prev() === -1) {
        atStart = true;
        break;
      }
    }
    if (atStart) break;
  }
  return walker.pos;
}

// { / }: Vim's findpar(), with whitespace-only lines counting as blank (a
// terminal often pads them). A count that runs off the text fails; `}` that
// reaches the last line lands on its last glyph, inclusively.
function paragraphMotion(rows, pos, count, forward) {
  const step = forward ? 1 : -1;
  let row = pos.row;
  for (let left = count - 1; left >= 0; left--) {
    let pastText = false;
    for (let first = true; ; first = false) {
      const blank = isBlankLine(rows, row);
      if (!blank) pastText = true;
      if (!first && pastText && blank) break;
      if (row + step < 0 || row + step >= rows.length) {
        if (left > 0) return null;
        break;
      }
      row += step;
    }
  }
  if (forward && row === rows.length - 1 && !isBlankLine(rows, row)) {
    return { row, col: lastCol(rows, row), type: INCLUSIVE };
  }
  return { row, col: 0 };
}

// f F t T: the count-th `ch` on the line. A repeat (; ,) of t/T with no count
// skips a `ch` right next to the cursor, as Vim does, so it keeps moving.
function findChar(rows, pos, kind, ch, count, repeat) {
  const glyphs = rows[pos.row] ?? [];
  const forward = kind === "f" || kind === "t";
  const till = kind === "t" || kind === "T";
  const step = forward ? 1 : -1;
  let col = pos.col;
  let skipAdjacent = till && repeat && count === 1;
  for (let n = 0; n < count; n++) {
    for (;;) {
      col += step;
      if (col < 0 || col >= glyphs.length) return null;
      if (glyphs[col] === ch && !skipAdjacent) break;
      skipAdjacent = false;
    }
  }
  return { row: pos.row, col: till ? col - step : col };
}

// Each bracket's partner, for %.
const OPENING = { ")": "(", "]": "[", "}": "{" };
const CLOSING = { "(": ")", "[": "]", "{": "}" };

// The `open` or `close` (by direction) not balanced by a bracket of the same
// pair between it and `pos`, which is not itself counted.
function unmatchedBracket(rows, pos, open, close, forward) {
  const want = forward ? close : open;
  const nest = forward ? open : close;
  let { row, col } = pos;
  let depth = 0;
  for (;;) {
    col += forward ? 1 : -1;
    while (forward && col >= lineLength(rows, row)) {
      if (++row >= rows.length) return null;
      col = 0;
    }
    while (!forward && col < 0) {
      if (--row < 0) return null;
      col = lineLength(rows, row) - 1;
    }
    const ch = rows[row][col];
    if (ch === want) {
      if (depth === 0) return { row, col };
      depth--;
    } else if (ch === nest) {
      depth++;
    }
  }
}

// The next `ch` after `pos`, on any line.
function nextChar(rows, pos, ch) {
  for (let row = pos.row; row < rows.length; row++) {
    const col = (rows[row] ?? []).indexOf(ch, row === pos.row ? pos.col + 1 : 0);
    if (col !== -1) return { row, col };
  }
  return null;
}

// %: the first ( ) [ ] { } at or after the cursor on its line, then its match.
function matchingBracket(rows, pos) {
  const glyphs = rows[pos.row] ?? [];
  for (let col = pos.col; col < glyphs.length; col++) {
    const ch = glyphs[col];
    const here = { row: pos.row, col };
    if (CLOSING[ch]) return unmatchedBracket(rows, here, ch, CLOSING[ch], true);
    if (OPENING[ch]) return unmatchedBracket(rows, here, OPENING[ch], ch, false);
  }
  return null;
}

// Text objects return an inclusive { start, end }, or null when there is none.

// iw aw iW aW, within the cursor's line. iw takes `count` runs of word or
// blank; aw takes `count` words, each with the blanks after it (or, where
// blanks come first, before it). Vim carries a count on to the next lines; here it
// stops at the line's end, and fails only on the last line, as Vim does.
function wordObject(rows, pos, count, bigWord, around) {
  const glyphs = rows[pos.row] ?? [];
  if (!glyphs.length) return null;
  const cls = (col) => charClass(glyphs[col], bigWord);
  const runEnd = (col) => {
    while (col + 1 < glyphs.length && cls(col + 1) === cls(col)) col++;
    return col;
  };
  const runStart = (col) => {
    while (col > 0 && cls(col - 1) === cls(col)) col--;
    return col;
  };
  const col = Math.min(pos.col, glyphs.length - 1);
  const onBlank = cls(col) === BLANK;
  let start = runStart(col);
  let end = start - 1;
  let taken = 0;
  for (; taken < count && end + 1 < glyphs.length; taken++) {
    const blankNext = cls(end + 1) === BLANK;
    end = runEnd(end + 1);
    // aw: blanks and the word after them, or a word and the blanks after it.
    if (around && end + 1 < glyphs.length && (blankNext || cls(end + 1) === BLANK)) {
      end = runEnd(end + 1);
    }
  }
  if (taken < count && pos.row === rows.length - 1) return null;
  // aw with no blanks after the word takes the ones before it instead,
  // unless they are the line's indent.
  if (around && !onBlank && cls(end) !== BLANK && start > 0 && cls(start - 1) === BLANK) {
    if (runStart(start - 1) > 0) start = runStart(start - 1);
  }
  return { start: { row: pos.row, col: start }, end: { row: pos.row, col: end } };
}

// i" a" (and ' `), within the cursor's line: the quoted string the cursor is
// in or on, else the next one. Quotes after a backslash don't count. a" takes
// the blanks after the closing quote too, or failing those, the ones before.
function quoteObject(rows, pos, quote, around) {
  const glyphs = rows[pos.row] ?? [];
  const quotes = [];
  for (let col = 0; col < glyphs.length; col++) {
    if (glyphs[col] === quote && glyphs[col - 1] !== "\\") quotes.push(col);
  }
  let open = -1;
  let close = -1;
  const onQuote = quotes.indexOf(pos.col);
  if (onQuote !== -1) {
    open = quotes[onQuote % 2 === 0 ? onQuote : onQuote - 1];
    close = quotes[onQuote % 2 === 0 ? onQuote + 1 : onQuote] ?? -1;
  } else {
    for (let i = 0; i + 1 < quotes.length; i += 2) {
      if (quotes[i + 1] > pos.col) {
        open = quotes[i];
        close = quotes[i + 1];
        break;
      }
    }
  }
  if (open < 0 || close < 0) return null;
  let start = open;
  let end = close;
  if (!around) {
    if (close - open < 2) return null;
    start++;
    end--;
  } else if (end + 1 < glyphs.length && isBlank(glyphs[end + 1])) {
    while (end + 1 < glyphs.length && isBlank(glyphs[end + 1])) end++;
  } else {
    while (start > 0 && isBlank(glyphs[start - 1])) start--;
  }
  return { start: { row: pos.row, col: start }, end: { row: pos.row, col: end } };
}

// i( a( and friends, across lines: the count-th block around the cursor (or
// the one whose bracket it is on); outside any, the next one after it, as in
// recent Vim. The inner form starts on the next line
// when the opening bracket ends its line, and ends on the previous line when
// only blanks come before the closing one, so it copies just the contents.
function bracketObject(rows, pos, open, close, count, around) {
  const here = rows[pos.row]?.[pos.col];
  let start = here === open ? pos : unmatchedBracket(rows, pos, open, close, false);
  for (let n = 1; n < count && start; n++)
    start = unmatchedBracket(rows, start, open, close, false);
  if (!start && here !== close) start = nextChar(rows, pos, open);
  const end = start && unmatchedBracket(rows, start, open, close, true);
  if (!start || !end) return null;
  if (around) return { start, end };
  let innerStart = { row: start.row, col: start.col + 1 };
  if (innerStart.col >= lineLength(rows, start.row) && start.row < end.row) {
    innerStart = { row: start.row + 1, col: 0 };
  }
  let innerEnd = { row: end.row, col: end.col - 1 };
  if (end.row > innerStart.row && firstNonBlankIndex(rows, end.row) >= end.col) {
    innerEnd = { row: end.row - 1, col: lineLength(rows, end.row - 1) - 1 };
  }
  if (comparePos(innerStart, innerEnd) > 0) return null;
  return { start: innerStart, end: innerEnd };
}

// The text of an inclusive range. kind is "char" (from start to end), "line"
// (whole lines) or "block" (columns start.col to end.col of each line; end.col
// may be Infinity, for a block extended with $). Lines join with "\n" and
// there is no trailing newline, so a pasted line doesn't run in a shell.
function textOf(rows, { kind, start, end }) {
  const out = [];
  for (let row = start.row; row <= end.row; row++) {
    const glyphs = rows[row] ?? [];
    if (kind === "line") out.push(glyphs.join(""));
    else if (kind === "block") out.push(glyphs.slice(start.col, end.col + 1).join(""));
    else {
      const from = row === start.row ? start.col : 0;
      const to = row === end.row ? end.col + 1 : glyphs.length;
      out.push(glyphs.slice(from, to).join(""));
    }
  }
  return out.join("\n");
}

// Cells a glyph takes in a terminal: two for East Asian wide glyphs and emoji.
const WIDE_GLYPH =
  /^[\p{Emoji_Presentation}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303F\uFF01-\uFF60\uFFE0-\uFFE6]/u;
const glyphCells = (glyph) => (glyph >= "\u1100" && WIDE_GLYPH.test(glyph) ? 2 : 1);
const cellsOf = (glyphs) => glyphs.reduce((cells, glyph) => cells + glyphCells(glyph), 0);

// The column each display line of `glyphs` starts at, wrapped to `width` cells:
// [0] when it fits. A wide glyph that would straddle the edge moves down whole.
function wrapStarts(glyphs, width) {
  const starts = [0];
  if (width === Infinity) return starts;
  let used = 0;
  glyphs.forEach((glyph, col) => {
    const cells = glyphCells(glyph);
    if (used + cells > width && used > 0) {
      starts.push(col);
      used = 0;
    }
    used += cells;
  });
  return starts;
}

// Lower-cases glyph by glyph, keeping any glyph whose lower case has another
// length, so offsets into the result are offsets into `text`.
const foldCase = (text) => {
  const lower = text.toLowerCase();
  if (lower.length === text.length) return lower;
  return Array.from(text, (ch) => {
    const folded = ch.toLowerCase();
    return folded.length === ch.length ? folded : ch;
  }).join("");
};

// Smartcase: ignore case unless the text has an upper-case letter.
const smartSearch = (text, forward) => ({
  text,
  forward,
  ignoreCase: text === text.toLowerCase(),
  wholeWord: false,
});

// A / or ? search: `text` is a JavaScript regular expression. Smartcase as in
// Vim: an upper-case letter makes it case-sensitive, except one escaped by a
// backslash (\S, \W, \B, \D are classes, not letters). An invalid pattern
// gives `error` and matches nothing.
const patternSearch = (text, forward) => {
  const ignoreCase = !/\p{Lu}/u.test(text.replace(/\\./gu, ""));
  try {
    const regex = new RegExp(text, ignoreCase ? "giu" : "gu");
    return { text, forward, ignoreCase, wholeWord: false, regex };
  } catch (err) {
    const error = String(err?.message ?? err).replace(/^Invalid regular expression: /, "");
    return { text, forward, ignoreCase, wholeWord: false, regex: null, error };
  }
};

// --- motions ---------------------------------------------------------------
//
// Each motion's to(mode, count, hasCount, forOperator) returns where it goes,
// or null to stay put. `type` says what y{motion} copies: "exclusive" stops
// short of the target, "inclusive" includes it, "linewise" copies whole
// lines. A target may carry its own type, and wantCol (the column j and k aim
// for afterwards). Vertical motions return just a row; the column comes from
// wantCol, as in Vim. G, gg, H, M, L and the scrolls keep the column, as with
// Neovim's default 'nostartofline'.

const EXCLUSIVE = "exclusive";
const INCLUSIVE = "inclusive";
const LINEWISE = "linewise";

const MOTIONS = {
  h: { type: EXCLUSIVE, to: (m, n) => ({ row: m.cursor.row, col: Math.max(0, m.cursor.col - n) }) },
  l: {
    type: EXCLUSIVE,
    to: (m, n) => ({
      row: m.cursor.row,
      col: Math.min(lineLength(m.rows, m.cursor.row), m.cursor.col + n),
    }),
  },
  j: { type: LINEWISE, vertical: true, to: (m, n) => m.rowBy(n) },
  k: { type: LINEWISE, vertical: true, to: (m, n) => m.rowBy(-n) },
  "+": { type: LINEWISE, to: (m, n) => m.rowBy(n, firstNonBlank) },
  "-": { type: LINEWISE, to: (m, n) => m.rowBy(-n, firstNonBlank) },
  0: { type: EXCLUSIVE, to: (m) => ({ row: m.cursor.row, col: 0 }) },
  "^": {
    type: EXCLUSIVE,
    to: (m) => ({ row: m.cursor.row, col: firstNonBlank(m.rows, m.cursor.row) }),
  },
  $: {
    type: INCLUSIVE,
    to: (m, n) => {
      const target = m.rowBy(n - 1, lastCol);
      return target && { ...target, wantCol: Infinity };
    },
  },
  g_: { type: INCLUSIVE, to: (m, n) => m.rowBy(n - 1, lastNonBlank) },
  "|": { type: EXCLUSIVE, to: (m, n) => ({ row: m.cursor.row, col: n - 1, wantCol: n - 1 }) },
  w: { type: EXCLUSIVE, to: (m, n, _, op) => wordForward(m.rows, m.cursor, n, false, op) },
  W: { type: EXCLUSIVE, to: (m, n, _, op) => wordForward(m.rows, m.cursor, n, true, op) },
  b: { type: EXCLUSIVE, to: (m, n) => wordBackward(m.rows, m.cursor, n, false) },
  B: { type: EXCLUSIVE, to: (m, n) => wordBackward(m.rows, m.cursor, n, true) },
  e: { type: INCLUSIVE, to: (m, n) => wordEnd(m.rows, m.cursor, n, false) },
  E: { type: INCLUSIVE, to: (m, n) => wordEnd(m.rows, m.cursor, n, true) },
  gj: { type: EXCLUSIVE, to: (m, n, _, op) => m.displayLineMotion(n, op) },
  gk: { type: EXCLUSIVE, to: (m, n, _, op) => m.displayLineMotion(-n, op) },
  ge: { type: INCLUSIVE, to: (m, n) => wordEndBackward(m.rows, m.cursor, n, false) },
  gE: { type: INCLUSIVE, to: (m, n) => wordEndBackward(m.rows, m.cursor, n, true) },
  gg: {
    type: LINEWISE,
    vertical: true,
    to: (m, n, has) => {
      m.topOnLoad = !has;
      return { row: has ? n - 1 : 0 };
    },
  },
  G: {
    type: LINEWISE,
    vertical: true,
    to: (m, n, has) => ({ row: has ? n - 1 : m.rows.length - 1 }),
  },
  H: {
    type: LINEWISE,
    vertical: true,
    to: (m, n) => ({ row: Math.min(m.top + n - 1, m.bottomRow()) }),
  },
  M: {
    type: LINEWISE,
    vertical: true,
    to: (m) => ({ row: m.middleRow() }),
  },
  L: {
    type: LINEWISE,
    vertical: true,
    to: (m, n) => ({ row: Math.max(m.top, m.bottomRow() - n + 1) }),
  },
  "{": { type: EXCLUSIVE, to: (m, n) => paragraphMotion(m.rows, m.cursor, n, false) },
  "}": { type: EXCLUSIVE, to: (m, n) => paragraphMotion(m.rows, m.cursor, n, true) },
  "%": {
    type: INCLUSIVE,
    to: (m, n, has) => {
      if (!has) return matchingBracket(m.rows, m.cursor);
      if (n > 100) return null;
      const row = Math.ceil((n * m.rows.length) / 100) - 1;
      return {
        row,
        col: Math.min(m.wantCol, lastCol(m.rows, row)),
        wantCol: m.wantCol,
        type: LINEWISE,
      };
    },
  },
  ";": { type: INCLUSIVE, to: (m, n) => m.repeatFind(false, n) },
  ",": { type: INCLUSIVE, to: (m, n) => m.repeatFind(true, n) },
  n: { type: EXCLUSIVE, to: (m, n) => m.nextMatch(m.cursor, m.lastSearch?.forward ?? true, n) },
  N: { type: EXCLUSIVE, to: (m, n) => m.nextMatch(m.cursor, !(m.lastSearch?.forward ?? true), n) },
  "*": { type: EXCLUSIVE, to: (m, n) => m.searchWordUnderCursor(true, n) },
  "#": { type: EXCLUSIVE, to: (m, n) => m.searchWordUnderCursor(false, n) },
};
Object.assign(MOTIONS, {
  left: MOTIONS.h,
  backspace: MOTIONS.h,
  right: MOTIONS.l,
  " ": MOTIONS.l,
  down: MOTIONS.j,
  up: MOTIONS.k,
  home: MOTIONS[0],
  end: MOTIONS.$,
});

const findMotion = (kind, ch, repeat) => ({
  type: kind === "f" || kind === "t" ? INCLUSIVE : EXCLUSIVE,
  to: (m, n) => findChar(m.rows, m.cursor, kind, ch, n, repeat),
});
const REVERSE_FIND = { f: "F", F: "f", t: "T", T: "t" };

// Keys that wait for one more: g and z prefixes, f/F/t/T's character.
const PREFIX_KEYS = new Set(["g", "z", "f", "F", "t", "T"]);

// Text objects after i or a: the key names the delimiter pair.
const BRACKET_OBJECTS = {
  b: ["(", ")"],
  "(": ["(", ")"],
  ")": ["(", ")"],
  B: ["{", "}"],
  "{": ["{", "}"],
  "}": ["{", "}"],
  "[": ["[", "]"],
  "]": ["[", "]"],
  "<": ["<", ">"],
  ">": ["<", ">"],
};

// Keys spelled by name rather than by the character they type.
const NAMED_KEYS = new Set([
  "enter",
  "backspace",
  "left",
  "right",
  "up",
  "down",
  "home",
  "end",
  "pageup",
  "pagedown",
]);
const MODIFIER_KEYS = new Set(["shift", "control", "alt", "platform", "function"]);

// A key press as one token: a typed character ("w", "$", "G"), a named key
// ("enter", "pageup"), or "ctrl-<key>". Cmd chords, bare modifiers and keys
// that type nothing give null.
function keyToken(event) {
  const key = event.key;
  const modifiers = event.modifiers ?? {};
  if (MODIFIER_KEYS.has(key) || modifiers.platform) return null;
  if (modifiers.control) return `ctrl-${key}`;
  if (NAMED_KEYS.has(key)) return key;
  const typed =
    event.key_char ?? (key.length === 1 ? (modifiers.shift ? key.toUpperCase() : key) : "");
  return Array.from(typed).length === 1 ? typed : null;
}

// The parts of columns first..last (inclusive) not covered by `cut` (an
// inclusive [first, last] pair, or null): zero, one or two [first, last] spans.
const spansOutside = (first, last, cut) => {
  if (last < first) return [];
  if (!cut || cut[1] < first || cut[0] > last) return [[first, last]];
  const spans = [];
  if (cut[0] > first) spans.push([first, cut[0] - 1]);
  if (cut[1] < last) spans.push([cut[1] + 1, last]);
  return spans;
};

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export default class CopyMode extends View {
  // Defaults for every field render touches: a hot reload can render before
  // init has finished, and that must not break the view.
  lines = []; // the text, a string per line
  rows = []; // the same, as glyph arrays (see "text" above)
  foldedLines = []; // lower-cased lines, filled in as searches need them
  cursor = { row: 0, col: 0 };
  wantCol = 0; // the column j and k aim for; Infinity after $
  top = 0; // first row in view
  topLine = 0; // which of that row's display lines the view starts on
  viewHeight = 0; // the view's height in pixels, once laid out
  viewWidth = 0; // the view's width in pixels, once laid out; until then no wrapping
  starts = new Map(); // wrapStarts of each row, for startsWidth cells
  startsWidth = 0;
  cellWidth = 0; // one glyph's advance in the terminal font, measured by the probe
  visual = null; // null, "char", "line" or "block"
  anchor = null; // the selection's other end
  // Keys typed toward a command: [operatorCount] [operator] [count] [prefix].
  count = 0;
  operator = null; // "y" while it waits for a motion or text object
  operatorCount = 0;
  prefix = null; // "g", "z", "f", "F", "t", "T", "i" or "a"
  lastFind = null; // { kind, ch } of the last f/F/t/T
  searching = false; // the search field is up
  searchError = null; // why the pattern being typed is invalid
  searchForward = true;
  searchCount = 1; // a count typed before / or ?
  query = "";
  lastSearch = null; // { text, forward, ignoreCase, wholeWord }
  matches = []; // [{ row, col, length }] in text order
  matchesByRow = new Map();
  jump = null;
  target = null; // the terminal copied from
  status = "loading…"; // an error, shown in place of the status line note
  message = null; // feedback for the last key, until the next
  note = null; // why history is incomplete
  loadingHistory = false;
  historyRequested = false; // history is read at most once (requestHistory)
  topOnLoad = false; // gg is waiting for history: go to its first line
  handle = null; // the focus handle, from init
  capture = null; // this copy's keys.capturing stamp
  interacted = false; // a key or click arrived, so don't grab focus on mount
  mounted = false;
  closed = false;

  init(_props, cx) {
    this.handle = cx.focus_handle();
    // Only an overlay copy takes the keyboard; publish it so pane mods leave it
    // alone for as long as this dialog is up. The stamp lets this copy clear
    // only its own mark.
    if (props()?.overlay)
      setShared("keys.capturing", (this.capture = { state: "copy-mode", ts: Date.now() }));
    // Herdr binds Esc to close the overlay, which happens before onKeyDown
    // sees it and would dismiss the dialog from Visual mode. A binding in this
    // view's own key context is deeper in, so it comes first. (try: as win98's
    // menu does, in case the keymap refuses it.)
    try {
      cx.bind_keys([{ keystroke: "escape", action: ESCAPE_ACTION, context: KEY_CONTEXT }]);
    } catch {}
    // An overlay holds the keyboard when it opens, so a reload sees no focused
    // pane; the last target keeps the text readable across reloads.
    this.target =
      focused()?.terminal ??
      panes().find((pane) => pane.focused)?.terminal ??
      shared("copy-mode.target") ??
      null;
    if (!this.target) {
      this.status = "No focused terminal";
      return;
    }
    setShared("copy-mode.target", this.target);
    cx.spawn(async (cx) => {
      try {
        const screen = await this.readTerminal(0);
        if (this.closed) return;
        this.setLines(screen.lines);
        this.cursor = { row: Math.max(0, screen.lines.length - 1), col: 0 };
        this.top = this.cursor.row;
        this.status = null;
        this.scrollToCursor();
        cx.notify();
      } catch (err) {
        this.status = String(err?.message ?? err);
        cx.notify();
      }
    });
  }

  // Whether the key just handled shows the person wants more than the screen:
  // the cursor reached the top, the view can't scroll further up, or a search.
  // Not while a command is half typed: the y of yy may be about to close.
  wantsHistory(token) {
    if (this.pendingKeys()) return false;
    return (
      this.cursor.row === 0 ||
      this.searching ||
      Boolean(this.lastSearch) ||
      (this.top === 0 && this.topLine === 0 && SCROLL_UP_KEYS.has(token))
    );
  }

  // Reads history, once. Not on open: a read of a full-screen app scrolls that
  // app, which holds up typing into it for seconds, and can't be cancelled, so
  // opening and dismissing copy mode must not start one.
  requestHistory(cx) {
    if (this.historyRequested || !this.target || !this.rows.length || this.closed) return;
    this.historyRequested = true;
    this.loadingHistory = true;
    cx.spawn(async (cx) => {
      try {
        const all = await this.readTerminal(HISTORY_LINES);
        if (this.closed) return;
        this.loadingHistory = false;
        if (!all.complete) {
          this.note =
            all.why === "working"
              ? "no history while the agent works"
              : `history incomplete${all.why ? ` (${all.why})` : ""}`;
        }
        const added = all.lines.length - this.lines.length;
        if (added > 0) this.prependHistory(all.lines, added);
        cx.notify();
      } catch (err) {
        this.loadingHistory = false;
        this.status = String(err?.message ?? err);
        cx.notify();
      }
    });
  }

  // The terminal's last `history` lines plus its screen (0: just the screen),
  // trailing blank lines dropped. JSON, because plain output appends notes such
  // as "[hc] incomplete: older output may be missing" to the text, where
  // they'd read as terminal output; here they become a status line note instead.
  async readTerminal(history) {
    const out = await hc(["read", this.target, "--lines", String(history), "--json"]);
    if (out.code !== 0) throw new Error((out.stderr || "read failed").trim());
    const result = JSON.parse(String(out.stdout ?? "{}"));
    const lines = String(result.text ?? "")
      .replace(/\r/g, "")
      .split("\n");
    while (lines.length > 1 && lines[lines.length - 1].trim() === "") lines.pop();
    return { lines, complete: result.complete !== false, why: result.why ?? null };
  }

  setLines(lines) {
    this.lines = lines;
    this.rows = lines.map((line) => Array.from(line));
    this.foldedLines = [];
    this.starts = new Map();
  }

  // History arrived: `lines` is it plus the screen, `added` rows longer than
  // what is shown. Keep everything already on screen where the reader put it:
  // cursor, view, selection anchor and search matches all move down.
  prependHistory(lines, added) {
    this.setLines(lines);
    // gg asked for the first line, which is now further up.
    const row = this.topOnLoad ? 0 : this.cursor.row + added;
    this.cursor = { ...this.cursor, row };
    this.top += added;
    if (this.anchor) this.anchor = { ...this.anchor, row: this.anchor.row + added };
    this.computeMatches();
    if (this.jump) this.updateJump();
    this.scrollToCursor();
  }

  // Both this mod's way out and herdr's cleanup hook: herdr calls close() when
  // the overlay goes by any route, such as a click beside the dialog.
  close() {
    if (this.closed) return;
    this.closed = true;
    const overlay = props()?.overlay;
    if (!overlay) return;
    closeOverlay(overlay);
    if (this.capture && shared("keys.capturing")?.ts === this.capture.ts)
      setShared("keys.capturing", null);
    // Hand the keyboard back to the terminal we copied from; closing the
    // overlay alone can leave nothing focused (a hollow terminal cursor).
    if (this.target) run("pane.focus", { terminal: this.target });
  }

  // --- view ----------------------------------------------------------------

  viewRows() {
    const height = this.viewHeight || 640;
    return Math.max(1, Math.floor((height - statusLineHeight() - PADDING * 2) / lineHeight()));
  }

  // Cells across the view; Infinity (no wrapping) until it has been laid out.
  wrapWidth() {
    if (!this.viewWidth) return Infinity;
    const cellWidth = this.cellWidth || fontSize() * 0.6;
    return Math.max(1, Math.floor((this.viewWidth - PADDING * 2) / cellWidth));
  }

  // The column each display line of `row` starts on. One more than the text
  // needs when the cursor or a jump label stands just past the end of a line
  // that fills its last display line, as it would otherwise have nowhere to be.
  lineStarts(row) {
    const width = this.wrapWidth();
    if (width !== this.startsWidth) {
      this.starts = new Map();
      this.startsWidth = width;
    }
    let starts = this.starts.get(row);
    if (!starts) {
      starts = wrapStarts(this.rows[row] ?? [], width);
      this.starts.set(row, starts);
    }
    const glyphs = this.rows[row] ?? [];
    const pastEnd =
      (row === this.cursor.row && this.cursor.col >= glyphs.length) ||
      this.jump?.labelsByRow?.get(row)?.has(glyphs.length);
    if (pastEnd && cellsOf(glyphs.slice(starts[starts.length - 1])) >= width) {
      return [...starts, glyphs.length];
    }
    return starts;
  }

  lineCount(row) {
    return this.lineStarts(row).length;
  }

  // Which display line of `row` column `col` is on.
  lineOf(row, col) {
    const starts = this.lineStarts(row);
    let line = starts.length - 1;
    while (line > 0 && starts[line] > col) line--;
    return line;
  }

  // Display positions are { row, line }. `count` display lines on from `pos`,
  // stopping at either end of the text.
  linesFrom(pos, count) {
    let { row } = pos;
    let line = pos.line + count;
    while (line < 0 && row > 0) line += this.lineCount(--row);
    while (row < this.rows.length - 1 && line >= this.lineCount(row)) line -= this.lineCount(row++);
    return { row, line: clamp(line, 0, this.lineCount(row) - 1) };
  }

  // How many display lines apart two positions are.
  linesBetween(a, b) {
    const [from, to] = compareLines(a, b) <= 0 ? [a, b] : [b, a];
    let lines = to.line - from.line;
    for (let row = from.row; row < to.row; row++) lines += this.lineCount(row);
    return lines;
  }

  topPos() {
    return { row: this.top, line: this.topLine };
  }

  cursorPos() {
    return { row: this.cursor.row, line: this.lineOf(this.cursor.row, this.cursor.col) };
  }

  // The last display line in view.
  lastPos() {
    return this.linesFrom(this.topPos(), this.viewRows() - 1);
  }

  // The first display position the view can start at and still be full.
  maxTopPos() {
    const row = Math.max(0, this.rows.length - 1);
    return this.linesFrom({ row, line: this.lineCount(row) - 1 }, 1 - this.viewRows());
  }

  setTop(pos) {
    const max = this.maxTopPos();
    const { row, line } = compareLines(pos, max) > 0 ? max : pos;
    this.top = row;
    this.topLine = clamp(line, 0, this.lineCount(row) - 1);
  }

  // The last row in view that shows all of its display lines (or the first row,
  // when it doesn't fit).
  bottomRow() {
    const last = this.lastPos();
    const whole = last.row === this.top || last.line === this.lineCount(last.row) - 1;
    return whole ? last.row : last.row - 1;
  }

  // The row at the middle of the display lines in view.
  middleRow() {
    const shown = this.linesBetween(this.topPos(), this.lastPos());
    return this.linesFrom(this.topPos(), Math.floor(shown / 2)).row;
  }

  // The view position that shows the cursor's line from the top: its first
  // display line when the cursor would still be in view, else the cursor's own.
  cursorAtTop() {
    const cursor = this.cursorPos();
    return cursor.line < this.viewRows() ? { row: cursor.row, line: 0 } : cursor;
  }

  // The view position that shows the cursor's line ending at the bottom: all of
  // it when it fits, else with the cursor on the last line in view.
  cursorAtBottom() {
    const cursor = this.cursorPos();
    const count = this.lineCount(cursor.row);
    const end = count <= this.viewRows() ? { row: cursor.row, line: count - 1 } : cursor;
    return this.linesFrom(end, 1 - this.viewRows());
  }

  scrollToCursor() {
    const cursor = this.cursorPos();
    if (compareLines(cursor, this.topPos()) < 0) this.setTop(this.cursorAtTop());
    else if (compareLines(cursor, this.lastPos()) > 0) this.setTop(this.cursorAtBottom());
    else this.setTop(this.topPos());
  }

  // Puts the cursor on a display line, as near wantCol as that line allows.
  // wantCol is kept, so moving on with j or k goes back to it.
  placeCursor({ row, line }) {
    const starts = this.lineStarts(row);
    const last = this.visual ? lineLength(this.rows, row) : lastCol(this.rows, row);
    const low = Math.min(starts[line], last);
    const high = line + 1 < starts.length ? starts[line + 1] - 1 : last;
    this.cursor = { row, col: clamp(Math.min(this.wantCol, last), low, high) };
  }

  // After the view moved: the cursor only as far as it must to stay on screen.
  cursorIntoView() {
    const cursor = this.cursorPos();
    if (compareLines(cursor, this.topPos()) < 0) this.placeCursor(this.topPos());
    else if (compareLines(cursor, this.lastPos()) > 0) this.placeCursor(this.lastPos());
  }

  // ctrl-e / ctrl-y: move the view, and the cursor only as far as it must to
  // stay on screen.
  scrollView(delta) {
    this.setTop(this.linesFrom(this.topPos(), delta));
    this.cursorIntoView();
  }

  // ctrl-d / ctrl-u: view and cursor move together.
  scrollHalfPage(direction, lines) {
    const cursor = this.linesFrom(this.cursorPos(), direction * lines);
    this.setTop(this.linesFrom(this.topPos(), direction * lines));
    this.placeCursor(cursor);
    this.scrollToCursor();
  }

  // ctrl-f / ctrl-b: a page less two lines of overlap, the cursor pulled
  // into the new view if it was left behind. With the view already at that
  // end, the cursor goes to the first (or last) line instead.
  scrollPage(direction, pages) {
    const distance = Math.max(1, this.viewRows() - 2) * pages;
    const before = this.topPos();
    this.setTop(this.linesFrom(before, direction * distance));
    if (compareLines(this.topPos(), before) === 0) {
      return this.moveCursor({ row: direction > 0 ? this.rows.length - 1 : 0 }, true);
    }
    this.cursorIntoView();
  }

  // zz / zt / zb.
  scrollCursorTo(where) {
    if (where === "top") this.setTop(this.cursorAtTop());
    else if (where === "bottom") this.setTop(this.cursorAtBottom());
    else this.setTop(this.linesFrom(this.cursorPos(), -Math.floor((this.viewRows() - 1) / 2)));
  }

  // --- cursor and selection --------------------------------------------------

  clampRow(row) {
    return clamp(row, 0, Math.max(0, this.rows.length - 1));
  }

  // `delta` rows from the cursor, stopping at the first or last line; null
  // when the cursor is already there, which makes j, k, yj and the like fail
  // as in Vim. With `colOf`, also a column: colOf(rows, row).
  rowBy(delta, colOf) {
    const row = this.cursor.row;
    if ((delta > 0 && row >= this.rows.length - 1) || (delta < 0 && row <= 0)) return null;
    const target = this.clampRow(row + delta);
    return colOf ? { row: target, col: colOf(this.rows, target) } : { row: target };
  }

  // To `target`, kept on the text; a vertical move takes its column from
  // wantCol, any other sets wantCol (to target.wantCol when it has one). In a
  // selection the cursor may also stand just past the end of a line, taking
  // in the line break, as in Vim.
  moveCursor(target, vertical = false) {
    if (!this.rows.length) return;
    const row = this.clampRow(target.row);
    const last = this.visual ? lineLength(this.rows, row) : lastCol(this.rows, row);
    if (vertical) {
      this.cursor = { row, col: Math.min(this.wantCol, last) };
    } else {
      // In a selection $ goes past the last glyph, as in Vim.
      const col = this.visual && target.wantCol === Infinity && !target.display ? last : target.col;
      this.cursor = { row, col: clamp(col, 0, last) };
      this.wantCol = target.wantCol ?? this.cursor.col;
    }
    this.scrollToCursor();
  }

  // gj / gk: `delta` display lines from the cursor, keeping its place across the
  // display line, as far as the text goes: null when that's nowhere, or short of
  // `delta` for an operator, as in Vim. wantCol may land past the end of a short
  // line, so the next gj or gk still has that place; a place beyond the width
  // (reached by j or k from a longer line) counts as the last cell.
  displayLineMotion(delta, forOperator) {
    const from = this.cursorPos();
    const to = this.linesFrom(from, delta);
    const moved = this.linesBetween(from, to);
    if (moved === 0 || (forOperator && moved < Math.abs(delta))) return null;
    const width = this.wrapWidth();
    const starts = this.lineStarts(to.row);
    const glyphs = this.rows[to.row] ?? [];
    const last = this.visual ? glyphs.length : lastCol(this.rows, to.row);
    const start = Math.min(starts[to.line], last);
    const end = to.line + 1 < starts.length ? starts[to.line + 1] - 1 : last;
    if (this.wantCol === Infinity) {
      const col = Math.min(end, start + width - 1);
      return { row: to.row, col, wantCol: Infinity, display: true };
    }
    const here = this.rows[from.row] ?? [];
    const hereStart = this.lineStarts(from.row)[this.lineOf(from.row, this.wantCol)];
    const cell = Math.min(
      width - 1,
      cellsOf(here.slice(hereStart, this.wantCol)) + Math.max(0, this.wantCol - here.length),
    );
    let col = start;
    for (let used = 0; col < glyphs.length && used + glyphCells(glyphs[col]) <= cell; col++) {
      used += glyphCells(glyphs[col]);
    }
    const wantCol = col + Math.max(0, cell - cellsOf(glyphs.slice(start, col)));
    return { row: to.row, col: Math.min(col, end), wantCol, display: true };
  }

  // The selection as an inclusive range for textOf(), or null.
  selection() {
    if (!this.visual || !this.anchor) return null;
    const [start, end] =
      comparePos(this.anchor, this.cursor) <= 0
        ? [this.anchor, this.cursor]
        : [this.cursor, this.anchor];
    if (this.visual !== "block") return { kind: this.visual, start, end };
    const left = Math.min(this.anchor.col, this.cursor.col);
    // $ widens a block to every line's end.
    const right = this.wantCol === Infinity ? Infinity : Math.max(this.anchor.col, this.cursor.col);
    return {
      kind: "block",
      start: { row: start.row, col: left },
      end: { row: end.row, col: right },
    };
  }

  // The columns of `row` to draw selected, inclusive [first, last], or null.
  // An empty line in a selection shows as one selected cell, as in Vim.
  selectedCols(row, selection) {
    if (!selection || row < selection.start.row || row > selection.end.row) return null;
    const last = lineLength(this.rows, row) - 1;
    if (selection.kind === "block") {
      if (selection.start.col > last) return null;
      return [selection.start.col, Math.min(selection.end.col, last)];
    }
    if (last < 0) return [0, 0];
    if (selection.kind === "line") return [0, last];
    const first = row === selection.start.row ? Math.min(selection.start.col, last) : 0;
    const end = row === selection.end.row ? Math.min(selection.end.col, last) : last;
    return [first, end];
  }

  toggleVisual(kind) {
    if (this.visual === kind) {
      this.visual = null;
      this.anchor = null;
      // Back onto the line from just past its end.
      this.cursor = {
        ...this.cursor,
        col: Math.min(this.cursor.col, lastCol(this.rows, this.cursor.row)),
      };
      return;
    }
    // Switching between kinds keeps the anchor, as in Vim.
    if (!this.visual) this.anchor = { ...this.cursor };
    this.visual = kind;
  }

  // o: to the other end. O: in a block, to the other corner on this line.
  swapSelectionEnds(sameLine) {
    if (!this.visual) return;
    const anchor = this.anchor;
    if (sameLine && this.visual === "block") {
      this.anchor = { row: anchor.row, col: this.cursor.col };
      this.moveCursor({ row: this.cursor.row, col: anchor.col });
    } else {
      this.anchor = { ...this.cursor };
      this.moveCursor(anchor);
    }
  }

  // The range y{motion} copies, from the cursor to `target`: Vim's rules,
  // including :help exclusive-linewise (an exclusive motion that ends at the
  // start of a line stops at the end of the one before, and copies whole
  // lines when it also started at or before its line's first non-blank).
  motionRange(target, type) {
    const row = this.clampRow(target.row);
    const to = { row, col: clamp(target.col ?? 0, 0, lineLength(this.rows, row)) };
    const [start, end] = comparePos(this.cursor, to) <= 0 ? [this.cursor, to] : [to, this.cursor];
    if (type === LINEWISE) return { kind: "line", start, end };
    if (type === INCLUSIVE) return { kind: "char", start, end };
    if (end.col === 0 && end.row > start.row) {
      const above = end.row - 1;
      if (start.col <= firstNonBlankIndex(this.rows, start.row)) {
        return { kind: "line", start, end: { row: above, col: 0 } };
      }
      return { kind: "char", start, end: { row: above, col: lineLength(this.rows, above) - 1 } };
    }
    return { kind: "char", start, end: { row: end.row, col: end.col - 1 } };
  }

  copy(range, cx) {
    const text = range ? textOf(this.rows, range) : "";
    if (!text) {
      this.message = "nothing to copy";
      return;
    }
    try {
      cx.write_to_clipboard(text);
      notify({ title: "Copied", body: plural(text.split("\n").length, "line"), level: "info" });
      this.close();
    } catch (err) {
      this.status = String(err?.message ?? err);
      notify({ title: "Copy failed", body: this.status, level: "error" });
    }
  }

  // --- keys ------------------------------------------------------------------

  onKeyDown(event, cx) {
    this.interacted = true;
    if (event.key === "escape" || keyToken(event) === "ctrl-[") {
      cx.stop_propagation();
      return this.escape(cx);
    }
    cx.stop_propagation();
    if (this.searching) {
      this.searchKey(event, cx);
      return cx.notify();
    }
    const token = keyToken(event);
    if (!token) return;
    this.message = null;
    if (this.jump) this.jumpKey(token);
    else this.feed(token, cx);
    if (this.wantsHistory(token)) this.requestHistory(cx);
    cx.notify();
  }

  escape(cx) {
    this.message = null;
    if (this.searching) this.cancelSearch();
    else if (this.jump) this.jump = null;
    else if (this.pendingKeys()) this.resetPending();
    else if (this.visual) this.toggleVisual(this.visual);
    else return this.close();
    cx.notify();
  }

  pendingKeys() {
    return `${this.operatorCount || ""}${this.operator ?? ""}${this.count || ""}${this.prefix ?? ""}`;
  }

  resetPending() {
    this.count = 0;
    this.operator = null;
    this.operatorCount = 0;
    this.prefix = null;
  }

  // The count for the command being finished (counts before and after an
  // operator multiply, as in Vim) and its operator; both are then cleared.
  takeCount() {
    const hasCount = this.count > 0 || this.operatorCount > 0;
    const count = Math.max(1, this.count) * Math.max(1, this.operatorCount);
    const operator = this.operator;
    this.resetPending();
    return { count, hasCount, operator };
  }

  // One key of normal or visual mode.
  feed(token, cx) {
    this.topOnLoad = false;
    if (this.prefix) return this.finishPrefix(token, cx);
    if (/^[0-9]$/.test(token) && (token !== "0" || this.count > 0)) {
      this.count = Math.min(MAX_COUNT, this.count * 10 + Number(token));
      return;
    }
    if (
      PREFIX_KEYS.has(token) ||
      ((token === "i" || token === "a") && (this.operator || this.visual))
    ) {
      this.prefix = token;
      return;
    }
    this.runCommand(token, cx);
  }

  finishPrefix(token, cx) {
    const prefix = this.prefix;
    this.prefix = null;
    if (REVERSE_FIND[prefix]) {
      if (Array.from(token).length !== 1) return this.resetPending();
      this.lastFind = { kind: prefix, ch: token };
      return this.applyMotion(findMotion(prefix, token, false), cx);
    }
    if (prefix === "i" || prefix === "a") return this.applyTextObject(prefix === "a", token, cx);
    this.runCommand(prefix + token, cx);
  }

  runCommand(token, cx) {
    if (MOTIONS[token]) return this.applyMotion(MOTIONS[token], cx);
    if (!this.visual && !this.operator && (token === "y" || token === "Y")) {
      // y waits for a motion; Y is y$.
      this.operatorCount = this.count;
      this.count = 0;
      this.operator = "y";
      if (token === "Y") this.applyMotion(MOTIONS.$, cx);
      return;
    }
    const { count, hasCount, operator } = this.takeCount();
    if (operator) {
      const end = token === "y" && this.rowBy(count - 1);
      if (end) this.copy({ kind: "line", start: this.cursor, end }, cx);
      return; // anything else cancels the operator
    }
    switch (token) {
      case "y":
        return this.copy(this.selection(), cx);
      case "Y": {
        const selection = this.selection();
        return this.copy(selection && { ...selection, kind: "line" }, cx);
      }
      case "enter":
        return this.copy(
          this.selection() ?? { kind: "line", start: this.cursor, end: this.cursor },
          cx,
        );
      case "v":
        return this.toggleVisual("char");
      case "V":
        return this.toggleVisual("line");
      case "ctrl-v":
        return this.toggleVisual("block");
      case "o":
      case "O":
        return this.swapSelectionEnds(token === "O");
      case "/":
      case "?":
        return this.startSearch(token === "/", count);
      case "s":
        return this.startJump();
      case "ctrl-d":
      case "ctrl-u":
        return this.scrollHalfPage(
          token === "ctrl-d" ? 1 : -1,
          hasCount ? count : Math.max(1, Math.floor(this.viewRows() / 2)),
        );
      case "ctrl-f":
      case "pagedown":
        return this.scrollPage(1, count);
      case "ctrl-b":
      case "pageup":
        return this.scrollPage(-1, count);
      case "ctrl-e":
        return this.scrollView(count);
      case "ctrl-y":
        return this.scrollView(-count);
      case "zz":
        return this.scrollCursorTo("middle");
      case "zt":
        return this.scrollCursorTo("top");
      case "zb":
        return this.scrollCursorTo("bottom");
      case "q":
        return this.close();
    }
  }

  applyMotion(motion, cx) {
    const { count, hasCount, operator } = this.takeCount();
    const target = this.rows.length ? motion.to(this, count, hasCount, Boolean(operator)) : null;
    if (!target) return;
    if (operator) return this.copy(this.motionRange(target, target.type ?? motion.type), cx);
    this.moveCursor(target, motion.vertical);
  }

  applyTextObject(around, token, cx) {
    const { count, operator } = this.takeCount();
    let range = null;
    if (token === "w" || token === "W") {
      // A selection of more than one glyph grows by the words beyond the
      // cursor, as in Vim; else the object is taken around the cursor.
      const order = this.visual ? comparePos(this.anchor, this.cursor) : 0;
      if (order !== 0) {
        const from = { row: this.cursor.row, col: this.cursor.col + Math.sign(-order) };
        const words = wordObject(this.rows, from, count, token === "W", around);
        if (words && from.col >= 0) this.moveCursor(order < 0 ? words.end : words.start);
        return;
      }
      range = wordObject(this.rows, this.cursor, count, token === "W", around);
    } else if (token === '"' || token === "'" || token === "`") {
      range = quoteObject(this.rows, this.cursor, token, around);
    } else if (BRACKET_OBJECTS[token]) {
      const [open, close] = BRACKET_OBJECTS[token];
      range = bracketObject(this.rows, this.cursor, open, close, count, around);
    }
    if (!range) return;
    if (operator) return this.copy({ kind: "char", ...range }, cx);
    // In a selection, the object becomes the (characterwise) selection.
    this.visual = "char";
    this.anchor = range.start;
    this.moveCursor(range.end);
  }

  // ; and , : the last f/F/t/T again, `reverse`d for ",".
  repeatFind(reverse, count) {
    if (!this.lastFind) return null;
    const kind = reverse ? REVERSE_FIND[this.lastFind.kind] : this.lastFind.kind;
    const target = findChar(this.rows, this.cursor, kind, this.lastFind.ch, count, true);
    return target && { ...target, type: kind === "f" || kind === "t" ? INCLUSIVE : EXCLUSIVE };
  }

  // --- search ----------------------------------------------------------------

  foldedLine(row) {
    if (this.foldedLines[row] === undefined) this.foldedLines[row] = foldCase(this.lines[row]);
    return this.foldedLines[row];
  }

  // Where `search` matches on `row`: [{ col, length }] in glyphs.
  matchesInRow(row, search) {
    const line = this.lines[row];
    if (line === undefined || !search.text) return [];
    if ("regex" in search) return this.patternMatchesInRow(row, search.regex);
    if (!line) return [];
    const haystack = search.ignoreCase ? this.foldedLine(row) : line;
    const needle = search.ignoreCase ? foldCase(search.text) : search.text;
    const length = Array.from(needle).length;
    const glyphs = this.rows[row];
    const oneUnitPerGlyph = glyphs.length === line.length; // no surrogate pairs
    const found = [];
    for (
      let at = haystack.indexOf(needle);
      at !== -1;
      at = haystack.indexOf(needle, at + needle.length)
    ) {
      const col = oneUnitPerGlyph ? at : Array.from(line.slice(0, at)).length;
      if (
        search.wholeWord &&
        (isKeywordChar(glyphs[col - 1]) || isKeywordChar(glyphs[col + length]))
      )
        continue;
      found.push({ col, length });
    }
    return found;
  }

  // Regex matches on `row`, in glyphs. An empty match (^, $, \b, x*) counts,
  // at its column with length 0, so the cursor can go there.
  patternMatchesInRow(row, regex) {
    if (!regex) return [];
    const line = this.lines[row];
    const oneUnitPerGlyph = this.rows[row].length === line.length; // no surrogate pairs
    const found = [];
    regex.lastIndex = 0;
    for (let match = regex.exec(line); match; match = regex.exec(line)) {
      const at = match.index;
      if (match[0] === "") regex.lastIndex = at + (line.codePointAt(at) > 0xffff ? 2 : 1);
      if (at >= line.length && line.length > 0) {
        // An empty match after the last glyph ($): Vim puts the cursor on
        // the last glyph.
        found.push({ col: this.rows[row].length - 1, length: 0 });
        break;
      }
      const col = oneUnitPerGlyph ? at : Array.from(line.slice(0, at)).length;
      found.push({ col, length: Array.from(match[0]).length });
    }
    return found;
  }

  // Matches of the search being typed, else of the last one, for n/N and to
  // draw.
  computeMatches() {
    this.matches = [];
    this.matchesByRow = new Map();
    const search = this.searching ? patternSearch(this.query, this.searchForward) : this.lastSearch;
    this.searchError = this.searching ? (search.error ?? null) : null;
    if (!search?.text) return;
    for (let row = 0; row < this.lines.length; row++) {
      const found = this.matchesInRow(row, search);
      if (!found.length) continue;
      this.matchesByRow.set(row, found);
      for (const { col, length } of found) this.matches.push({ row, col, length });
    }
  }

  // The count-th match after (or before) `from`, wrapping around the ends.
  nextMatch(from, forward, count) {
    const matches = this.matches;
    if (!matches.length) {
      this.message = this.lastSearch ? `not found: ${this.lastSearch.text}` : "no previous search";
      return null;
    }
    let index = -1;
    if (forward) index = matches.findIndex((match) => comparePos(match, from) > 0);
    else
      for (let i = matches.length - 1; i >= 0 && index === -1; i--) {
        if (comparePos(matches[i], from) < 0) index = i;
      }
    let wrapped = index === -1;
    if (wrapped) index = forward ? 0 : matches.length - 1;
    for (let n = 1; n < count; n++) {
      index += forward ? 1 : -1;
      if (index < 0 || index >= matches.length) {
        wrapped = true;
        index = (index + matches.length) % matches.length;
      }
    }
    if (wrapped)
      this.message = forward ? "search wrapped to the top" : "search wrapped to the bottom";
    const { row, col } = matches[index];
    return { row, col };
  }

  // * and #: the keyword under or after the cursor on its line, as a whole
  // word, ignoring case. Failing that, the run of punctuation there, as text.
  searchWordUnderCursor(forward, count) {
    const glyphs = this.rows[this.cursor.row] ?? [];
    let col = this.cursor.col;
    while (col < glyphs.length && !isKeywordChar(glyphs[col])) col++;
    const keyword = col < glyphs.length;
    if (!keyword) {
      col = this.cursor.col;
      while (col < glyphs.length && isBlank(glyphs[col])) col++;
      if (col >= glyphs.length) {
        this.message = "no word under the cursor";
        return null;
      }
    }
    const cls = charClass(glyphs[col], false);
    let start = col;
    while (start > 0 && charClass(glyphs[start - 1], false) === cls) start--;
    let end = col;
    while (end + 1 < glyphs.length && charClass(glyphs[end + 1], false) === cls) end++;
    const text = glyphs.slice(start, end + 1).join("");
    this.lastSearch = { text, forward, ignoreCase: true, wholeWord: keyword };
    this.computeMatches();
    return this.nextMatch({ row: this.cursor.row, col: start }, forward, count);
  }

  startSearch(forward, count = 1) {
    this.searching = true;
    this.searchForward = forward;
    this.searchCount = count;
    this.query = "";
    this.computeMatches();
  }

  // Typing on the / or ? line, drawn by the mod itself (like Vim's command
  // line) so it shares the terminal font: characters append; Backspace
  // deletes one, or cancels on an empty line; ctrl-w deletes a word, ctrl-u
  // everything; cmd-v pastes the clipboard's first line; Enter searches.
  searchKey(event, cx) {
    const modifiers = event.modifiers ?? {};
    if (modifiers.platform) {
      if (event.key === "v") this.query += (cx.read_from_clipboard() ?? "").split(/\r?\n/)[0];
      else return;
    } else {
      const token = keyToken(event);
      if (token === "enter") return this.commitSearch();
      if (token === "backspace" || token === "ctrl-h") {
        if (!this.query) return this.cancelSearch();
        this.query = Array.from(this.query).slice(0, -1).join("");
      } else if (token === "ctrl-u") this.query = "";
      else if (token === "ctrl-w") this.query = this.query.replace(/(\w+|[^\w\s]+)?\s*$/u, "");
      else if (token && !NAMED_KEYS.has(token) && !token.startsWith("ctrl-")) this.query += token;
      else return;
    }
    this.computeMatches();
  }

  cancelSearch() {
    this.searching = false;
    this.computeMatches();
  }

  // Enter: the typed text becomes the last search (an empty one repeats the
  // last search in the new direction), and the cursor goes to its next match.
  commitSearch() {
    this.searching = false;
    if (this.query) {
      const search = patternSearch(this.query, this.searchForward);
      if (search.error) {
        this.message = `invalid pattern: ${search.error}`;
        this.computeMatches();
        return;
      }
      this.lastSearch = search;
    } else if (this.lastSearch)
      this.lastSearch = { ...this.lastSearch, forward: this.searchForward };
    this.computeMatches();
    if (!this.lastSearch) return;
    const target = this.nextMatch(this.cursor, this.searchForward, this.searchCount);
    if (target) this.moveCursor(target);
  }

  // --- jump (s) --------------------------------------------------------------

  startJump() {
    this.jump = {
      query: "",
      targetsByLabel: new Map(),
      labelsByRow: new Map(),
      count: 0,
      only: null,
    };
  }

  // Matches of the typed text in view, smartcase. Labels (lowercase, drawn
  // one cell after each match) only become active from two characters on, so
  // the first two keystrokes always refine instead of jumping. A label is
  // never a character that follows a match, the likely next keystroke.
  updateJump() {
    const search = smartSearch(this.jump.query, true);
    const found = [];
    const following = new Set();
    const first = this.topPos();
    const last = this.lastPos();
    for (let row = first.row; row <= last.row && row < this.rows.length; row++) {
      for (const { col, length } of this.matchesInRow(row, search)) {
        const pos = { row, line: this.lineOf(row, col) };
        if (compareLines(pos, first) < 0 || compareLines(pos, last) > 0) continue;
        found.push({ row, col, length });
        const next = this.rows[row][col + length];
        if (next) following.add(next.toLowerCase());
      }
    }
    const targetsByLabel = new Map();
    const labelsByRow = new Map();
    if (Array.from(search.text).length >= 2) {
      const labels = Array.from(JUMP_LABELS).filter((label) => !following.has(label));
      found.slice(0, labels.length).forEach(({ row, col, length }, i) => {
        targetsByLabel.set(labels[i], { row, col });
        if (!labelsByRow.has(row)) labelsByRow.set(row, new Map());
        labelsByRow.get(row).set(col + length, labels[i]);
      });
    }
    this.jump = {
      ...this.jump,
      targetsByLabel,
      labelsByRow,
      count: found.length,
      only: found.length === 1 ? found[0] : null,
    };
  }

  jumpKey(token) {
    if (token === "backspace") {
      this.jump.query = Array.from(this.jump.query).slice(0, -1).join("");
      return this.updateJump();
    }
    if (Array.from(token).length !== 1) return; // arrows, ctrl keys: stay in the mode
    const labelled = this.jump.targetsByLabel.get(token);
    if (labelled) {
      this.jump = null;
      return this.moveCursor(labelled);
    }
    this.jump.query += token;
    this.updateJump();
    if (this.jump.only) {
      const only = this.jump.only;
      this.jump = null;
      this.moveCursor(only);
    }
  }

  // --- render ----------------------------------------------------------------

  // A display line's text is always one element, so it lays out the same
  // wherever the cursor is (splitting it into colored runs moved glyphs by
  // subpixels as the run boundaries changed). A selection is a box behind the
  // text; search matches, the cursor and jump labels are opaque cells drawn over
  // it (their own copy of the glyphs, in their own colors). All of them sit at
  // their cell offset × cell width, measured from the font (see renderProbe).
  renderLine(row, line, starts, selection, colors, font, size, height) {
    const glyphs = this.rows[row] ?? [];
    const cellWidth = this.cellWidth || size * 0.6;
    const start = starts[line];
    const end = line + 1 < starts.length ? starts[line + 1] - 1 : Infinity; // inclusive
    const shown = glyphs.slice(start, end + 1);
    const leftOf = (col) => cellsOf(glyphs.slice(start, col));
    const inLine = (col) => col >= start && col <= end;
    // Clips an inclusive column span to this display line, or null when outside.
    const clip = ([first, last]) =>
      first > end || last < start ? null : [Math.max(first, start), Math.min(last, end)];
    const box = (first, last, background) =>
      div()
        .absolute()
        .top(0)
        .left(leftOf(first) * cellWidth)
        .w(Math.max(1, cellsOf(glyphs.slice(first, last + 1))) * cellWidth)
        .h(height)
        .bg(background);
    const cells = (col, text, background, foreground) =>
      div()
        .absolute()
        .top(0)
        .left(leftOf(col) * cellWidth)
        .w(cellsOf(Array.from(text)) * cellWidth)
        .h(height)
        .bg(background)
        .text_color(foreground)
        .child(text);
    const cell = (col, text) => cells(col, text, colors.accent, colors.accent_foreground);
    const behind = [];
    const selected = this.selectedCols(row, selection);
    const selectedHere = selected && clip(selected);
    if (selectedHere) behind.push(box(selectedHere[0], selectedHere[1], colors.selection));
    // Search matches are opaque, dark text on the terminal's yellow (as Vim's
    // default Search highlight), so they read well and differ from a selection.
    // As in Vim, the selection wins where they overlap: only the parts of a
    // match outside it are drawn.
    const over = [];
    for (const { col, length } of this.matchesByRow.get(row) ?? []) {
      for (const span of spansOutside(col, col + length - 1, selected)) {
        const here = clip(span);
        if (!here) continue;
        const text = glyphs.slice(here[0], here[1] + 1).join("");
        over.push(cells(here[0], text, colors.ansi3, colors.background));
      }
    }
    if (row === this.cursor.row) {
      const col = Math.min(this.cursor.col, glyphs.length);
      if (inLine(col)) over.push(cell(col, glyphs[col] ?? " "));
    }
    for (const [col, label] of this.jump?.labelsByRow?.get(row) ?? []) {
      if (inLine(col)) over.push(cell(col, label));
    }
    return div()
      .relative()
      .h(height)
      .flex_none()
      .whitespace_nowrap()
      .font_family(font)
      .text_size(size)
      .line_height(`${height}px`)
      .text_color(colors.foreground)
      .children(behind)
      .child(div().absolute().top(0).left(0).h(height).child(shown.join("")))
      .children(over);
  }

  // An invisible run of PROBE_CELLS glyphs whose width gives the font's cell advance.
  renderProbe(font, size, height) {
    return div()
      .id("copy-mode-probe")
      .absolute()
      .top(0)
      .left(0)
      .invisible()
      .whitespace_nowrap()
      .font_family(font)
      .text_size(size)
      .line_height(`${height}px`)
      .on_size_change((bounds, cx) => {
        const width = bounds.width / PROBE_CELLS;
        if (width > 0 && Math.abs(width - this.cellWidth) > 0.001) {
          this.cellWidth = width;
          cx.notify();
        }
      })
      .child("0".repeat(PROBE_CELLS));
  }

  modeName() {
    if (this.jump) return "JUMP";
    if (this.visual === "char") return "VISUAL";
    if (this.visual === "line") return "V-LINE";
    if (this.visual === "block") return "V-BLOCK";
    return "NORMAL";
  }

  // The mode badge's [background, foreground]: yellow is left to search matches.
  modeColors(colors) {
    if (this.jump) return [colors.ansi2, colors.background];
    if (this.visual) return [colors.ansi5, colors.background];
    return [colors.accent, colors.accent_foreground];
  }

  statusNote() {
    if (this.status) return this.status;
    if (this.message) return this.message;
    if (this.loadingHistory) return "loading history…";
    return this.note ?? "";
  }

  render(cx) {
    const colors = theme();
    const font = fontFamily();
    const size = fontSize();
    const height = lineHeight();
    this.scrollToCursor();
    const selection = this.selection();
    const children = [this.renderProbe(font, size, height)];
    let room = this.viewRows();
    for (let row = this.top, line = this.topLine; room > 0 && row < this.rows.length; row++) {
      const starts = this.lineStarts(row);
      for (; room > 0 && line < starts.length; line++, room--) {
        children.push(this.renderLine(row, line, starts, selection, colors, font, size, height));
      }
      line = 0;
    }
    const position = this.rows.length
      ? `${this.cursor.row + 1}/${this.rows.length}:${this.cursor.col + 1}`
      : "—";
    const pending = this.pendingKeys();
    return v_flex()
      .id("copy-mode")
      .size_full()
      .key_context(KEY_CONTEXT)
      .on_action(ESCAPE_ACTION, (_event, cx) => this.escape(cx))
      .track_focus(this.handle)
      .on_key_down((event, cx) => this.onKeyDown(event, cx))
      .on_mouse_down("left", (_e, cx) => {
        this.interacted = true;
        if (!this.handle.is_focused()) this.handle.focus();
        cx.stop_propagation();
      })
      .on_size_change((bounds, cx) => {
        // Take the keyboard once laid out, unless the person got there first
        // or another copy now owns keys.capturing.
        if (!this.mounted) {
          this.mounted = true;
          cx.timer.after(32, () => {
            const overlay = props()?.overlay;
            if (this.closed || this.interacted) return;
            if (overlay && shared("keys.capturing")?.ts !== this.capture?.ts) return;
            if (!this.handle.is_focused()) this.handle.focus();
          });
        }
        this.viewHeight = bounds.height;
        this.viewWidth = bounds.width;
        cx.notify();
      })
      .gap(0)
      .overflow_hidden()
      .child(
        // Padding here, not on the root, so the status line runs edge to edge.
        v_flex()
          .flex_1()
          .min_h(0)
          .p(PADDING)
          .child(v_flex().relative().flex_1().min_h(0).overflow_hidden().gap(0).children(children)),
      )
      .child(this.renderStatusLine(colors, font, size, position, pending));
  }

  // Vim's bottom line, as a band lighter than both the dialog and the dimmed
  // pane behind it, with a rule above: while searching, the / or ? prompt and
  // the pattern; otherwise a badge colored for the mode and any message on the
  // left, typed keys and the cursor position on the right.
  renderStatusLine(colors, font, size, position, pending) {
    const line = h_flex()
      .h(statusLineHeight())
      .flex_none()
      .items_center()
      .gap(12)
      .pr(PADDING)
      .bg(colors.raised)
      .border_t_1()
      .border_color(colors.input)
      .font_family(font)
      .text_size(size)
      .line_height(`${lineHeight()}px`);
    if (this.searching) {
      // The prompt, the pattern and a block cursor, run together as in Vim.
      return line
        .pl(PADDING)
        .child(
          h_flex()
            .flex_1()
            .min_w(0)
            .overflow_hidden()
            .text_color(colors.foreground)
            .child(
              div()
                .whitespace_nowrap()
                .child(`${this.searchForward ? "/" : "?"}${this.query}`),
            )
            .child(
              div()
                .w(this.cellWidth || size * 0.6)
                .h(lineHeight())
                .flex_none()
                .bg(colors.accent),
            ),
        )
        .child(
          this.searchError
            ? div().text_color(colors.blocked).child(this.searchError)
            : div()
                .text_color(colors.muted)
                .child(plural(this.matches.length, "match", "matches")),
        );
    }
    const jump = this.jump?.query ? `${this.jump.query}  (${this.jump.count})` : "";
    const [badgeBackground, badgeForeground] = this.modeColors(colors);
    return line
      .child(
        h_flex()
          .h_full()
          .flex_none()
          .items_center()
          .px(PADDING)
          .bg(badgeBackground)
          .text_color(badgeForeground)
          .font_semibold()
          .child(this.modeName()),
      )
      .when(Boolean(jump), (el) => el.child(div().text_color(colors.accent).child(jump)))
      .child(
        div()
          .flex_1()
          .truncate()
          .text_color(this.status ? colors.blocked : colors.muted)
          .child(this.statusNote()),
      )
      .when(Boolean(pending), (el) => el.child(div().text_color(colors.accent).child(pending)))
      .child(div().text_color(colors.muted).child(position));
  }
}
