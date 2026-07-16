import { DOCUMENT, Injectable, OnDestroy, inject } from '@angular/core';
import { SnackngPoliteness } from './snackng.model';

/**
 * Announces toast text to screen readers, in place of the CDK `LiveAnnouncer`.
 *
 * The toast markup carries no `aria-live` of its own: text is copied into this
 * off-screen region instead. Keep it that way — a live region nested inside
 * another throws `HierarchyRequestError` when the outer one relocates its
 * content.
 */
@Injectable({ providedIn: 'root' })
export class SnackngLiveRegion implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private region?: HTMLElement;
  private clearTimer?: ReturnType<typeof setTimeout>;

  announce(message: string, politeness: SnackngPoliteness = 'polite'): void {
    if (politeness === 'off' || !message) {
      return;
    }

    const region = this.ensureRegion();
    region.setAttribute('aria-live', politeness);

    // Clearing first forces assistive tech to treat an identical repeated
    // message as a new announcement.
    region.textContent = '';
    clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => (region.textContent = message), 100);
  }

  private ensureRegion(): HTMLElement {
    if (this.region?.isConnected) {
      return this.region;
    }

    const region = this.document.createElement('div');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-live', 'polite');
    region.classList.add('sng-live-region');
    // Visually hidden but still announced: `display:none` would silence it.
    region.style.cssText =
      'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
      'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;';

    this.document.body.appendChild(region);
    this.region = region;
    return region;
  }

  ngOnDestroy(): void {
    clearTimeout(this.clearTimer);
    this.region?.remove();
    this.region = undefined;
  }
}
