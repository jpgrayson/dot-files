#!/bin/sh
# Copies ../main.js beside the stubs as main.under-test.mjs, its imports pointed
# at them and its internals exported, so the tests can load it in Node.
set -e
dir=$(cd "$(dirname "$0")" && pwd)
sed -E 's#from "(gpui-kit|gpui-base|herdr)"#from "./stubs.mjs"#' "$dir/../main.js" > "$dir/main.under-test.mjs"
cat >> "$dir/main.under-test.mjs" <<'X'
export { spansOutside, wordForward, wordBackward, wordEnd, wordEndBackward, paragraphMotion, findChar, matchingBracket, wordObject, quoteObject, bracketObject, textOf, foldCase, keyToken, MOTIONS, wrapStarts, cellsOf };
X
