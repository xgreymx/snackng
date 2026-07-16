# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Toasts now glide into the gap left by a dismissed neighbour instead of snapping to their new
  position. Honours `prefers-reduced-motion`.

### Fixed

- Bottom-anchored stacks no longer shimmer when a toast is added. The stack now fills the viewport
  height instead of growing upward, so existing toasts keep a stable layout position and their
  `backdrop-filter` is not re-rasterized on every add.
- Queue capacity now counts toasts that are still playing their exit animation. They remain on
  screen until removed, so treating them as free slots let an expiring batch release its whole
  backlog at once — the stack briefly rendering past `max`, over the toasts it was replacing,
  then snapping back.

## [0.1.0] - 2026-07-15

First release. Extracted from an internal Angular Material admin panel and rebuilt with no UI
dependencies, so the design travels without the framework it grew up in.

### Added

- `SnackngService` with `success`, `warning`, `danger`, `info`, `show` and `dismissAll`.
- Glass toast design: backdrop blur + saturation, per-type gradient, side accent bar and icon
  badge, with an opaque fallback where `backdrop-filter` is unsupported.
- Custom types via `provideSnackng({ types: { … } })`, each with its own inline SVG icon and CSS
  variables.
- Action button (`{ label, handler, dismissOnClick }`) and optional close button.
- `SnackngRef` with `dismiss()` and an `afterDismissed` promise resolving to `'timeout'`,
  `'action'`, `'manual'` or `'replaced'`.
- Six positions (`top`/`bottom` × `start`/`center`/`end`), each with its own slide direction.
- Producer/consumer queue: toasts past `max` wait for a free slot rather than rendering at once,
  released one at a time spaced by `stagger`. `overflow: 'dismiss-oldest'` opts into
  newest-wins eviction instead.
- Theming through ~25 `--snackng-*` CSS custom properties — colours, radius, blur, shadow,
  spacing, typography, animation timing and z-index — with no `::ng-deep` needed by consumers.
- Optional daisyUI bridge at `snackng/themes/daisy.css`, mapping the variables onto daisyUI's
  `--color-*` theme so the toast follows theme and dark-mode switching.
- Timers pause on hover and on keyboard focus. `duration: 0` keeps a toast until dismissed.
- Dedicated off-screen `aria-live` region; `danger` announces assertively, everything else
  politely.
- SSR safety: `show()` no-ops on the server and returns an inert `SnackngRef`.
- Honours `prefers-reduced-motion: reduce` by collapsing the slide to a fade.

### Notes

- Peer dependencies are `@angular/core`, `@angular/common` and `@angular/platform-browser` only —
  no Angular Material, no CDK, no Tailwind, no icon font.
- Built against Angular 21 on purpose: Angular's partial-Ivy linker only accepts libraries
  compiled with a version at or below the consuming app's, so a 21 build serves both Angular 21
  and 22 apps while a 22 build would drop every 21 app.

[Unreleased]: https://github.com/fcarrasco/snackng/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fcarrasco/snackng/releases/tag/v0.1.0
