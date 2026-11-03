import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { closeOverlay, focused, hc, nextCommand, panes, props, run, theme } from "herdr";

// Adapted from herdr.dev/mods/herdrdev/tmux-prefix: Ctrl+O prefix with the
// bindings from ~/.config/herdr/config.toml (terminal herdr). Every binding
// runs once and ends the prefix; there is no repeat mode, so typing right
// after a binding always reaches the terminal. Hold Ctrl for O, H/J/K/L to
// move through panes. Keys are plain characters/key names, or "ctrl-<key>".
const PREFIX = "o";
// The popup box (mod.json: 560 x 360, 64px below the window top) must fit the
// badge plus the `?` panel, which lists every binding without scrolling.
const BINDINGS = [
  ["c", "New tab", "tab.new"],
  ["C", "New space", "space.new"],
  ["O", "Rename tab", "tab.rename"],
  ["%", "Split right", "pane.split", { direction: "right" }],
  ["v", "Split right", "pane.split", { direction: "right" }],
  ['"', "Split down", "pane.split", { direction: "down" }],
  ["s", "Split down", "pane.split", { direction: "down" }],
  ["x", "Close pane", "pane.close"],
  ["z", "Zoom pane", "pane.zoom"],
  ["g", "Toggle jjui", toggleJjui],
  ["[", "Copy mode", "mod.open", { name: "copy-mode" }],
  ["n", "Next space", "space.next"],
  ["ctrl-n", "Next space", "space.next"],
  ["p", "Previous space", "space.prev"],
  ["ctrl-p", "Previous space", "space.prev"],
  ["N", "Next agent", "agent.next"],
  ["P", "Previous agent", "agent.prev"],
  ["right", "Next tab", "tab.next"],
  ["left", "Previous tab", "tab.prev"],
  ["h", "Focus left", "pane.go", { direction: "left" }],
  ["ctrl-h", "Focus left", "pane.go", { direction: "left" }],
  ["j", "Focus down", "pane.go", { direction: "down" }],
  ["ctrl-j", "Focus down", "pane.go", { direction: "down" }],
  ["down", "Focus down", "pane.go", { direction: "down" }],
  ["k", "Focus up", "pane.go", { direction: "up" }],
  ["ctrl-k", "Focus up", "pane.go", { direction: "up" }],
  ["up", "Focus up", "pane.go", { direction: "up" }],
  ["l", "Focus right", "pane.go", { direction: "right" }],
  ["ctrl-l", "Focus right", "pane.go", { direction: "right" }],
  ["H", "Move left", "pane.swap", { direction: "left" }],
  ["J", "Move down", "pane.swap", { direction: "down" }],
  ["K", "Move up", "pane.swap", { direction: "up" }],
  ["L", "Move right", "pane.swap", { direction: "right" }],
  ...Array.from({ length: 10 }, (_, i) => [String(i), `Tab ${i === 0 ? 10 : i}`, "tab.select", { index: i === 0 ? 10 : i }]),
];

// Close jjui if this tab runs it (the focused pane first), else split it in to
// the right of the focused pane, where it starts in that pane's folder.
function toggleJjui() {
  const tab = focused()?.tab;
  const isJjui = (p) => p.tab === tab && (p.program?.key === "jjui" || p.program?.name === "jjui");
  const open = panes().find((p) => isJjui(p) && p.focused) ?? panes().find(isJjui);
  if (open) return run("pane.close", { pane: open.pane });
  run("pane.split", { direction: "right", argv: ["zsh", "-ic", "exec jjui"] });
}

export default class Prefix extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.all = false;
    // The mod-specific key binding (keys.json) beats the global opener while
    // we're open: Ctrl+O Ctrl+O sends a literal Ctrl+O.
    cx.spawn(async (cx) => {
      for (;;) {
        await nextCommand();
        this.sendPrefix(cx);
      }
    });
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  sendPrefix(cx) {
    const terminal = focused()?.terminal;
    if (terminal) {
      // hc starts its subprocess at the call, before closing cancels this view's tasks.
      const pending = hc(["keys", terminal, `ctrl+${PREFIX}`]);
      cx.spawn(async () => {
        const result = await pending;
        if (result.code !== 0) console.log(`prefix: ${result.stderr}`);
      });
    }
    this.dismiss();
  }

  key(e, cx) {
    cx.stop_propagation();
    const m = e.modifiers;
    if (e.key === "escape") return this.dismiss();
    if (m.control && e.key === PREFIX) return this.sendPrefix(cx);
    const plain = !m.control && !m.alt && !m.platform;
    const ctrlOnly = m.control && !m.alt && !m.platform && !m.shift;
    const key = plain ? (e.key_char ?? (m.shift && e.key.length === 1 ? e.key.toUpperCase() : e.key)) : e.key;
    if (plain && key === "?") {
      if (this.all) return this.dismiss();
      this.all = true;
      cx.notify();
      return;
    }
    const lookup = plain ? key : ctrlOnly ? `ctrl-${e.key}` : null;
    const binding = lookup && BINDINGS.find((b) => b[0] === lookup);
    // An unbound key just ends the prefix.
    this.dismiss();
    if (!binding) return;
    // A binding's command is a command name, or a function to call.
    if (typeof binding[2] === "function") binding[2]();
    else run(binding[2], binding[3] ?? {});
  }

  render() {
    const t = theme();
    const P = PREFIX.toUpperCase();
    // Frameless popup (mod.json): only the badge shows until `?`.
    const badge = h_flex().px(12).py(4).gap(6).items_center().rounded(12).shadow_md()
      .bg(t.accent).text_color(t.accent_foreground).font_semibold()
      .child(`⌃${P}`).child(div().font_normal().child("prefix"));
    return v_flex().id("prefix").size_full().items_center().track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx)).text_size(12)
      .child(badge)
      .when(this.all, (el) => el.child(this.panel(t, P)));
  }

  // Every binding, one row per action (keys that do the same thing share a row).
  panel(t, P) {
    const pretty = (k) => ({ left: "←", right: "→", up: "↑", down: "↓" })[k] ?? k.replace(/^ctrl-/, "^");
    const groups = [];
    for (const [key, label, command, args = {}] of BINDINGS) {
      if (/^\d$/.test(key)) continue;
      const id = typeof command === "function" ? key : command + JSON.stringify(args);
      let g = groups.find((g) => g.id === id);
      if (!g) groups.push((g = { id, label, keys: [] }));
      g.keys.push(pretty(key));
    }
    groups.push({ label: "Tab 1–10", keys: ["1–9 0"] });
    groups.push({ label: `Send ^${P}`, keys: [`^${P}`] });
    const half = Math.ceil(groups.length / 2);
    const column = (rows) => v_flex().flex_1().children(rows.map((g) =>
      h_flex().h(20).flex_none().items_center().gap(10)
        .child(div().w(80).flex_none().text_color(t.accent).child(g.keys.join(" ")))
        .child(div().flex_1().truncate().child(g.label))));
    return v_flex().mt(8).w_full().p(12).gap(8)
      .bg(t.popover).text_color(t.foreground).rounded(8).border_1().border_color(t.border).shadow_lg()
      .child(h_flex().gap(24).child(column(groups.slice(0, half))).child(column(groups.slice(half))))
      .child(div().text_color(t.muted).child("esc to close"));
  }
}
