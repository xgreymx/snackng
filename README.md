[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/xgreymx/snackng)

# snackng

Toasts for Angular with a glass design, **zero UI dependencies** and CSS-variable theming.

No Angular Material. No CDK. No Tailwind. No icon font. Install it, call it, done — it renders
correctly in any Angular app whatever else it uses.

## Quick start

**1. Install.**

```bash
npm i snackng
```

**2. Inject and call.** There is no step 3 — no provider to register, no stylesheet to import,
no theme tokens to define.

```ts
import { Component, inject } from '@angular/core';
import { SnackngService } from 'snackng';

@Component({ /* … */ })
export class SyncPage {
  private readonly toast = inject(SnackngService);

  save() {
    this.toast.success('Movements synced.', { title: 'Done' });
  }
}
```

That is a complete, working integration. Everything below is optional.

<details>
<summary><b>The next five things you'll want</b></summary>

```ts
// Four built-in types.
this.toast.success('Saved.');
this.toast.warning('3 records left unreconciled.');
this.toast.danger('Could not reach the server.');
this.toast.info('Next sync at 18:00.');

// A title, a longer life, a close button.
this.toast.info('Import running…', { title: 'In progress', duration: 0, dismissible: true });
//                                            duration: 0 means "stay until dismissed"

// An action button, and knowing how it ended.
const ref = this.toast.success('Movement deleted.', {
  action: { label: 'Undo', handler: () => this.restore() },
});
ref.afterDismissed.then(reason => {}); // 'timeout' | 'action' | 'manual' | 'replaced'
ref.dismiss();                          // close it yourself

// Somewhere other than the top-right.
this.toast.info('Down here.', { position: 'bottom-center' });

// Your colours, from your own CSS. No ::ng-deep.
// :root { --snackng-success-bg: linear-gradient(135deg, #059669, #064e3b); }
```

</details>

Change the defaults globally — again, only if you want to:

```ts
bootstrapApplication(App, {
  providers: [provideSnackng({ duration: 4000, position: 'bottom-end' })],
});
```

## Why another toast library

Most Angular toasts either wrap `MatSnackBar` — dragging in all of Angular Material and fighting
its internal MDC surface with `!important` — or ship Tailwind classes that render as unstyled
markup unless the consuming app happens to run the same CSS pipeline. snackng ships **compiled,
encapsulated CSS** and owns its own overlay, so it has neither problem.

| | snackng |
|---|---|
| Peer dependencies | `@angular/core`, `@angular/common`, `@angular/platform-browser` |
| Global CSS you must add | none |
| Stacks multiple toasts | yes (`MatSnackBar` shows one at a time) |
| Handles bursts | queued and staggered, never dropped |
| SSR | safe — no-ops on the server |
| Respects `prefers-reduced-motion` | yes |
| Angular | 21 and up |

## API

```ts
toast.success(message, options?);
toast.warning(message, options?);
toast.danger(message, options?);
toast.info(message, options?);
toast.show(type, message, options?);   // custom types
toast.dismissAll();
toast.pending();                       // signal: how many are queued behind `max`
```

Every call returns a `SnackngRef`:

```ts
const ref = toast.success('Item deleted', {
  action: { label: 'Undo', handler: () => restore() },
});

ref.afterDismissed.then(reason => console.log(reason)); // 'timeout' | 'action' | 'manual' | 'replaced'
ref.dismiss();
```

### Options

| Option | Type | Default | |
|---|---|---|---|
| `title` | `string` | — | Bold line above the message |
| `duration` | `number` | `5000` | ms before auto-dismiss; `0` keeps it open |
| `action` | `{ label, handler?, dismissOnClick? }` | — | Snackbar-style button |
| `position` | `SnackngPosition` | `'top-end'` | `top`/`bottom` × `start`/`center`/`end` |
| `dismissible` | `boolean` | `false` | Show the close button |
| `politeness` | `'polite' \| 'assertive' \| 'off'` | by type | Screen-reader urgency |
| `panelClass` | `string \| string[]` | — | Extra classes on the toast element |

### Global defaults

Optional — only if you want to change the defaults.

```ts
import { provideSnackng } from 'snackng';

bootstrapApplication(App, {
  providers: [
    provideSnackng({
      duration: 4000,           // ms; 0 = stay until dismissed
      position: 'bottom-end',
      max: 5,                   // visible at once
      overflow: 'queue',        // 'queue' | 'dismiss-oldest'
      stagger: 90,              // ms between releases; 0 = all at once
      pauseOnHover: true,
      dismissible: false,
      types: {
        deploy: { icon: '<svg viewBox="0 0 24 24"><path d="..."/></svg>' },
      },
    }),
  ],
});
```

### Bursts

Toasts often arrive in clumps — an HTTP interceptor firing one per response, a batch job
reporting each failure. snackng accepts every call immediately and paces how they reach the
screen, so a burst never renders as one jarring flash.

Past `max`, toasts wait in a queue and are released one at a time as slots free, spaced by
`stagger` ms. **Nothing is dropped.** Read how many are still waiting with `toast.pending()`.

The trade-off is honest: a flood of 50 errors becomes a long parade. If you'd rather the newest
always win, `overflow: 'dismiss-oldest'` evicts the oldest visible toast to make room, and those
resolve `afterDismissed` with `'replaced'`.

Custom types get the base surface and are coloured through CSS variables:

```ts
toast.show('deploy', 'Version 2.4.0 is now live in production.');
```

```css
:root {
  --snackng-deploy-bg: linear-gradient(135deg, #7c3aed, #4c1d95);
  --snackng-deploy-ink: #ffffff;
}
```

> `types[x].icon` is injected as raw SVG and bypasses Angular's sanitizer. Treat it as code:
> never build it from user input.

## Theming

Restyle everything from your own CSS — no `::ng-deep`, no overrides fighting specificity. Set the
variables anywhere they inherit to the toast (`:root` is simplest).

```css
:root {
  --snackng-success-bg: linear-gradient(135deg, #059669, #064e3b);
  --snackng-radius: 8px;
  --snackng-blur: 0px;
  --snackng-title-weight: 600;
}
```

| Variable | Default |
|---|---|
| `--snackng-{type}-bg` | glass gradient per type |
| `--snackng-{type}-ink` | `#ffffff` (`#4a3200` for `warning`) |
| `--snackng-{type}-solid` | opaque fallback where `backdrop-filter` is unsupported |
| `--snackng-radius` | `14px` |
| `--snackng-blur` | `16px` |
| `--snackng-saturate` | `180%` |
| `--snackng-border` | `1px solid rgba(255,255,255,.22)` |
| `--snackng-shadow` | layered drop + inner highlight |
| `--snackng-min-width` / `--snackng-max-width` | `340px` / `460px` |
| `--snackng-padding` | `14px 18px 14px 22px` |
| `--snackng-gap` | `14px` |
| `--snackng-accent-width` | `4px` |
| `--snackng-font` | `'Manrope', system-ui, sans-serif` |
| `--snackng-title-size` / `--snackng-title-weight` | `14px` / `700` |
| `--snackng-message-size` / `--snackng-message-weight` | `13px` / `400` |
| `--snackng-line-height` | `1.45` |
| `--snackng-enter-duration` / `--snackng-exit-duration` | `400ms` / `200ms` |
| `--snackng-z` | `2000` |
| `--snackng-stack-gap` / `--snackng-stack-padding` | `12px` / `16px` |

`{type}` is `success`, `warning`, `danger`, `info`, or any custom type you register.

### Using daisyUI?

snackng does **not** depend on daisyUI or Tailwind. If you happen to use them, one optional import
re-points the toast at your daisy theme, so it follows theme switching and dark mode for free:

```css
@import "snackng/themes/daisy.css";
```

That maps `--snackng-*` onto daisyUI's `--color-success`, `--color-error-content`, `--radius-box`
and friends. It trades the glass gradients for daisy's flat theme colours — if you want to keep
the glass and only borrow the hues, skip the import and set the variables yourself.

## Accessibility

- Toast text is announced through a dedicated off-screen live region. `danger` announces
  `assertive`, everything else `polite`; override per call with `politeness`.
- The toast element itself carries no `aria-live` — nesting live regions is what causes the
  `HierarchyRequestError` seen in hand-rolled `MatSnackBar` wrappers.
- Under `prefers-reduced-motion: reduce` the slide becomes a plain fade and the blur eases off.
  The library never overrides that OS setting on your behalf.
- Timers pause on hover **and** on keyboard focus, so a toast can't vanish mid-read.

## License

Apache-2.0
