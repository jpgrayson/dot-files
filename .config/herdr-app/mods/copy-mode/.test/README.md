# copy-mode tests

Run `./run.sh` (Node; nvim for the comparison). The folder is hidden so herdr-app
doesn't hot-reload the mod when a test run writes its files here.

- `build.sh`: copies `../main.js` to `main.under-test.mjs` with its herdr imports
  pointed at `stubs.mjs` and its internals exported.
- `harness.mjs`: a headless `CopyMode` fed key tokens.
- `unit.mjs`: scrolling, view-relative keys, counts, visual modes, copying,
  Esc handling, key tokens.
- `regex.mjs`: `/` and `?` regex search. `searchline.mjs`: typing on the search
  line through `onKeyDown`.
- `wrap.mjs`: lines wider than the terminal: where they break, scrolling
  through them, which terminal cell each glyph is in, and that the cursor
  always stays on screen.
- `native.mjs`: the terminal's side, against a stand-in for herdr-app's
  `terminal.select`, `adjust_selection` and `scroll` that behaves as 0.1.16's
  were probed to: whatever the keys, the terminal ends up showing the
  selection and view the mode wants, by valid calls only; laying out what
  `hc read` returns on the terminal's rows; opening.
- `diff.mjs`: about 45k motion and copy cases, run in both the mod and
  `nvim --clean` (`oracle.lua`), compared; known deviations from Vim are
  bucketed and listed in main.js's header comment. Any unexplained mismatch
  fails. gj and gk run the same way, in a 20-column split. `check-buckets.mjs`: confirms those buckets hide nothing else.
