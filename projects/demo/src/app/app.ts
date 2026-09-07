import { Component, computed, inject, signal } from '@angular/core';
import {
  SNACKNG_DEFAULTS,
  SnackngBuiltInStyle,
  SnackngEffect,
  SnackngPosition,
  SnackngRef,
  SnackngService,
} from 'snackng';
import { SnippetBar } from './snippet-bar/snippet-bar';

const POSITIONS: SnackngPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

const STYLES: SnackngBuiltInStyle[] = [
  'glass',
  'solid',
  'translucent',
  'transparent',
  'frosted',
  'flat',
];

const EFFECTS: SnackngEffect[] = ['none', 'drift', 'glare', 'both'];

/** Live-tunable glass tokens for the playground. Each maps to a `--snackng-*`
 *  custom property written on :root, so it affects every toast on screen. */
interface TokenControl {
  readonly token: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly unit: (v: number) => string;
}

const TOKEN_DEFAULTS: readonly TokenControl[] = [
  {
    token: '--snackng-tint',
    label: 'Transparency',
    min: 30,
    max: 98,
    step: 1,
    value: 86,
    unit: (v) => `${v}% opaque`,
  },
  {
    token: '--snackng-blur',
    label: 'Blur',
    min: 0,
    max: 30,
    step: 1,
    value: 20,
    unit: (v) => `${v}px`,
  },
  {
    token: '--snackng-spec-strength',
    label: 'Reflection',
    min: 0,
    max: 40,
    step: 1,
    value: 15,
    unit: (v) => (v / 100).toFixed(2),
  },
  {
    token: '--snackng-spec-size',
    label: 'Reflection size',
    min: 20,
    max: 60,
    step: 1,
    value: 30,
    unit: (v) => `${v}%`,
  },
  {
    token: '--snackng-drift-duration',
    label: 'Drift speed',
    min: 1,
    max: 10,
    step: 1,
    value: 4,
    unit: (v) => `${v}s`,
  },
];

/** Fresh copy of the defaults, so resetting can restore slider positions. */
function cloneTokenDefaults(): TokenControl[] {
  return TOKEN_DEFAULTS.map((c) => ({ ...c }));
}

@Component({
  selector: 'app-root',
  imports: [SnippetBar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly toast = inject(SnackngService);

  protected readonly positions = POSITIONS;
  protected readonly styles = STYLES;
  protected readonly effects = EFFECTS;

  protected readonly position = signal<SnackngPosition>('top-end');
  protected readonly effect = signal<SnackngEffect>('drift');
  protected readonly dismissible = signal(true);
  protected readonly style = signal<SnackngBuiltInStyle>('glass');
  /** Newest first. Every toast this page fires reports its ending here. */
  protected readonly log = signal<readonly string[]>([]);
  protected readonly prefersReducedMotion = signal(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  /** Sliders bound to the real library tokens on :root. */
  protected readonly tokens = signal<TokenControl[]>(cloneTokenDefaults());

  // ── Snippets ────────────────────────────────────────────────────────────
  // Only what differs from the real library defaults. A snippet that repeats
  // the defaults back at you teaches nothing and does not compile any better.

  /** `[key, value]` for every chip moved off `SNACKNG_DEFAULTS`. */
  private readonly changedOptions = computed<readonly [string, string][]>(() => {
    const picked = {
      position: this.position(),
      style: this.style(),
      effect: this.effect(),
      dismissible: this.dismissible(),
    };
    return Object.entries(picked)
      .filter(([key, value]) => value !== SNACKNG_DEFAULTS[key as keyof typeof picked])
      .map(([key, value]) => [key, typeof value === 'string' ? `'${value}'` : `${value}`]);
  });

  /** Sliders moved off their starting position, as CSS declarations. */
  private readonly changedTokens = computed<readonly string[]>(() =>
    this.tokens()
      .filter((c, i) => c.value !== TOKEN_DEFAULTS[i].value)
      .map((c) => `  ${c.token}: ${this.toTokenValue(c, c.value)};`),
  );

  /** Lines, not one blob: the template renders them and the copy button joins. */
  protected readonly perCallSnippet = computed<readonly string[]>(() => {
    const options = this.changedOptions();
    if (!options.length) {
      return ['// Everything here is already the default.', `toast.success('Saved.');`];
    }
    return [
      `toast.success('Saved.', {`,
      ...options.map(([key, value]) => `  ${key}: ${value},`),
      `});`,
    ];
  });

  protected readonly globalSnippet = computed<readonly string[]>(() => {
    const options = this.changedOptions();
    const call = options.length
      ? [
          `    provideSnackng({`,
          ...options.map(([key, value]) => `      ${key}: ${value},`),
          `    }),`,
        ]
      : [`    provideSnackng(), // every value is the default; the call is optional`];
    return [
      `import { provideSnackng } from 'snackng';`,
      ``,
      `bootstrapApplication(App, {`,
      `  providers: [`,
      ...call,
      `  ],`,
      `});`,
    ];
  });

  protected readonly cssSnippet = computed<readonly string[]>(() => {
    const declarations = this.changedTokens();
    if (!declarations.length) {
      return ['/* Sliders are at their defaults — nothing to override. */'];
    }
    return [
      '/* Any global stylesheet. Overrides on :root win over presets. */',
      ':root {',
      ...declarations,
      '}',
    ];
  });

  private toTokenValue(control: TokenControl, raw: number): string {
    switch (control.token) {
      case '--snackng-tint':
      case '--snackng-spec-strength':
        return (raw / 100).toString();
      case '--snackng-blur':
        return `${raw}px`;
      case '--snackng-spec-size':
        return `${raw}%`;
      case '--snackng-drift-duration':
        return `${raw}s`;
      default:
        return `${raw}`;
    }
  }

  protected onToken(control: TokenControl, event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    document.documentElement.style.setProperty(control.token, this.toTokenValue(control, raw));
    this.tokens.update((list) =>
      list.map((c) => (c.token === control.token ? { ...c, value: raw } : c)),
    );
  }

  protected resetTokens(): void {
    for (const control of this.tokens()) {
      document.documentElement.style.removeProperty(control.token);
    }
    // Snap the sliders back to their defaults so the reset is visible.
    this.tokens.set(cloneTokenDefaults());
  }

  /** What the chips at the top of the page mean: options every demo toast gets.
   *  Spread it first so a button's own `duration` still wins. */
  private base() {
    return {
      position: this.position(),
      effect: this.effect(),
      dismissible: this.dismissible(),
      style: this.style(),
    };
  }

  /** Newest first, capped — `burst()` alone fires ten. */
  private note(text: string): void {
    this.log.update((lines) => [text, ...lines].slice(0, 8));
  }

  /**
   * Every toast on this page goes through here, so the log shows all of them.
   * `afterDismissed` resolves once, per toast, with how it ended — attach it at
   * the one place toasts are created rather than at each button.
   */
  private fire(ref: SnackngRef, label: string): SnackngRef {
    ref.afterDismissed.then((reason) => this.note(`${label} · ${reason}`));
    return ref;
  }

  /** Fires a toast in a given style, honouring the current effect + position. */
  protected showStyle(style: SnackngBuiltInStyle): void {
    // Fires *and* selects: one click still shows the preset, and the snippet
    // below now reflects what you picked.
    this.style.set(style);
    this.fire(
      this.toast.info(`This is the "${style}" glass preset.`, {
        title: `${style} preset`,
        ...this.base(),
      }),
      style,
    );
  }

  protected success(): void {
    this.fire(
      this.toast.success('Your changes were saved successfully.', {
        title: 'All done',
        ...this.base(),
      }),
      'success',
    );
  }

  protected warning(): void {
    this.fire(
      this.toast.warning('3 records are still unreconciled for this period.', {
        title: 'Review pending items',
        ...this.base(),
      }),
      'warning',
    );
  }

  protected danger(): void {
    this.fire(
      this.toast.danger('Could not reach the server. Please try again.', {
        title: 'Something went wrong',
        ...this.base(),
      }),
      'danger',
    );
  }

  protected info(): void {
    this.fire(
      this.toast.info('The next automatic sync runs at 18:00.', {
        title: 'Scheduled sync',
        ...this.base(),
      }),
      'info',
    );
  }

  protected custom(): void {
    this.fire(
      this.toast.show('deploy', 'Version 2.4.0 is now live in production.', {
        title: 'Deploy complete',
        ...this.base(),
      }),
      'deploy',
    );
  }

  protected withAction(): void {
    // The handler gets its own log line. Writing it into the same slot as the
    // dismiss reason is what made this readout look broken: the reason landed
    // right on top of it a tick later.
    this.fire(
      this.toast.success('Item #4821 was deleted.', {
        title: 'Item deleted',
        ...this.base(),
        action: { label: 'Undo', handler: () => this.note('Undo handler ran') },
      }),
      'success',
    );
  }

  protected sticky(): void {
    this.fire(
      this.toast.warning('This toast will not close on its own. Use the X.', {
        title: 'Sticky',
        ...this.base(),
        duration: 0,
        // Opts in whatever the toggle says: without an X this one could never leave.
        dismissible: true,
      }),
      'warning',
    );
  }

  protected burst(): void {
    for (let i = 1; i <= 10; i++) {
      this.fire(
        this.toast.info(`Burst message number ${i}.`, {
          title: `Toast ${i}`,
          ...this.base(),
          // Shorter than the default so the queue visibly drains during the demo.
          duration: 2000,
        }),
        `burst ${i}`,
      );
    }
  }

  protected dismissAll(): void {
    this.toast.dismissAll();
  }
}
