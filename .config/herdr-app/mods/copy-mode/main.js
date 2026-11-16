/**
 * Copy mode: vim keys for moving around a terminal's text, searching,
 * selecting and copying to the clipboard, right in the terminal's own pane.
 *
 * Adapted from the copy-mode mod in github.com/ParadiseWitch/herdr-mods
 * (commit 932f429) and since substantially rewritten: macOS clipboard, focus
 * handed back to the terminal on close, a much larger set of vim keys (counts,
 * operators, text objects), and (with herdr-app 0.1.16's terminal.select,
 * terminal.adjust_selection and the selection in terminals()) drawn by the
 * terminal itself instead of in a dialog.
 *
 * Opening: keys.json binds `cmd-x` (section `terminal`) to
 * `mod.open:copy-mode`, and the prefix mod runs the same on `ctrl-o [`. Either
 * opens this mod as the window mod.json describes: a slim status strip with no
 * frame, which takes the keyboard but leaves the terminal in view. Herdr
 * remembers where the strip was dragged to (its overlay `key`). Clicking
 * anywhere else, which takes the keyboard from the strip, ends copy mode.
 *
 * Drawing: the cursor and any selection are the terminal's own text selection,
 * so they look as a mouse selection does: the cursor is a one-cell selection.
 * The view is the terminal's own too, scrolled with terminal.scroll. A mod
 * can't draw on a terminal, so search matches aren't highlighted; instead the
 * match the cursor lands on is selected until the next key, and while a
 * search is typed the match it would go to is.
 *
 * Text: `hc read --json` gives the terminal's text as logical lines (a line
 * wider than the terminal comes back whole), while the selection addresses
 * cells: rows from the oldest retained history through the screen, columns
 * across the terminal. Opening reads the program's cursor cell
 * (terminal.select at "cursor") and the last row with text in it
 * (adjust_selection "end"), then the text: the screen and all of its history
 * on the normal screen, just the screen in a full-screen app (the alternate
 * screen has no history, and reading one scrolls the app). Each line is
 * wrapped at the terminal's width as the terminal wraps it, and the lines are
 * stacked up from that last row; blank lines fill the rows above and below so
 * that line and row numbers agree with the terminal's. The text is a snapshot:
 * output that arrives later isn't in it.
 *
 * Wrapping: as with Vim's 'wrap', j and k move by whole lines and gj and gk by
 * the terminal's rows; the scrolling keys (ctrl-e, ctrl-d, ctrl-f...) also
 * move by rows, unlike Vim's, so a line taller than the view can still be
 * read through. A line copies as the one line it is.
 *
 * Keys. {count} is an optional number typed first (3j, 2w, 5G, y3e).
 *
 *   Motions: move the cursor, extend a selection, or follow y
 *     h j k l, arrows   left, down, up, right (also Backspace, Space)
 *     gj gk             down / up a row, within a wrapped line
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
 *   Search
 *     / ?               search forward / backward for a JavaScript regular
 *                       expression, typed on the strip; smartcase (an
 *                       upper-case letter, unless escaped as in \S, makes it
 *                       case-sensitive); Backspace deletes (on an empty line,
 *                       cancels), ctrl-w a word, ctrl-u all, cmd-v pastes; Enter
 *                       accepts, Esc cancels, an empty search repeats the last.
 *                       * and # match their text literally. The strip shows
 *                       which match the cursor is on, as [3/17].
 *
 *   Selecting
 *     v V               characterwise / linewise selection; the same key again
 *                       ends it, the other switches kind keeping the anchor
 *     o O               go to the other end of the selection
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
 *     Enter, cmd-c      the selection, or else the cursor line
 *
 *   Esc, ctrl-[         cancel a pending key, the search or the selection;
 *                       with nothing to cancel, close
 *   q                   close
 *
 * Where it differs from Vim: columns are glyphs, so a wide (CJK) glyph or
 * emoji counts as one column; / and ? take JavaScript regex syntax, not Vim's
 * (\d+ and (a|b), not \v or \<); a whitespace-only line counts as blank for {
 * and }; word objects and their counts stay on the cursor's line; in a
 * selection the end of a line (after $) shows on its last glyph, though it
 * copies the line break; and a copy never ends with a line break, so a pasted
 * line doesn't run in a shell. Every other motion above was checked against
 * nvim.
 */
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import {
  checking,
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
  terminals,
  theme,
} from "herdr";

// History rows read at most: the view's own history is usually shorter.
const MAX_HISTORY = 10000;
const MAX_COUNT = 99999;
// How long after our last command the terminal's reported selection and
// scroll can be trusted: they are reported a frame or so after a command.
const SETTLE_MS = 250;
// How long to wait for the terminal to report a selection while opening.
const REPORT_TIMEOUT_MS = 500;

// The strip is drawn in the terminals' font, like Vim's status line.
const fontFamily = () => settings().font_family ?? "JetBrains Mono";
const fontSize = () => {
  const size = settings().font_size;
  return typeof size === "number" && size > 0 ? size : 14;
};

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

// The text of an inclusive range. kind is "char" (from start to end) or "line"
// (whole lines). Lines join with "\n" and
// there is no trailing newline, so a pasted line doesn't run in a shell.
function textOf(rows, { kind, start, end }) {
  const out = [];
  for (let row = start.row; row <= end.row; row++) {
    const glyphs = rows[row] ?? [];
    if (kind === "line") out.push(glyphs.join(""));
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
    to: (m, n, has) => ({ row: has ? n - 1 : 0 }),
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


const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// --- cells ------------------------------------------------------------------
//
// The terminal's selection addresses cells, { row, col }: rows from the oldest
// retained history through the screen, columns across the terminal.

const sameCell = (a, b) => Boolean(a && b) && a.row === b.row && a.col === b.col;
const sameSelection = (a, b) =>
  a === b || (Boolean(a && b) && sameCell(a.start, b.start) && sameCell(a.end, b.end));

// The text of a terminal `cols` wide with rows 0..total-1, given its lines as
// `hc read` returns them: whole lines, the last one ending on row `lastRow`
// (null: the first one starting on row 0, as on the alternate screen). Lines
// that would start above row 0 are gone from the terminal, so they are
// dropped; blank lines fill the rows above and below the text, so that each
// line starts on the row the terminal shows it on. Returns those lines and
// `first`, the first one read: the rows above it are filler, for the terminal
// may show text there that hc read didn't return (its history lost).
function layoutText(lines, cols, total, lastRow) {
  const counts = lines.map((line) => wrapStarts(Array.from(line), cols).length);
  let first = lastRow === null ? 0 : lastRow + 1 - counts.reduce((sum, n) => sum + n, 0);
  let drop = 0;
  while (first < 0 && drop < lines.length) first += counts[drop++];
  const kept = lines.slice(drop);
  const rows = counts.slice(drop).reduce((sum, n) => sum + n, 0);
  const above = Math.max(0, first);
  const below = Math.max(0, total - above - rows);
  return { lines: [...Array(above).fill(""), ...kept, ...Array(below).fill("")], first: above };
}

export default class CopyMode extends View {
  // Defaults for every field render touches: a hot reload can render before
  // init has finished, and that must not break the strip.
  lines = []; // the text, a string per line
  rows = []; // the same, as glyph arrays (see "text" above)
  foldedLines = []; // lower-cased lines, filled in as searches need them
  cursor = { row: 0, col: 0 };
  wantCol = 0; // the column j and k aim for; Infinity after $
  top = 0; // first line in view
  topLine = 0; // which of that line's display lines (terminal rows) the view starts on
  viewLen = 0; // rows the terminal shows
  cols = Infinity; // the terminal's width in cells; Infinity (no wrapping) until known
  starts = new Map(); // wrapStarts of each line, for startsWidth cells
  startsWidth = 0;
  rowStarts = null; // the terminal row each line starts on (rowStartTable)
  totalRows = 0; // rows the text takes, which are the terminal's
  firstRow = 0; // the first line read; the cursor stays off the filler above it
  padded = null; // { row, length }: a line given blanks out to the program's cursor
  visual = null; // null, "char" or "line"
  anchor = null; // the selection's other end
  // Keys typed toward a command: [operatorCount] [operator] [count] [prefix].
  count = 0;
  operator = null; // "y" while it waits for a motion or text object
  operatorCount = 0;
  prefix = null; // "g", "z", "f", "F", "t", "T", "i" or "a"
  lastFind = null; // { kind, ch } of the last f/F/t/T
  searching = false; // the search prompt is up
  searchError = null; // why the pattern being typed is invalid
  searchForward = true;
  searchCount = 1; // a count typed before / or ?
  searchView = null; // the view when the search started, to go back to on Esc
  query = "";
  lastSearch = null; // { text, forward, ignoreCase, wholeWord }
  matches = []; // [{ row, col, length }] in text order
  preview = null; // the match a search being typed would go to
  landed = null; // the match the last key moved the cursor to
  flash = null; // that match, shown selected until the next key
  target = null; // the terminal copied from
  alt = false; // it shows the alternate screen (no history, no scrolling)
  wasAtBottom = true; // its view was at the end when copy mode opened
  native = null; // the terminal's selection as we last set it: { start, end } cells
  viewTop = null; // the terminal's top row in view as we last set it
  lastCommandAt = 0;
  status = "loading…"; // an error, shown in place of the strip's note
  message = null; // feedback for the last key, until the next
  note = null; // why history is incomplete
  loading = false;
  handle = null; // the focus handle, from init
  hadFocus = false;
  interacted = false; // a key or click arrived, so don't grab focus on mount
  mounted = false;
  closed = false;

  init(_props, cx) {
    this.handle = cx.focus_handle();
    // herdr-app check renders the strip once; leave the terminals alone.
    if (checking()) {
      this.status = null;
      return;
    }
    // The strip holds the keyboard, but focused() still names the terminal
    // under it; after a reload the last target keeps copy mode working.
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
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        await this.load(cx);
        this.status = null;
      } catch (err) {
        this.status = String(err?.message ?? err);
      }
      this.loading = false;
      cx.notify();
    });
    cx.timer.every(250, (cx) => this.watch(cx));
  }

  terminalInfo() {
    return terminals().find((terminal) => terminal.address === this.target) ?? null;
  }

  paneInfo() {
    return panes().find((pane) => pane.terminal === this.target) ?? null;
  }

  async load(cx) {
    const term = this.terminalInfo();
    const pane = this.paneInfo();
    if (!term || !pane) throw new Error("the terminal isn't shown in a pane");
    const cols = Number(term.cols);
    if (!(cols > 0)) throw new Error("the terminal's width is unknown");
    const scroll = pane.scroll ?? null;
    this.alt = !scroll;
    const total = scroll ? scroll.total : Number(term.rows);
    const offset = scroll ? scroll.offset : 0;
    this.viewLen = scroll ? scroll.len : Number(term.rows);
    this.wasAtBottom = !scroll || scroll.from_bottom === 0;
    const mouse = term.selection ?? null;
    // The program's cursor; then the last row with text, where the text read
    // below ends. (end also scrolls the view to the end; placeView puts it back.)
    this.command("terminal.select", { at: "cursor" });
    const atCursor = await this.reported(cx, mouse);
    let lastRow = null;
    if (!this.alt) {
      this.command("terminal.adjust_selection", { direction: "end" });
      lastRow = (await this.reported(cx, atCursor))?.end.row ?? total - 1;
    }
    this.native = this.terminalInfo()?.selection ?? null;
    const history = this.alt ? 0 : Math.min(MAX_HISTORY, Math.max(0, total - this.viewLen));
    const read = await this.readTerminal(history);
    if (this.closed) return;
    if (!read.complete) {
      this.note =
        read.why === "working"
          ? "no history while the agent works"
          : `history incomplete${read.why ? ` (${read.why})` : ""}`;
    }
    this.cols = cols;
    const { lines, first } = layoutText(read.lines, cols, total, lastRow);
    this.setLines(lines);
    this.firstRow = first;
    // A row or so above the text is usual (a blank row hc read leaves out);
    // more means the terminal shows text whose history is gone from hc read.
    if (first > 1) this.note = `can't read above line ${first + 1}`;
    // Start on a mouse selection, else at the program's cursor, else (the view
    // scrolled back) at the bottom of the view.
    if (mouse) {
      this.visual = "char";
      this.anchor = this.posAtCell(mouse.start);
      this.cursor = this.posAtCell(mouse.end);
    } else if (this.wasAtBottom && atCursor) {
      this.padToCell(atCursor.end);
      this.cursor = this.posAtCell(atCursor.end);
    } else {
      this.cursor = this.posAtCell({ row: offset + this.viewLen - 1, col: 0 });
    }
    if (this.cursor.row < first) this.cursor = { row: first, col: 0 };
    if (this.anchor && this.anchor.row < first) this.anchor = { row: first, col: 0 };
    this.wantCol = this.cursor.col;
    this.setTop(this.displayPosAt(offset));
    this.scrollToCursor();
    this.loading = false;
    this.sync();
  }

  // The terminal's selection once it reports one other than `previous`, or
  // whatever it reports after a while.
  async reported(cx, previous) {
    const deadline = Date.now() + REPORT_TIMEOUT_MS;
    for (;;) {
      const selection = this.terminalInfo()?.selection ?? null;
      if ((selection && !sameSelection(selection, previous)) || Date.now() > deadline) return selection;
      await cx.sleep(16);
    }
  }

  // The terminal's last `history` lines plus its screen (0: just the screen),
  // trailing blank lines dropped. JSON, because plain output appends notes such
  // as "[hc] incomplete: older output may be missing" to the text, where
  // they'd read as terminal output; here they become a note on the strip.
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

  // The program's cursor usually sits on a blank cell past the text, which hc
  // read leaves out: blanks put back out to `cell` let copy mode start on that
  // very cell, as WezTerm's does. They're left out of anything copied.
  padToCell(cell) {
    const { row } = this.displayPosAt(cell.row);
    if (row < this.firstRow) return;
    const missing = Math.min(cell.col, this.cols - 1) + 1 - this.glyphCellsAt(cell.row).end;
    if (missing <= 0) return;
    const length = this.rows[row].length;
    const lines = [...this.lines];
    lines[row] += " ".repeat(missing);
    const firstRow = this.firstRow;
    this.setLines(lines);
    this.firstRow = firstRow;
    this.padded = { row, length };
  }

  // The text to copy from: the lines as read, without padToCell's blanks.
  copyRows() {
    if (!this.padded) return this.rows;
    const rows = [...this.rows];
    rows[this.padded.row] = rows[this.padded.row].slice(0, this.padded.length);
    return rows;
  }

  setLines(lines) {
    this.lines = lines;
    this.rows = lines.map((line) => Array.from(line));
    this.foldedLines = [];
    this.starts = new Map();
    this.rowStarts = null;
  }

  // Every 250 ms: clicking anywhere else takes the keyboard from the strip,
  // which ends copy mode, leaving any selection made with the mouse. A
  // terminal that changed width has rewrapped its text, which ends it too.
  watch(_cx) {
    if (this.closed || this.loading) return;
    const term = this.terminalInfo();
    if (this.rows.length && term && Number(term.cols) !== this.cols) {
      notify({ title: "Copy mode ended", body: "The terminal was resized", level: "info" });
      return this.finish();
    }
    if (this.handle.is_focused()) this.hadFocus = true;
    else if (this.hadFocus) {
      const settled = Date.now() - this.lastCommandAt > SETTLE_MS;
      const ours = !settled || sameSelection(term?.selection ?? null, this.native);
      this.finish({ refocus: false, keepSelection: !ours });
    }
  }

  // Herdr's cleanup hook: the window went some other way (a layout switch).
  close() {
    this.finish({ refocus: false, fromHost: true });
  }

  // Ends copy mode: the terminal's selection cleared (unless it's no longer
  // ours), its view back at the end if that's where it was, the strip closed
  // and the keyboard handed back to the terminal.
  finish({ refocus = true, keepSelection = false, fromHost = false } = {}) {
    if (this.closed) return;
    this.closed = true;
    if (this.target && this.native && !keepSelection) this.command("terminal.clear_selection", {});
    if (this.target && this.wasAtBottom && !this.alt && this.viewTop !== null)
      this.command("terminal.scroll", { to: "bottom" });
    const overlay = props()?.overlay;
    if (overlay && !fromHost) closeOverlay(overlay);
    if (refocus && this.target) run("pane.focus", { terminal: this.target });
  }

  command(name, args) {
    run(name, { terminal: this.target, ...args });
    this.lastCommandAt = Date.now();
  }

  // --- the terminal: cells, its selection and its view ------------------------

  viewRows() {
    return Math.max(1, this.viewLen || 24);
  }

  wrapWidth() {
    return this.cols;
  }

  // wrapStarts of `row` at the terminal's width.
  baseStarts(row) {
    const width = this.wrapWidth();
    if (width !== this.startsWidth) {
      this.starts = new Map();
      this.startsWidth = width;
      this.rowStarts = null;
    }
    let starts = this.starts.get(row);
    if (!starts) {
      starts = wrapStarts(this.rows[row] ?? [], width);
      this.starts.set(row, starts);
    }
    return starts;
  }

  // The terminal row each line starts on.
  rowStartTable() {
    this.baseStarts(0);
    if (!this.rowStarts) {
      let row = 0;
      this.rowStarts = this.rows.map((_, i) => {
        const start = row;
        row += this.baseStarts(i).length;
        return start;
      });
      this.totalRows = row;
    }
    return this.rowStarts;
  }

  // The terminal row of a display position.
  cellRowOf({ row, line }) {
    const table = this.rowStartTable();
    return (table[row] ?? 0) + Math.min(line, this.baseStarts(row).length - 1);
  }

  // The display position at terminal row `cellRow`.
  displayPosAt(cellRow) {
    const table = this.rowStartTable();
    if (!table.length) return { row: 0, line: 0 };
    const target = clamp(cellRow, 0, this.totalRows - 1);
    let low = 0;
    let high = table.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (table[mid] <= target) low = mid;
      else high = mid - 1;
    }
    return { row: low, line: Math.min(target - table[low], this.baseStarts(low).length - 1) };
  }

  // The cell glyph `pos` starts on; past a line's end, its last glyph's.
  cellOf(pos) {
    const row = this.clampRow(pos.row);
    const glyphs = this.rows[row] ?? [];
    const col = clamp(pos.col, 0, Math.max(0, glyphs.length - 1));
    const starts = this.baseStarts(row);
    let line = starts.length - 1;
    while (line > 0 && starts[line] > col) line--;
    const cell = cellsOf(glyphs.slice(starts[line], col));
    return { row: this.cellRowOf({ row, line }), col: Math.min(cell, this.cols - 1) };
  }

  // The glyph shown in a cell (the nearest, past the end of a row's text).
  posAtCell(cell) {
    const { row, line } = this.displayPosAt(cell.row);
    const glyphs = this.rows[row] ?? [];
    const starts = this.baseStarts(row);
    const end = line + 1 < starts.length ? starts[line + 1] : glyphs.length;
    let col = starts[line] ?? 0;
    for (let used = 0; col < end - 1 && used + glyphCells(glyphs[col]) <= cell.col; col++) {
      used += glyphCells(glyphs[col]);
    }
    return { row, col: Math.min(col, lastCol(this.rows, row)) };
  }

  // The cell each glyph on terminal row `cellRow` starts on, in order, and
  // (as .end) the first cell past them: the terminal's glyphs, so not
  // padToCell's blanks.
  glyphCellsAt(cellRow) {
    const { row, line } = this.displayPosAt(cellRow);
    const glyphs = (this.padded?.row === row ? this.copyRows() : this.rows)[row] ?? [];
    const starts = this.baseStarts(row);
    const end = line + 1 < starts.length ? starts[line + 1] : glyphs.length;
    const cells = [];
    let used = 0;
    for (let col = starts[line] ?? 0; col < end; col++) {
      cells.push(used);
      used += glyphCells(glyphs[col]);
    }
    cells.end = used; // the first cell after the text
    return cells;
  }

  // The last terminal row with anything but blanks on it, where
  // adjust_selection's "end" goes.
  lastTextRow() {
    for (let row = this.rows.length - 1; row >= 0; row--) {
      const glyphs = this.rows[row];
      if (glyphs.some((glyph) => !isBlank(glyph))) {
        const starts = this.baseStarts(row);
        let line = starts.length - 1;
        while (line > 0 && glyphs.slice(starts[line]).every(isBlank)) line--;
        return this.cellRowOf({ row, line });
      }
    }
    return 0;
  }

  // What the terminal should show selected: the match a search would go to or
  // just went to, the selection, or the cursor as one cell. A line selection
  // runs from edge to edge of its rows, as a triple click's does.
  wantedSelection() {
    const span = this.searching ? this.preview : this.visual ? null : this.flash;
    if (span) {
      const last = { row: span.row, col: span.col + Math.max(1, span.length) - 1 };
      return { start: this.cellOf(span), end: this.cellOf(last) };
    }
    if (this.visual === "line" && this.anchor) {
      const first = (row) => this.rowStartTable()[row] ?? 0;
      const last = (row) => first(row) + this.baseStarts(row).length - 1;
      const right = this.cols - 1;
      return this.cursor.row >= this.anchor.row
        ? { start: { row: first(this.anchor.row), col: 0 }, end: { row: last(this.cursor.row), col: right } }
        : { start: { row: last(this.anchor.row), col: right }, end: { row: first(this.cursor.row), col: 0 } };
    }
    const end = this.cellOf(this.cursor);
    if (!this.visual || !this.anchor) return { start: end, end };
    return { start: this.cellOf(this.anchor), end: this.reachable(end) };
  }

  // Where adjust_selection can take the selection's end nearest `cell`: on a
  // blank cell past a row's text (padToCell's), only its last glyph is, or
  // the row's start or last cell.
  reachable(cell) {
    const cells = this.glyphCellsAt(cell.row);
    if (cell.col < cells.end || cell.col === 0 || cell.col === this.cols - 1) return cell;
    return { row: cell.row, col: cells.length ? cells[cells.length - 1] : 0 };
  }

  // Shows the cursor, selection and view in the terminal: a new selection
  // where its start moves, else its end walked to where it should be.
  sync() {
    if (this.loading || this.closed || !this.target || !this.rows.length) return;
    const want = this.wantedSelection();
    // A one-cell cursor is selected afresh, as it may stand where only select
    // can put it (past the text).
    const one = sameCell(want.start, want.end) && !sameSelection(this.native, want);
    if (!this.native || !sameCell(this.native.start, want.start) || one) {
      this.command("terminal.select", { at: want.start });
      this.native = { start: want.start, end: want.start };
    }
    const moved = !sameCell(this.native.end, want.end);
    if (moved) this.moveEnd(this.native.end, want.end);
    this.native = want;
    this.placeView(moved);
  }

  // Walks the selection's moving end with terminal.adjust_selection, which
  // goes a cell or a row at a time. Up and down (and a page, the view's
  // height) keep the column, even past the end of a row's text, so first the
  // row: by pages and rows, overshooting by a page and stepping back when
  // that's shorter, and starting from the first row (home) or the last with
  // text in it (end) when that's nearer.
  // Then across, from glyph to glyph: from where the end is, if that's a
  // glyph's start; from the row's start (line_start); or from its end, as
  // line_end goes past the text and left from there lands on the last glyph
  // (when that's one cell wide; right from the last glyph would go on to the
  // next row).
  moveEnd(start, to) {
    const adjust = (direction, times = 1) => {
      for (let n = 0; n < times; n++) this.command("terminal.adjust_selection", { direction });
    };
    const page = this.viewRows();
    // The pages and rows from `row` to the target row, and what they cost.
    const vertical = (row) => {
      const distance = Math.abs(to.row - row);
      const sign = to.row > row ? 1 : -1;
      let pages = Math.floor(distance / page);
      const past = row + sign * (pages + 1) * page;
      if (distance - pages * page > page / 2 && past >= 0 && past < this.totalRows) pages++;
      const rows = Math.abs(to.row - (row + sign * pages * page));
      return { row, sign, pages, rows, cost: pages + rows };
    };
    let from = start;
    let plan = vertical(from.row);
    const lastRow = this.lastTextRow();
    for (const [direction, cell] of [["home", { row: 0, col: 0 }], ["end", { row: lastRow, col: this.cols - 1 }]]) {
      const other = vertical(cell.row);
      if (other.cost + 1 < plan.cost) {
        adjust(direction);
        from = cell;
        plan = other;
      }
    }
    adjust(plan.sign > 0 ? "page_down" : "page_up", plan.pages);
    const row = plan.row + plan.sign * plan.pages * page;
    adjust(to.row > row ? "down" : "up", plan.rows);
    if (from.col === to.col) return;
    const cells = this.glyphCellsAt(to.row);
    const target = cells.indexOf(to.col);
    if (target === -1) return adjust(to.col === 0 ? "line_start" : "line_end");
    const at = cells.indexOf(from.col);
    const last = cells.length - 1;
    const fromHere = at === -1 ? Infinity : Math.abs(target - at);
    const fromStart = 1 + target;
    const fromEnd = cells.end - cells[last] === 1 && cells.end < this.cols ? 2 + last - target : Infinity;
    if (fromHere <= Math.min(fromStart, fromEnd)) return adjust(target > at ? "right" : "left", fromHere);
    if (fromStart <= fromEnd) {
      adjust("line_start");
      return adjust("right", target);
    }
    adjust("line_end");
    adjust("left", 1 + last - target);
  }

  // Puts the terminal's view where ours is. Scrolling is relative and the
  // terminal reports its scroll a frame late, so this goes to the top first;
  // `force`: the selection's end moved, and the terminal's view follows it.
  placeView(force) {
    if (this.alt) return;
    const max = Math.max(0, this.totalRows - this.viewRows());
    const top = clamp(this.cellRowOf(this.topPos()), 0, max);
    if (!force && top === this.viewTop) return;
    this.command("terminal.scroll", { to: "top" });
    if (top > 0) this.command("terminal.scroll", { lines: top });
    this.viewTop = top;
  }

  // Before a key: take up changes made outside copy mode, once the terminal
  // has reported our own. A selection that isn't as we set it is what the
  // terminal has (the next sync starts over from it); a view scrolled with the
  // wheel is where the view is, the cursor pulled into it.
  adopt() {
    if (Date.now() - this.lastCommandAt < SETTLE_MS) return;
    const selection = this.terminalInfo()?.selection ?? null;
    if (!sameSelection(selection, this.native)) this.native = selection;
    const offset = this.alt ? null : this.paneInfo()?.scroll?.offset;
    if (typeof offset === "number" && this.viewTop !== null && offset !== this.viewTop) {
      this.viewTop = offset;
      this.setTop(this.displayPosAt(offset));
      this.cursorIntoView();
    }
  }

  // --- view ----------------------------------------------------------------

  // The column each display line of `row` starts on. One more than the text
  // needs when the cursor stands just past the end of a line that fills its
  // last display line (in a selection, after $), as in Vim.
  lineStarts(row) {
    const starts = this.baseStarts(row);
    const glyphs = this.rows[row] ?? [];
    const pastEnd = row === this.cursor.row && this.cursor.col >= glyphs.length;
    if (pastEnd && cellsOf(glyphs.slice(starts[starts.length - 1])) >= this.wrapWidth()) {
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
  placeCursor(pos) {
    const { row, line } = pos.row < this.firstRow ? { row: this.firstRow, line: 0 } : pos;
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
    const last = Math.max(0, this.rows.length - 1);
    return clamp(row, Math.min(this.firstRow, last), last);
  }

  // `target` kept off the unread filler above firstRow: there, the start of
  // the first line read instead.
  readable(target) {
    return target.row < this.firstRow ? { ...target, row: this.firstRow, col: 0, wantCol: undefined } : target;
  }

  // `delta` rows from the cursor, stopping at the first or last line; null
  // when the cursor is already there, which makes j, k, yj and the like fail
  // as in Vim. With `colOf`, also a column: colOf(rows, row).
  rowBy(delta, colOf) {
    const row = this.cursor.row;
    if ((delta > 0 && row >= this.rows.length - 1) || (delta < 0 && row <= this.firstRow)) return null;
    const target = this.clampRow(row + delta);
    return colOf ? { row: target, col: colOf(this.rows, target) } : { row: target };
  }

  // To `target`, kept on the text; a vertical move takes its column from
  // wantCol, any other sets wantCol (to target.wantCol when it has one). In a
  // selection the cursor may also stand just past the end of a line, taking
  // in the line break, as in Vim.
  moveCursor(target, vertical = false) {
    if (!this.rows.length) return;
    target = this.readable(target);
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
    return { kind: this.visual, start, end };
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

  // o and O: to the other end.
  swapSelectionEnds() {
    if (!this.visual) return;
    const anchor = this.anchor;
    this.anchor = { ...this.cursor };
    this.moveCursor(anchor);
  }

  // The range y{motion} copies, from the cursor to `target`: Vim's rules,
  // including :help exclusive-linewise (an exclusive motion that ends at the
  // start of a line stops at the end of the one before, and copies whole
  // lines when it also started at or before its line's first non-blank).
  motionRange(target, type) {
    target = this.readable(target);
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
    const text = range ? textOf(this.copyRows(), range) : "";
    if (!text) {
      this.message = "nothing to copy";
      return;
    }
    try {
      cx.write_to_clipboard(text);
      notify({ title: "Copied", body: plural(text.split("\n").length, "line"), level: "info" });
      this.finish();
    } catch (err) {
      this.status = String(err?.message ?? err);
      notify({ title: "Copy failed", body: this.status, level: "error" });
    }
  }

  // --- keys ------------------------------------------------------------------

  onKeyDown(event, cx) {
    this.interacted = true;
    cx.stop_propagation();
    const token = keyToken(event);
    const escape = event.key === "escape" || token === "ctrl-[";
    if (this.loading || !this.rows.length) {
      if (escape || token === "q") this.finish();
      return;
    }
    this.adopt();
    this.message = null;
    this.flash = null;
    this.landed = null;
    if (escape) this.escape(cx);
    else if (this.searching) this.searchKey(event, cx);
    else if (event.modifiers?.platform && event.key === "c") this.runCommand("enter", cx);
    else if (token) this.feed(token, cx);
    if (this.closed) return;
    if (!this.searching) this.scrollToCursor();
    // The match the cursor went to stays selected until the next key.
    if (this.landed && !this.visual && !this.searching && sameCell(this.landed, this.cursor))
      this.flash = this.landed;
    this.sync();
    cx.notify();
  }

  escape(cx) {
    this.message = null;
    if (this.searching) this.cancelSearch();
    else if (this.pendingKeys()) this.resetPending();
    else if (this.visual) this.toggleVisual(this.visual);
    else return this.finish();
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
      case "o":
      case "O":
        return this.swapSelectionEnds();
      case "/":
      case "?":
        return this.startSearch(token === "/", count);
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
        return this.finish();
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
    range = { start: this.readable(range.start), end: this.readable(range.end) };
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

  // Matches of the search being typed, else of the last one, for n/N.
  computeMatches() {
    this.matches = [];
    const search = this.searching ? patternSearch(this.query, this.searchForward) : this.lastSearch;
    this.searchError = this.searching ? (search.error ?? null) : null;
    if (!search?.text) return;
    for (let row = 0; row < this.lines.length; row++) {
      const found = this.matchesInRow(row, search);
      for (const { col, length } of found) this.matches.push({ row, col, length });
    }
  }

  // The count-th match after (or before) `from`, wrapping around the ends:
  // its index and whether it wrapped, or null when there are no matches.
  findMatch(from, forward, count) {
    const matches = this.matches;
    if (!matches.length) return null;
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
    return { index, wrapped };
  }

  // Where n, N, * and # go; the strip says which match it is, as Vim's [3/17].
  nextMatch(from, forward, count) {
    const found = this.findMatch(from, forward, count);
    if (!found) {
      this.message = this.lastSearch ? `not found: ${this.lastSearch.text}` : "no previous search";
      return null;
    }
    const match = this.matches[found.index];
    this.landed = match;
    const wrapped = found.wrapped ? `search wrapped to the ${forward ? "top" : "bottom"} ` : "";
    this.message = `${wrapped}[${found.index + 1}/${this.matches.length}]`;
    return { row: match.row, col: match.col };
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
    this.searchView = { top: this.top, topLine: this.topLine };
    this.computeMatches();
    this.updatePreview();
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
    this.updatePreview();
  }

  // As Vim's 'incsearch': the match the search being typed would go to, shown
  // selected with the view on it.
  updatePreview() {
    this.preview = null;
    if (this.searchView) this.setTop({ row: this.searchView.top, line: this.searchView.topLine });
    const found = this.searching && !this.searchError && this.findMatch(this.cursor, this.searchForward, this.searchCount);
    if (!found) return;
    this.preview = this.matches[found.index];
    const cursor = this.cursor;
    this.cursor = { row: this.preview.row, col: this.preview.col };
    this.scrollToCursor();
    this.cursor = cursor;
  }

  cancelSearch() {
    this.searching = false;
    this.preview = null;
    if (this.searchView) this.setTop({ row: this.searchView.top, line: this.searchView.topLine });
    this.searchView = null;
    this.computeMatches();
  }

  // Enter: the typed text becomes the last search (an empty one repeats the
  // last search in the new direction), and the cursor goes to its next match.
  commitSearch() {
    this.searching = false;
    this.preview = null;
    this.searchView = null;
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

  // --- render ----------------------------------------------------------------

  modeName() {
    if (this.visual === "char") return "VISUAL";
    if (this.visual === "line") return "V-LINE";
    return "NORMAL";
  }

  // The mode badge's [background, foreground].
  modeColors(colors) {
    if (this.visual) return [colors.ansi5, colors.background];
    return [colors.accent, colors.accent_foreground];
  }

  statusNote() {
    if (this.status) return this.status;
    if (this.message) return this.message;
    return this.note ?? "";
  }

  // The strip, like Vim's status line in the terminal's font: while searching,
  // the / or ? prompt and the pattern; otherwise a badge colored for the mode
  // and any message on the left, typed keys and the cursor position (line/
  // lines:column) on the right. A press anywhere on it that isn't stopped
  // drags it, and Herdr remembers where it was dropped.
  render(cx) {
    const colors = theme();
    const size = fontSize();
    const strip = h_flex()
      .id("copy-mode")
      .size_full()
      .track_focus(this.handle)
      .on_key_down((event, cx) => this.onKeyDown(event, cx))
      .on_mouse_down("left", () => {
        this.interacted = true;
        if (!this.handle.is_focused()) this.handle.focus();
      })
      .on_size_change((_bounds, cx) => {
        // Take the keyboard once laid out, unless the person got there first.
        if (this.mounted) return;
        this.mounted = true;
        cx.timer.after(32, () => {
          if (!this.closed && !this.interacted && !this.handle.is_focused()) this.handle.focus();
        });
      })
      .items_center()
      .gap(12)
      .pr(8)
      .rounded(6)
      .border_1()
      .border_color(colors.border)
      .bg(colors.raised)
      .overflow_hidden()
      .font_family(fontFamily())
      .text_size(size);
    if (this.searching) {
      // The prompt, the pattern and a block cursor, run together as in Vim.
      return strip
        .pl(8)
        .child(
          h_flex()
            .flex_1()
            .min_w(0)
            .overflow_hidden()
            .text_color(colors.foreground)
            .child(div().whitespace_nowrap().child(`${this.searchForward ? "/" : "?"}${this.query}`))
            .child(div().w(size * 0.6).h(size * 1.25).flex_none().bg(colors.accent)),
        )
        .child(
          this.searchError
            ? div().text_color(colors.blocked).child(this.searchError)
            : div().text_color(colors.muted).child(plural(this.matches.length, "match", "matches")),
        );
    }
    const [badgeBackground, badgeForeground] = this.modeColors(colors);
    const pending = this.pendingKeys();
    const position = this.rows.length
      ? `${this.cursor.row + 1}/${this.rows.length}:${this.cursor.col + 1}`
      : "—";
    return strip
      .child(
        h_flex()
          .h_full()
          .flex_none()
          .items_center()
          .px(8)
          .bg(badgeBackground)
          .text_color(badgeForeground)
          .font_semibold()
          .child(this.modeName()),
      )
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_color(this.status ? colors.blocked : colors.muted)
          .child(this.loading ? "loading…" : this.statusNote()),
      )
      .when(Boolean(pending), (el) => el.child(div().text_color(colors.accent).child(pending)))
      .child(div().flex_none().text_color(colors.muted).child(position));
  }
}
