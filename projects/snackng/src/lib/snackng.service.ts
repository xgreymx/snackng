import {
  ApplicationRef,
  ComponentRef,
  DOCUMENT,
  EnvironmentInjector,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  createComponent,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SNACKNG_CONFIG } from './snackng.config';
import { SnackngLiveRegion } from './live-region';
import { SnackngHost } from './snackng-host/snackng-host';
import { SnackngStore } from './snackng.store';
import {
  SnackngDismissReason,
  SnackngOptions,
  SnackngPoliteness,
  SnackngRef,
  SnackngStyle,
  SnackngType,
} from './snackng.model';

const NOOP_REF: SnackngRef = {
  id: 'sng-noop',
  dismiss: () => {},
  afterDismissed: Promise.resolve<SnackngDismissReason>('manual'),
};

/**
 * A variant shortcut (`success`, `danger`, …). Callable directly, and also
 * carries a method per built-in glass preset so you can pick a look inline:
 * `snackng.success.solid('Saved')` is sugar for
 * `snackng.success('Saved', { style: 'solid' })`.
 */
export interface SnackngVariantFn {
  (message: string, options?: SnackngOptions): SnackngRef;
  glass(message: string, options?: SnackngOptions): SnackngRef;
  solid(message: string, options?: SnackngOptions): SnackngRef;
  translucent(message: string, options?: SnackngOptions): SnackngRef;
  transparent(message: string, options?: SnackngOptions): SnackngRef;
  frosted(message: string, options?: SnackngOptions): SnackngRef;
  flat(message: string, options?: SnackngOptions): SnackngRef;
}

@Injectable({ providedIn: 'root' })
export class SnackngService implements OnDestroy {
  private readonly store = inject(SnackngStore);
  private readonly config = inject(SNACKNG_CONFIG);
  private readonly liveRegion = inject(SnackngLiveRegion);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private host?: ComponentRef<SnackngHost>;

  /**
   * Toasts accepted but still waiting for a free slot under `overflow: 'queue'`.
   * Useful for a "3 more" affordance.
   */
  readonly pending = this.store.pending;

  /** Callable shortcut with per-preset sugar, e.g. `success.solid('Saved')`. */
  readonly success = this.variant('success');
  readonly warning = this.variant('warning');
  readonly danger = this.variant('danger');
  readonly info = this.variant('info');

  /** Builds a callable variant carrying a method per built-in preset. */
  private variant(type: SnackngType): SnackngVariantFn {
    const withStyle =
      (style?: SnackngStyle) =>
      (message: string, options?: SnackngOptions): SnackngRef =>
        this.show(type, message, style ? { ...options, style } : options);

    return Object.assign(withStyle(), {
      glass: withStyle('glass'),
      solid: withStyle('solid'),
      translucent: withStyle('translucent'),
      transparent: withStyle('transparent'),
      frosted: withStyle('frosted'),
      flat: withStyle('flat'),
    });
  }

  show(type: SnackngType, message: string, options: SnackngOptions = {}): SnackngRef {
    // Client-only: no-op rather than throw on `document` during SSR.
    if (!this.isBrowser) {
      return NOOP_REF;
    }

    this.ensureHost();

    const politeness = this.resolvePoliteness(type, options);
    const { id, afterDismissed } = this.store.add({
      type,
      message,
      title: options.title,
      duration: options.duration ?? this.config.duration,
      position: options.position ?? this.config.position,
      dismissible: options.dismissible ?? this.config.dismissible,
      action: options.action,
      style: options.style ?? this.config.style,
      effect: options.effect ?? this.config.effect,
      panelClass: normalizeClasses(options.panelClass),
      politeness,
    });

    this.liveRegion.announce([options.title, message].filter(Boolean).join('. '), politeness);

    return {
      id,
      afterDismissed,
      dismiss: () => this.store.dismiss(id, 'manual'),
    };
  }

  dismissAll(): void {
    this.store.dismissAll();
  }

  private resolvePoliteness(type: SnackngType, options: SnackngOptions): SnackngPoliteness {
    if (options.politeness) {
      return options.politeness;
    }
    const configured = this.config.types[type]?.politeness;
    if (configured) {
      return configured;
    }
    // Errors interrupt; everything else waits for a pause.
    return type === 'danger' ? 'assertive' : 'polite';
  }

  private ensureHost(): void {
    if (this.host) {
      return;
    }
    this.host = createComponent(SnackngHost, { environmentInjector: this.injector });
    this.appRef.attachView(this.host.hostView);
    this.document.body.appendChild(this.host.location.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.host) {
      this.appRef.detachView(this.host.hostView);
      this.host.destroy();
      this.host = undefined;
    }
  }
}

function normalizeClasses(panelClass: string | string[] | undefined): string[] {
  if (!panelClass) {
    return [];
  }
  return Array.isArray(panelClass) ? panelClass : [panelClass];
}
