# API reference

Every export, every field, every default. For colours and CSS variables see
[theming.md](https://github.com/xgreymx/snackng/blob/main/projects/snackng/docs/theming.md);
for worked examples see
[recipes.md](https://github.com/xgreymx/snackng/blob/main/projects/snackng/docs/recipes.md).

```ts
import {
  SnackngService,
  provideSnackng,
  SNACKNG_CONFIG,
  SNACKNG_DEFAULTS,
  // types
  type SnackngConfig,
  type SnackngOptions,
  type SnackngRef,
  type SnackngAction,
  type SnackngTypeDef,
  type SnackngVariantFn,
  type SnackngDismissReason,
  type SnackngPosition,
  type SnackngPoliteness,
  type SnackngOverflow,
  type SnackngStyle,
  type SnackngBuiltInStyle,
  type SnackngType,
  type SnackngBuiltInType,
  type SnackngEffect,
} from 'snackng';
```

---

## `SnackngService`

Injectable at the root — `inject(SnackngService)` works anywhere, with no provider registered.

### Emitting

```ts
success(message: string, options?: SnackngOptions): SnackngRef
warning(message: string, options?: SnackngOptions): SnackngRef
danger (message: string, options?: SnackngOptions): SnackngRef
info   (message: string, options?: SnackngOptions): SnackngRef

show(type: SnackngType, message: string, options?: SnackngOptions): SnackngRef
```

`show` is the general form and the only way to emit a **custom type**. The four named
variants are sugar for `show('success', …)` and friends.

### Chained presets — `SnackngVariantFn`

Each of the four variants is also an object carrying one method per built-in glass preset,
so you can pick a look inline. These are equivalent:

```ts
toast.success('Saved', { style: 'solid' });
toast.success.solid('Saved');
```

The full shape:

```ts
interface SnackngVariantFn {
  (message: string, options?: SnackngOptions): SnackngRef;
  glass(message: string, options?: SnackngOptions): SnackngRef;
  solid(message: string, options?: SnackngOptions): SnackngRef;
  translucent(message: string, options?: SnackngOptions): SnackngRef;
  transparent(message: string, options?: SnackngOptions): SnackngRef;
  frosted(message: string, options?: SnackngOptions): SnackngRef;
  flat(message: string, options?: SnackngOptions): SnackngRef;
}
```

The chained preset **wins over** `options.style`: `toast.success.solid('x', { style: 'flat' })`
renders `solid`. The sugar exists only for the four built-ins — `show()` has no chained form.

### Everything else

```ts
dismissAll(): void          // dismisses visible toasts and drops queued ones
pending: Signal<number>     // how many are waiting behind `max`
ngOnDestroy(): void         // tears down the overlay host; Angular calls it
```

`pending()` counts **only queued** toasts, never the visible ones. It is a signal, so it is
safe to read straight from a template for a "3 more" affordance.

---

## `SnackngRef`

Returned by every emitting call.

```ts
interface SnackngRef {
  readonly id: string;
  dismiss(): void;
  readonly afterDismissed: Promise<SnackngDismissReason>;
}
```

| Member           | Notes                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| `id`             | Internal identifier, `sng-<n>`. Handy as a key when you track refs yourself. |
| `dismiss()`      | Closes the toast. Always resolves `afterDismissed` with `'manual'`.          |
| `afterDismissed` | See below.                                                                   |

### `afterDismissed`

**A promise, so it resolves exactly once, for that one toast, and never fires again.**
It is not a stream. If you want to react to every toast, attach it at the place you create
them rather than storing one ref:

```ts
private fire(ref: SnackngRef, label: string): SnackngRef {
  ref.afterDismissed.then((reason) => this.track(label, reason));
  return ref;
}
```

It resolves **after the exit animation finishes** and the element has left the DOM — not at the
moment you click. The value is one of four:

| Reason       | When                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `'timeout'`  | `duration` elapsed. Never happens with `duration: 0`.                                                                     |
| `'action'`   | The action button was clicked, and `action.dismissOnClick` was not `false`.                                               |
| `'manual'`   | The close button (`dismissible`), `ref.dismiss()`, or `dismissAll()`.                                                     |
| `'replaced'` | Evicted to make room under `overflow: 'dismiss-oldest'`. Unreachable while `overflow` is `'queue'`, which is the default. |

Two edge cases worth knowing:

- **A toast still in the queue** — accepted but never shown, because `max` was full — resolves
  when `dismissAll()` drops it. Your `.then` runs for a toast the user never saw.
- **On the server** (SSR), `show()` returns a no-op ref whose `afterDismissed` is
  `Promise.resolve('manual')`, already settled. Code that awaits it will not hang, but it also
  will not mean anything. See [Server-side rendering](#server-side-rendering).

Clicking the action **runs the handler first, then dismisses**, so the reason arrives after
whatever the handler did.

---

## `SnackngOptions`

Per call. Every field is optional; anything omitted falls back to the global config (see
[`SnackngConfig`](#snackngconfig)).

| Option        | Type                 | Default     | Notes                                                                                                                                                                         |
| ------------- | -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`             | —           | Bold line above the message.                                                                                                                                                  |
| `duration`    | `number`             | `5000`      | Milliseconds before auto-dismiss. `0` keeps it open until dismissed.                                                                                                          |
| `action`      | `SnackngAction`      | —           | Snackbar-style button.                                                                                                                                                        |
| `position`    | `SnackngPosition`    | `'top-end'` | Per toast, so two toasts can dock to different corners at once.                                                                                                               |
| `dismissible` | `boolean`            | `true`      | Show the close button.                                                                                                                                                        |
| `politeness`  | `SnackngPoliteness`  | by type     | Screen-reader urgency; overrides the type's default.                                                                                                                          |
| `style`       | `SnackngStyle`       | `'glass'`   | Glass preset.                                                                                                                                                                 |
| `effect`      | `SnackngEffect`      | `'drift'`   | Surface light effect.                                                                                                                                                         |
| `panelClass`  | `string \| string[]` | —           | Extra classes on the toast element. **Must be defined in a global stylesheet** — a component stylesheet with Angular's default emulated encapsulation cannot reach the toast. |

### Precedence

```
SNACKNG_DEFAULTS  →  provideSnackng({ … })  →  options on the call
```

The per-call merge uses `??`, not `||`, so an explicit falsy value still wins:
`{ dismissible: false }` beats a global `true`, and `{ duration: 0 }` beats a global `5000`.

Five config fields have **no** per-call equivalent and are read globally: `max`, `overflow`,
`stagger`, `pauseOnHover`, `types`.

---

## `SnackngAction`

```ts
interface SnackngAction {
  label: string;
  handler?: () => void;
  dismissOnClick?: boolean; // default: true
}
```

`dismissOnClick: false` keeps the toast open after the click — useful for a "Retry" that should
stay visible while the retry runs. With it, `afterDismissed` never resolves with `'action'`;
the toast still ends by `timeout`, `manual` or `replaced`.

---

## `SnackngConfig` and `provideSnackng`

```ts
function provideSnackng(config?: Partial<SnackngConfig>): EnvironmentProviders;
```

Entirely optional. `SNACKNG_CONFIG` is an `InjectionToken<SnackngConfig>` declared
`providedIn: 'root'` with a factory returning `SNACKNG_DEFAULTS` — which is why a bare
`npm i snackng` plus `inject(SnackngService)` already works.

| Field          | Type                             | Default     | Notes                                                                                                                         |
| -------------- | -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | `number`                         | `5000`      | ms; `0` = until dismissed.                                                                                                    |
| `position`     | `SnackngPosition`                | `'top-end'` |                                                                                                                               |
| `max`          | `number`                         | `5`         | Toasts on screen at once. Extras are handled per `overflow`.                                                                  |
| `overflow`     | `SnackngOverflow`                | `'queue'`   | `'queue'` never loses one, but a flood becomes a long parade. `'dismiss-oldest'` evicts the oldest so the newest always wins. |
| `stagger`      | `number`                         | `90`        | ms between releasing consecutive queued toasts. `0` releases as many as fit at once.                                          |
| `pauseOnHover` | `boolean`                        | `true`      | Pauses the dismiss timer on hover **and on keyboard focus**, despite the name.                                                |
| `dismissible`  | `boolean`                        | `true`      | Close button on every toast.                                                                                                  |
| `style`        | `SnackngStyle`                   | `'glass'`   |                                                                                                                               |
| `effect`       | `SnackngEffect`                  | `'drift'`   |                                                                                                                               |
| `types`        | `Record<string, SnackngTypeDef>` | `{}`        | Custom types.                                                                                                                 |

The merge is shallow, with one exception: `types` is merged one level deep, so registering a
custom type does not wipe the built-ins.

`SNACKNG_DEFAULTS` is exported as a plain object — useful for diffing your own settings against
the library's, or for building your config on top of it.

---

## `SnackngTypeDef` — custom types

```ts
interface SnackngTypeDef {
  icon?: string; // raw SVG markup
  politeness?: SnackngPoliteness;
}
```

```ts
provideSnackng({
  types: { deploy: { icon: '<svg viewBox="0 0 24 24"><path d="…"/></svg>' } },
});

toast.show('deploy', 'Version 2.4.0 is live.');
```

- `icon` is injected as **raw SVG and bypasses Angular's sanitizer**. Treat it as code: it must
  come from your source, never from user input. Omit it and the type borrows the `info` glyph.
- `politeness` sets the screen-reader urgency for every toast of that type; a per-call
  `politeness` still overrides it.
- Colours come from `--snackng-<type>-bg`, `-ink` and `-solid`. See
  [theming.md](https://github.com/xgreymx/snackng/blob/main/projects/snackng/docs/theming.md#custom-types).

---

## Type aliases

```ts
type SnackngBuiltInType = 'success' | 'warning' | 'danger' | 'info';
type SnackngType = SnackngBuiltInType | (string & {});

type SnackngPosition =
  'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

type SnackngPoliteness = 'polite' | 'assertive' | 'off';
type SnackngOverflow = 'queue' | 'dismiss-oldest';
type SnackngEffect = 'none' | 'drift' | 'glare' | 'both';
type SnackngDismissReason = 'timeout' | 'action' | 'manual' | 'replaced';

type SnackngBuiltInStyle = 'glass' | 'solid' | 'translucent' | 'transparent' | 'frosted' | 'flat';
type SnackngStyle = SnackngBuiltInStyle | (string & {});
```

`(string & {})` keeps editor autocomplete for the built-in literals while still accepting your
own type and preset names.

### `politeness`

| Value         | Effect                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| `'polite'`    | Announced when the screen reader reaches a pause. Default for everything but `danger`.      |
| `'assertive'` | Interrupts. Default for `danger`.                                                           |
| `'off'`       | **Not announced at all.** The toast still renders; it simply never reaches the live region. |

Resolution order: `options.politeness` → `config.types[type].politeness` → `'assertive'` for
`danger`, `'polite'` for everything else.

---

## Server-side rendering

`SnackngService` checks the platform. On the server every `show()` (and therefore every
variant) returns this, without touching `document`:

```ts
{
  id: 'sng-noop',
  dismiss: () => {},
  afterDismissed: Promise.resolve('manual'),
}
```

Nothing renders, nothing is queued, nothing throws. Note the `id`: if you key anything off it,
every server-side ref shares the same one.
