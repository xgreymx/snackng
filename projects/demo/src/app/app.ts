import { Component, inject, signal } from '@angular/core';
import { SnackngBuiltInStyle, SnackngEffect, SnackngPosition, SnackngService } from 'snackng';

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

@Component({
  selector: 'app-root',
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
  protected readonly lastReason = signal<string>('—');
  protected readonly prefersReducedMotion = signal(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  /** Sliders bound to the real library tokens on :root. */
  protected readonly tokens = signal<TokenControl[]>([
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
  ]);

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
  }

  /** Fires a toast in a given style, honouring the current effect + position. */
  protected showStyle(style: SnackngBuiltInStyle): void {
    this.toast.info(`This is the "${style}" glass preset.`, {
      title: `${style} preset`,
      position: this.position(),
      style,
      effect: this.effect(),
    });
  }

  protected success(): void {
    this.toast.success('Your changes were saved successfully.', {
      title: 'All done',
      position: this.position(),
      effect: this.effect(),
    });
  }

  protected warning(): void {
    this.toast.warning('3 records are still unreconciled for this period.', {
      title: 'Review pending items',
      position: this.position(),
      effect: this.effect(),
    });
  }

  protected danger(): void {
    this.toast.danger('Could not reach the server. Please try again.', {
      title: 'Something went wrong',
      position: this.position(),
      effect: this.effect(),
    });
  }

  protected info(): void {
    this.toast.info('The next automatic sync runs at 18:00.', {
      title: 'Scheduled sync',
      position: this.position(),
      effect: this.effect(),
    });
  }

  protected custom(): void {
    this.toast.show('deploy', 'Version 2.4.0 is now live in production.', {
      title: 'Deploy complete',
      position: this.position(),
      effect: this.effect(),
    });
  }

  protected withAction(): void {
    const ref = this.toast.success('Item #4821 was deleted.', {
      title: 'Item deleted',
      position: this.position(),
      effect: this.effect(),
      action: { label: 'Undo', handler: () => this.lastReason.set('Undo handler ran') },
    });
    ref.afterDismissed.then((reason) => this.lastReason.set(reason));
  }

  protected sticky(): void {
    this.toast.warning('This toast will not close on its own. Use the X.', {
      title: 'Sticky',
      position: this.position(),
      duration: 0,
      dismissible: true,
      effect: this.effect(),
    });
  }

  protected burst(): void {
    for (let i = 1; i <= 10; i++) {
      this.toast.info(`Burst message number ${i}.`, {
        title: `Toast ${i}`,
        position: this.position(),
        // Shorter than the default so the queue visibly drains during the demo.
        duration: 2000,
        effect: this.effect(),
      });
    }
  }

  protected dismissAll(): void {
    this.toast.dismissAll();
  }
}
