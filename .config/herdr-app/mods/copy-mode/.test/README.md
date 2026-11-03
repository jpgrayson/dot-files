# copy-mode tests

Run `./run.sh` (Node; nvim for the comparison). The folder is hidden so herdr-app
doesn't hot-reload the mod when a test run writes its files here.

- `build.sh`: copies `../main.js` to `main.under-test.mjs` with its herdr imports
  pointed at `stubs.mjs` and its internals exported.
- `harness.mjs`: a headless `CopyMode` fed key tokens.
- `unit.mjs`: scrolling, view-relative keys, counts, visual modes, copying,
  jump, Esc handling, history prepend, key tokens.
- `regex.mjs`: `/` and `?` regex search. `searchline.mjs`: typing on the search
  line through `onKeyDown`. `spans.mjs`: search highlights versus a selection.
- `history.mjs`: when history is read: never on open or dismiss, once when wanted.
- `wrap.mjs`: wrapping lines wider than the view: where they break, scrolling
  through them, what gets drawn, and that the cursor always stays on screen.
- `diff.mjs`: about 35k motion and copy cases, run in both the mod and
  `nvim --clean` (`oracle.lua`), compared; known deviations from Vim are
  bucketed and listed in main.js's header comment. Any unexplained mismatch
  fails. gj and gk run the same way, in a 20-column split. `check-buckets.mjs`: confirms those buckets hide nothing else.
