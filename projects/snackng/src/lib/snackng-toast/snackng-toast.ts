import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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

  private timer?: ReturnType<typeof setTimeout>;
  private exitTimer?: ReturnType<typeof setTimeout>;
  private armed = false;
  private remaining = 0;
  private startedAt = 0;

  protected readonly hostClasses = computed(() => {
    const item = this.item();
    return [
      'sng-toast',
      `sng--${item.type}`,
      `sng-at--${item.position}`,
      item.leaving ? 'sng-leaving' : 'sng-entering',
      ...item.panelClass,
    ].join(' ');
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
  }

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
  }
}
