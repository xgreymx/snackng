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
  SnackngType,
} from './snackng.model';

const NOOP_REF: SnackngRef = {
  id: 'sng-noop',
  dismiss: () => {},
  afterDismissed: Promise.resolve<SnackngDismissReason>('manual'),
};

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

  success(message: string, options?: SnackngOptions): SnackngRef {
    return this.show('success', message, options);
  }

  warning(message: string, options?: SnackngOptions): SnackngRef {
    return this.show('warning', message, options);
  }

  danger(message: string, options?: SnackngOptions): SnackngRef {
    return this.show('danger', message, options);
  }

  info(message: string, options?: SnackngOptions): SnackngRef {
    return this.show('info', message, options);
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
