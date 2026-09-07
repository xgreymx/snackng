# Theming

Everything visual is a CSS custom property. No `::ng-deep`, no `!important`, no specificity
fight — set the variables anywhere they inherit to the toast, and `:root` is simplest.

```css
:root {
  --snackng-success-bg: linear-gradient(135deg, #059669, #064e3b);
  --snackng-radius: 8px;
  --snackng-blur: 0px;
  --snackng-title-weight: 600;
}
```

## How the cascade works

Three levels, resolved in this order:

```
:root (yours)  >  .sng-style--<preset>  >  library default
```

The library reads its tunable axes as a nested fallback —
`var(--snackng-blur, var(--sng-p-blur, 20px))` — and **never declares** a public
`--snackng-*` token on the toast element. That is deliberate: a declaration there would beat
the same property inherited from your `:root`, and your override would silently do nothing.

The practical consequence: **your `:root` value wins over any preset.** If you set
`--snackng-blur: 4px` globally, `style: 'frosted'` will no longer reach its 30px blur.

## Colours

`{type}` is `success`, `warning`, `danger`, `info`, or any custom type you register.

| Variable                 | Default                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `--snackng-{type}-bg`    | A 135° gradient per type, built from the type's two RGB channels at `--snackng-tint` opacity |
| `--snackng-{type}-ink`   | `#ffffff` for all four                                                                       |
| `--snackng-{type}-solid` | `success` `#21509f` · `warning` `#b45309` · `danger` `#c0392b` · `info` `#47556a`            |

Per-type built-in defaults:

| Type      | Gradient channels                   | `-solid`  |
| --------- | ----------------------------------- | --------- |
| `success` | `rgb(33 80 159)` → `rgb(17 52 111)` | `#21509f` |
| `warning` | `rgb(180 83 9)` → `rgb(146 64 14)`  | `#b45309` |
| `danger`  | `rgb(192 57 43)` → `rgb(140 35 29)` | `#c0392b` |
| `info`    | `rgb(71 85 105)` → `rgb(40 51 69)`  | `#47556a` |

Two things that surprise people:

- **`-solid` is only used where `backdrop-filter` is unsupported.** It sits inside
  `@supports not (backdrop-filter: …)` as an opaque background, because a translucent tint with
  no blur behind it reads washed out over busy content. In every modern browser you will never
  see it — but set it anyway if you recolour a type, or old Firefox gets the wrong hue.
- **Setting `-bg` disconnects `--snackng-tint` for that type.** The default gradient builds its
  alpha from `--snackng-tint`; a flat replacement like
  `--snackng-success-bg: linear-gradient(135deg, #059669, #064e3b)` has no alpha channel, so the
  transparency slider stops affecting it. Use `rgb(… / var(--snackng-tint))` in your own
  gradient if you want to keep that knob working.

### Custom types

A custom type registered through `provideSnackng({ types: … })` starts from the neutral `info`
surface and is recoloured through its own tokens:

```ts
provideSnackng({ types: { deploy: { icon: '<svg …/>' } } });
toast.show('deploy', 'Version 2.4.0 is live.');
```

```css
:root {
  --snackng-deploy-bg: linear-gradient(135deg, #7c3aed, #4c1d95);
  --snackng-deploy-ink: #ffffff;
  --snackng-deploy-solid: #6d28d9;
}
```

Set none of them and the toast keeps the neutral surface — the icon and politeness still apply.

## Surface and glass

| Variable                  | Default                           | Notes                                                             |
| ------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `--snackng-tint`          | `0.86`                            | Tint opacity — how much of the background shows through.          |
| `--snackng-blur`          | `20px`                            | `backdrop-filter` blur radius.                                    |
| `--snackng-blur-reduced`  | `10px`                            | Replaces `--snackng-blur` under `prefers-reduced-motion: reduce`. |
| `--snackng-saturate`      | `180%`                            |                                                                   |
| `--snackng-brightness`    | `1.06`                            |                                                                   |
| `--snackng-gloss`         | `0.22`                            | Static highlight along the top edge.                              |
| `--snackng-spec-strength` | `0.15`                            | Specular strength for `drift` and `glare`.                        |
| `--snackng-spec-size`     | `30%`                             | Specular radius.                                                  |
| `--snackng-border`        | `1px solid rgba(255,255,255,.22)` |                                                                   |
| `--snackng-shadow`        | Layered drop + inset highlight    | Four layers; replace the whole value.                             |
| `--snackng-radius`        | `14px`                            |                                                                   |

## Layout

| Variable                                      | Default                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `--snackng-min-width` / `--snackng-max-width` | `340px` / `460px`                                                    |
| `--snackng-padding`                           | `14px 18px`                                                          |
| `--snackng-gap`                               | `14px` — between icon, body and buttons                              |
| `--snackng-stack-gap`                         | `12px` — between stacked toasts                                      |
| `--snackng-stack-padding`                     | `16px` — from the viewport edge                                      |
| `--snackng-z`                                 | `2000` — above the CDK overlay range, so a toast shows over a dialog |

## Typography

| Variable                                              | Default                            |
| ----------------------------------------------------- | ---------------------------------- |
| `--snackng-font`                                      | `'Manrope', system-ui, sans-serif` |
| `--snackng-line-height`                               | `1.45`                             |
| `--snackng-title-size` / `--snackng-title-weight`     | `14px` / `700`                     |
| `--snackng-message-size` / `--snackng-message-weight` | `13px` / `400`                     |
| `--snackng-action-size` / `--snackng-action-weight`   | `13px` / `600`                     |

## Motion

| Variable                   | Default | Notes                                                                                             |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `--snackng-enter-duration` | `400ms` |                                                                                                   |
| `--snackng-exit-duration`  | `200ms` |                                                                                                   |
| `--snackng-shift`          | `28px`  | How far a toast travels on enter/exit. Forced to `0px` under reduced motion, leaving a pure fade. |
| `--snackng-drift-duration` | `4s`    | Only affects `effect: 'drift'` and `'both'`.                                                      |

---

## Style presets

A preset is a bundle of glass settings. Apply it per call, globally, or with the chained
shortcut — all three are equivalent:

```ts
toast.success('Saved', { style: 'solid' });
toast.success.solid('Saved');
provideSnackng({ style: 'solid' });
```

| `style`               | Look                              | Sets                                      |
| --------------------- | --------------------------------- | ----------------------------------------- |
| `'glass'` _(default)_ | Rich translucent glass with depth | nothing — the base values                 |
| `'solid'`             | Nearly opaque, a whisper of glass | tint `0.96`, spec `0.06`, spec-size `28%` |
| `'translucent'`       | More background shows through     | tint `0.74`, spec `0.12`, spec-size `40%` |
| `'transparent'`       | Barely-there tint                 | tint `0.3`, spec `0.1`, spec-size `30%`   |
| `'frosted'`           | Heavy blur, high tint             | tint `0.92`, **blur `30px`**, spec `0.1`  |
| `'flat'`              | Fully opaque, no blur             | tint `1`, **blur `0`**, spec `0`          |

`'flat'` is also the cleanest thing to fall back to where `backdrop-filter` is unsupported.

### Writing your own preset

Pass any string as `style` and define a matching `.sng-style--<name>` rule. Presets set the
**private** `--sng-p-*` aliases, never the public tokens — that is what keeps a consumer's
`:root` override winning over a preset:

```css
/* A global stylesheet. Not a component one — see the caveat below. */
.sng-style--neon {
  --sng-p-tint: 0.55;
  --sng-p-blur: 26px;
  --sng-p-spec: 0.34;
  --sng-p-spec-size: 55%;
  --sng-p-drift-dur: 2s;
}
```

```ts
toast.info('Deploying…', { style: 'neon' });
```

The five aliases are the whole surface: `--sng-p-tint`, `--sng-p-blur`, `--sng-p-spec`,
`--sng-p-spec-size`, `--sng-p-drift-dur`.

> **The rule must be global.** Written in a component stylesheet under Angular's default
> emulated encapsulation, it gets an attribute selector the toast element does not carry, and
> silently does nothing. Put it in `styles.css`, or in a component with
> `encapsulation: ViewEncapsulation.None`. The same applies to any class you pass as
> `panelClass`.

## Surface effects

`effect` adds light to the glass. It never touches the enter/exit animations.

| `effect`              | Behaviour                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `'drift'` _(default)_ | A slow specular highlight drifts across the surface, on a `--snackng-drift-duration` loop. |
| `'glare'`             | The highlight follows the pointer.                                                         |
| `'both'`              | Drift when idle, glare on hover.                                                           |
| `'none'`              | Static glass.                                                                              |

- `'glare'` needs a pointer. On a touch device it is **inert** — there is no hover to track, so
  the toast reads as `'none'`. Use `'both'` if you want touch users to still get the drift.
- It works by writing `--sng-glare-x`, `--sng-glare-y` and `--sng-glare-op` inline on the toast
  element from a `pointermove` listener, bound only when the effect is on and run outside
  Angular's zone.
- `drift`, and the drift half of `both`, stop under `prefers-reduced-motion: reduce`.

---

## Using daisyUI

snackng depends on neither daisyUI nor Tailwind. If you happen to use them, one optional import
re-points the toast at your daisy theme so it follows theme switching and dark mode:

```css
@import 'snackng/themes/daisy.css';
```

The package exposes it as a subpath export (`snackng/themes/daisy.css`); a bundler that does not
read `exports` may need the resolved path `node_modules/snackng/themes/daisy.css`.

The complete mapping:

| snackng                           | daisyUI                           |
| --------------------------------- | --------------------------------- |
| `--snackng-success-bg` / `-solid` | `--color-success`                 |
| `--snackng-success-ink`           | `--color-success-content`         |
| `--snackng-warning-bg` / `-solid` | `--color-warning`                 |
| `--snackng-warning-ink`           | `--color-warning-content`         |
| `--snackng-danger-bg` / `-solid`  | `--color-error` — note the rename |
| `--snackng-danger-ink`            | `--color-error-content`           |
| `--snackng-info-bg` / `-solid`    | `--color-info`                    |
| `--snackng-info-ink`              | `--color-info-content`            |
| `--snackng-radius`                | `--radius-box`                    |
| `--snackng-font`                  | `inherit`                         |

Two caveats:

- **It trades the glass gradients for daisy's flat colours.** To keep the glass and only borrow
  the hues, skip the import and set the variables yourself.
- **`--snackng-font: inherit` drops Manrope**, adopting whatever your app uses. Set
  `--snackng-font` after the import if you want it back.
- **The bridge declares on `:root`.** A daisyUI `data-theme` applied to `<html>` works; applied
  to a subtree it does not reach the toasts, which are appended to `document.body` and resolve
  their variables against `:root`.
