// Node 25+ exposes an experimental global `localStorage` getter that prints an
// ExperimentalWarning when touched without --localstorage-file. teleproto probes
// for it on import, so drop the getter before any other module loads.
delete (globalThis as { localStorage?: unknown }).localStorage;
