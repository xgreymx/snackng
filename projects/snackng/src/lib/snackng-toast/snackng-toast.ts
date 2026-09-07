import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SNACKNG_CONFIG } from '../snackng.config';
import { SNACKNG_ICONS } from '../icons';
import { SnackngBuiltInType } from '../snackng.model';
import { SnackngItem, SnackngStore } from '../snackng.store';

const EXIT_DURATION = 200;
/** Guards against `animationend` never firing (reduced motion, jsdom, backgrounded tab). */
const EXIT_FALLBACK = EXIT_DURATION + 150;

@Component({
  selector: 'sng-toast',
  templateUrl: './snackng-toast.html',
  styleUrl: './snackng-toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '(mouseenter)': 'pause()',
    '(mouseleave)': 'resume()',
    '(focusin)': 'pause()',
    '(focusout)': 'resume()',
  },
})
export class SnackngToast implements OnDestroy {
  readonly item = input.required<SnackngItem>();

  private readonly store = inject(SnackngStore);
  private readonly config = inject(SNACKNG_CONFIG);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  private timer?: ReturnType<typeof setTimeout>;
  private exitTimer?: ReturnType<typeof setTimeout>;
  private armed = false;
  private remaining = 0;
  private startedAt = 0;
  private glareBound = false;

  protected readonly hostClasses = computed(() => {
    const item = this.item();
    const classes = [
      'sng-toast',
      `sng--${item.type}`,
      `sng-at--${item.position}`,
      `sng-style--${item.style}`,
      item.leaving ? 'sng-leaving' : 'sng-entering',
      ...item.panelClass,
    ];
    if (item.effect === 'drift' || item.effect === 'both') {
      classes.push('sng-fx--drift');
    }
    if (item.effect === 'glare' || item.effect === 'both') {
      classes.push('sng-fx--glare');
    }
    return classes.join(' ');
  });

  /** Whether this toast tracks the pointer for the cursor glare effect. */
  protected readonly glareEnabled = computed(() => {
    const fx = this.item().effect;
    return fx === 'glare' || fx === 'both';
  });

  /** Null when the type brings its own SVG; unknown types fall back to `info`. */
  protected readonly iconPath = computed<string | null>(() => {
    const type = this.item().type;
    if (this.config.types[type]?.icon) {
      return null;
    }
    return SNACKNG_ICONS[type as SnackngBuiltInType] ?? SNACKNG_ICONS.info;
  });

  /** Custom types may supply raw SVG markup, trusted as authored config. */
  protected readonly iconSvg = computed<SafeHtml | null>(() => {
    const custom = this.config.types[this.item().type]?.icon;
    return custom ? this.sanitizer.bypassSecurityTrustHtml(custom) : null;
  });

  constructor() {
    effect(() => {
      if (this.item().leaving) {
        this.stopTimer();
        this.scheduleFinalize();
      } else {
        this.startTimer();
      }
    });

    // Bind pointer tracking once, only if this toast uses the glare effect.
    effect(() => {
      if (this.glareEnabled() && !this.glareBound) {
        this.bindGlare();
      }
    });
  }

  /** Writes the cursor position into CSS vars the glare layer reads. Runs
   *  outside Angular — it only mutates style, no change detection needed. */
  private bindGlare(): void {
    this.glareBound = true;
    const el = this.element.nativeElement;
    this.zone.runOutsideAngular(() => {
      el.addEventListener('pointermove', this.onGlareMove);
      el.addEventListener('pointerleave', this.onGlareLeave);
    });
  }

  private readonly onGlareMove = (event: PointerEvent): void => {
    const el = this.element.nativeElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    el.style.setProperty('--sng-glare-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--sng-glare-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    el.style.setProperty('--sng-glare-op', '1');
  };

  private readonly onGlareLeave = (): void => {
    this.element.nativeElement.style.setProperty('--sng-glare-op', '0');
  };

  protected onAction(): void {
    const action = this.item().action;
    action?.handler?.();
    if (action?.dismissOnClick !== false) {
      this.store.dismiss(this.item().id, 'action');
    }
  }

  protected onDismiss(): void {
    this.store.dismiss(this.item().id, 'manual');
  }

  protected pause(): void {
    if (!this.config.pauseOnHover || !this.timer) {
      return;
    }
    this.remaining -= Date.now() - this.startedAt;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  protected resume(): void {
    if (!this.config.pauseOnHover || this.timer || this.remaining <= 0 || this.item().leaving) {
      return;
    }
    this.arm(this.remaining);
  }

  /** Arms once per toast: re-running on later item updates would reset a paused timer. */
  private startTimer(): void {
    const duration = this.item().duration;
    if (this.armed || duration <= 0) {
      return;
    }
    this.armed = true;
    this.remaining = duration;
    this.arm(duration);
  }

  private arm(ms: number): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.store.dismiss(this.item().id, 'timeout'), ms);
  }

  private stopTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private scheduleFinalize(): void {
    if (this.exitTimer) {
      return;
    }
    const finalize = () => {
      clearTimeout(this.exitTimer);
      this.store.finalize(this.item().id);
    };
    this.element.nativeElement.addEventListener('animationend', finalize, { once: true });
    this.exitTimer = setTimeout(finalize, EXIT_FALLBACK);
  }

  ngOnDestroy(): void {
    this.stopTimer();
    clearTimeout(this.exitTimer);
    if (this.glareBound) {
      const el = this.element.nativeElement;
      el.removeEventListener('pointermove', this.onGlareMove);
      el.removeEventListener('pointerleave', this.onGlareLeave);
    }
  }
}
