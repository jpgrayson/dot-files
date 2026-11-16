// Stand-ins for herdr-app's modules: enough for the class to load and its key
// handling to run headless.
export class View {}
// Elements record the builder calls made on them, as [name, ...args], for tests
// of what gets drawn.
const chain = () => {
  const calls = [];
  const element = new Proxy(function () {}, {
    get: (_, name) => (name === "calls" ? calls : (...args) => (calls.push([name, ...args]), element)),
  });
  return element;
};
export const div = chain, h_flex = chain;
export const state = { notifications: [], closed: 0, props: {} };
export const closeOverlay = () => state.closed++;
export const focused = () => null, panes = () => state.panes ?? [], terminals = () => state.terminals ?? [];
export const hc = async (args) => state.hc?.(args) ?? { code: 1 };
export const checking = () => false;
export const notify = (n) => state.notifications.push(n);
export const props = () => state.props;
export const run = (name, args) => (state.run?.(name, args), null);
export const setShared = () => null, shared = () => null;
export const settings = () => ({ font_size: 14 }), theme = () => ({});
