import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  inject,
} from '@angular/core';
import { SnackngToast } from '../snackng-toast/snackng-toast';
import { SnackngStore } from '../snackng.store';

const SHIFT_DURATION = 260;
const SHIFT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Guarded: test environments such as jsdom render without `matchMedia`. */
function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

@Component({
  selector: 'sng-host',
  imports: [SnackngToast],
  templateUrl: './snackng-host.html',
  styleUrl: './snackng-host.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackngHost {
  private readonly store = inject(SnackngStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly stacks = this.store.stacks;

  private readonly offsets = new Map<string, number>();
  private readonly shifts = new Map<string, Animation>();

  constructor() {
    afterEveryRender(() => this.absorbLayoutShift());
  }

  /**
   * FLIP: offset each slot back to where it was, then animate that offset away,
   * so neighbours glide into a freed gap instead of snapping.
   *
   * Measured with `offsetTop` rather than `getBoundingClientRect`: the latter
   * includes transforms and would read an in-flight shift instead of the layout
   * beneath it. Stacks are full height and top-anchored, so a slot's offsetTop
   * only changes when it truly moves. Applied to the slot, never the toast, to
   * leave the toast's own enter/exit transform alone.
   */
  private absorbLayoutShift(): void {
    const slots = this.element.nativeElement.querySelectorAll<HTMLElement>('.sng-slot');
    const present = new Set<string>();

    for (const slot of slots) {
      const id = slot.dataset['sngId'];
      if (!id) {
        continue;
      }
      present.add(id);

      const top = slot.offsetTop;
      const previous = this.offsets.get(id);
      this.offsets.set(id, top);

      if (previous === undefined || previous === top || prefersReducedMotion()) {
        continue;
      }

      this.shifts.get(id)?.cancel();
      this.shifts.set(
        id,
        slot.animate([{ transform: `translateY(${previous - top}px)` }, { transform: 'none' }], {
          duration: SHIFT_DURATION,
          easing: SHIFT_EASING,
        }),
      );
    }

    for (const id of [...this.offsets.keys()]) {
      if (!present.has(id)) {
        this.offsets.delete(id);
        this.shifts.delete(id);
      }
    }
  }
}
