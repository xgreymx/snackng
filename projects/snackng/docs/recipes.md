# Recipes

Worked examples for the things people actually build. See
[api.md](https://github.com/xgreymx/snackng/blob/main/projects/snackng/docs/api.md) for the
reference and
[theming.md](https://github.com/xgreymx/snackng/blob/main/projects/snackng/docs/theming.md)
for CSS variables.

## An HTTP error interceptor

The case snackng's queue was built for: one toast per failed response, arriving in clumps.

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SnackngService } from 'snackng';

export const errorToastInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(SnackngService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      toast.danger(error.status === 0 ? 'No connection.' : `Request failed (${error.status}).`, {
        title: req.url,
        action: { label: 'Retry', handler: () => location.reload() },
      });
      return throwError(() => error);
    }),
  );
};
```

A batch that fails 50 times will not paint 50 toasts at once — `max` caps what is on screen and
`stagger` spaces the rest. If a flood is likelier than a trickle, flip the strategy so the newest
error always wins:

```ts
provideSnackng({ max: 3, overflow: 'dismiss-oldest' });
```

Evicted toasts resolve `afterDismissed` with `'replaced'`.

## Undo, and knowing how it ended

```ts
const ref = this.toast.success('Item deleted.', {
  action: { label: 'Undo', handler: () => this.restore(id) },
});

ref.afterDismissed.then((reason) => {
  if (reason !== 'action') {
    this.commitDelete(id); // they let it go: timeout, the X, or dismissAll()
  }
});
```

The handler runs **before** the dismissal, so by the time the promise settles with `'action'`
the restore has already happened. And since `afterDismissed` resolves exactly once, this is a
one-shot decision per toast — there is no later event to miss.

For a "Retry" that should stay on screen while the retry runs, keep the toast open:

```ts
this.toast.danger('Upload failed.', {
  duration: 0,
  action: { label: 'Retry', handler: () => this.upload(), dismissOnClick: false },
});
```

## Tracking every toast

`afterDismissed` is a promise per toast, not a stream. To observe all of them, attach it where
toasts are created rather than holding a single ref:

```ts
private fire(ref: SnackngRef, label: string): SnackngRef {
  ref.afterDismissed.then((reason) => this.analytics.track('toast', { label, reason }));
  return ref;
}

notifySaved() {
  return this.fire(this.toast.success('Saved.'), 'save');
}
```

## A custom type

```ts
// app.config.ts
provideSnackng({
  types: {
    deploy: {
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2 4 7v10l8 5 8-5V7z"/></svg>',
      politeness: 'assertive',
    },
  },
});
```

```css
/* styles.css */
:root {
  --snackng-deploy-bg: linear-gradient(135deg, #7c3aed, #4c1d95);
  --snackng-deploy-ink: #ffffff;
  --snackng-deploy-solid: #6d28d9;
}
```

```ts
this.toast.show('deploy', 'Version 2.4.0 is live in production.', { title: 'Deploy complete' });
```

The icon is injected as raw SVG and **bypasses Angular's sanitizer** — it must come from your
source, never from user input. Omit it and the type borrows the `info` glyph.

## A "3 more" affordance

`pending()` is a signal counting toasts accepted but still waiting behind `max`. It does not
count what is on screen.

```ts
protected readonly queued = inject(SnackngService).pending;
```

```html
@if (queued(); as n) {
<span class="badge">{{ n }} more queued</span>
}
```

## Server-side rendering

Nothing to configure. On the server `show()` returns a no-op ref without touching `document`:

```ts
{ id: 'sng-noop', dismiss: () => {}, afterDismissed: Promise.resolve('manual') }
```

So this is safe in a component that renders on both:

```ts
ngOnInit() {
  this.toast.info('Welcome back.'); // no-op on the server, real toast in the browser
}
```

One thing to watch: `afterDismissed` is **already resolved** with `'manual'` server-side. Code
that awaits it will not hang, but a `.then` that commits something (like the Undo recipe above)
runs immediately during SSR. Guard those with `isPlatformBrowser` if it matters.

## Wrapping the service

Typing a facade needs `SnackngVariantFn` and `SnackngOptions`:

```ts
import { SnackngOptions, SnackngRef, SnackngService } from 'snackng';

@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly toast = inject(SnackngService);

  saved(what: string, options?: SnackngOptions): SnackngRef {
    return this.toast.success(`${what} saved.`, { title: 'Done', ...options });
  }
}
```

## Building config on top of the defaults

`SNACKNG_DEFAULTS` is exported, so you can diff against it or extend it rather than restating
values that might change:

```ts
import { SNACKNG_DEFAULTS, provideSnackng } from 'snackng';

provideSnackng({ ...SNACKNG_DEFAULTS, max: 3 });
```

Reading the current config anywhere is `inject(SNACKNG_CONFIG)`.

## Accessibility notes

- Toast text is announced through one dedicated off-screen live region, not from the toast
  element. The toast carries **no** `aria-live` — nesting live regions is what produces the
  `HierarchyRequestError` seen in hand-rolled `MatSnackBar` wrappers.
- `danger` announces `assertive`, everything else `polite`. Override per call with `politeness`,
  or per custom type with `types[x].politeness`. `politeness: 'off'` renders the toast without
  announcing it at all.
- Dismiss timers pause on hover **and on keyboard focus**, so a toast cannot vanish mid-read.
  The config flag governing both is named `pauseOnHover`.
- Under `prefers-reduced-motion: reduce` the slide collapses to a fade and the blur eases off to
  `--snackng-blur-reduced`. The library never overrides that OS setting.
- The close button ships with `aria-label="Close notification"`, in English. There is no option
  to translate it yet.
