import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { SNACKNG_CONFIG } from './snackng.config';
import {
  SnackngAction,
  SnackngDismissReason,
  SnackngEffect,
  SnackngPoliteness,
  SnackngPosition,
  SnackngStyle,
  SnackngType,
} from './snackng.model';

export interface SnackngItem {
  readonly id: string;
  readonly type: SnackngType;
  readonly message: string;
  readonly title?: string;
  readonly duration: number;
  readonly position: SnackngPosition;
  readonly dismissible: boolean;
  readonly action?: SnackngAction;
  readonly style: SnackngStyle;
  readonly effect: SnackngEffect;
  readonly panelClass: readonly string[];
  readonly politeness: SnackngPoliteness;
  /** Set while the exit animation runs; the item is still in the DOM. */
  readonly leaving: boolean;
}

export interface SnackngStack {
  readonly position: SnackngPosition;
  readonly items: readonly SnackngItem[];
}

/**
 * Toast state, and the pacing of how toasts reach the screen.
 *
 * Producer/consumer: `add` only enqueues; `pump` is the sole consumer moving
 * items into view as capacity allows. Releasing directly would let a burst
 * render in one tick, appearing and evicting itself in the same frame.
 *
 * Separate from `SnackngService` so the service can create the host while the
 * host reads state, without an import cycle.
 */
@Injectable({ providedIn: 'root' })
export class SnackngStore implements OnDestroy {
  private readonly config = inject(SNACKNG_CONFIG);
  private readonly resolvers = new Map<string, (reason: SnackngDismissReason) => void>();
  private readonly reasons = new Map<string, SnackngDismissReason>();
  private pumpTimer?: ReturnType<typeof setTimeout>;
  private lastReleaseAt = 0;
  private counter = 0;

  /** Toasts currently rendered (including those playing their exit animation). */
  readonly items = signal<readonly SnackngItem[]>([]);
  /** Toasts accepted but still waiting for a free slot. */
  readonly queue = signal<readonly SnackngItem[]>([]);
  readonly pending = computed(() => this.queue().length);

  readonly stacks = computed<readonly SnackngStack[]>(() => {
    const byPosition = new Map<SnackngPosition, SnackngItem[]>();
    for (const item of this.items()) {
      const bucket = byPosition.get(item.position);
      bucket ? bucket.push(item) : byPosition.set(item.position, [item]);
    }
    return [...byPosition].map(([position, items]) => ({ position, items }));
  });

  add(item: Omit<SnackngItem, 'id' | 'leaving'>): {
    id: string;
    afterDismissed: Promise<SnackngDismissReason>;
  } {
    const id = `sng-${++this.counter}`;
    const afterDismissed = new Promise<SnackngDismissReason>((resolve) =>
      this.resolvers.set(id, resolve),
    );

    this.queue.update((queue) => [...queue, { ...item, id, leaving: false }]);
    this.pump();

    return { id, afterDismissed };
  }

  /**
   * Starts the exit animation; the item leaves the DOM on `finalize`. A toast
   * still queued is dropped outright, having never been shown.
   */
  dismiss(id: string, reason: SnackngDismissReason = 'manual'): void {
    if (this.queue().some((item) => item.id === id)) {
      this.queue.update((queue) => queue.filter((item) => item.id !== id));
      this.resolve(id, reason);
      return;
    }

    const target = this.items().find((item) => item.id === id);
    if (!target || target.leaving) {
      return;
    }
    this.reasons.set(id, reason);
    this.items.update((items) => items.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
  }

  /** Removes the item and resolves its `afterDismissed` promise. */
  finalize(id: string): void {
    if (!this.resolvers.has(id)) {
      return;
    }
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.resolve(id, this.reasons.get(id) ?? 'manual');
    this.reasons.delete(id);
    this.pump();
  }

  dismissAll(reason: SnackngDismissReason = 'manual'): void {
    // Drain the queue first, or it would march onto a screen just cleared.
    clearTimeout(this.pumpTimer);
    this.pumpTimer = undefined;
    for (const item of this.queue()) {
      this.resolve(item.id, reason);
    }
    this.queue.set([]);

    for (const item of this.items()) {
      this.dismiss(item.id, reason);
    }
  }

  /** The consumer. Runs on every add and every finalize. */
  private pump(): void {
    if (this.pumpTimer) {
      return; // a staggered release is already pending
    }

    while (this.queue().length) {
      // Counts leaving toasts too: they hold their slot until finalize removes
      // them, so ignoring them reads an expiring batch as free space.
      const onScreen = this.items();

      if (onScreen.length >= this.config.max) {
        if (this.config.overflow === 'dismiss-oldest') {
          // Evicting an already-leaving toast frees nothing.
          const victim = onScreen.find((item) => !item.leaving);
          if (victim) {
            this.dismiss(victim.id, 'replaced');
          }
        }
        return;
      }

      // Spaced by elapsed time, not queue length: callers add one at a time, so
      // a burst arrives as N pumps of one item and would never wait.
      const wait = this.config.stagger - (Date.now() - this.lastReleaseAt);
      if (this.config.stagger > 0 && wait > 0) {
        this.pumpTimer = setTimeout(() => {
          this.pumpTimer = undefined;
          this.pump();
        }, wait);
        return;
      }

      const [next, ...rest] = this.queue();
      this.queue.set(rest);
      this.items.update((items) => [...items, next]);
      this.lastReleaseAt = Date.now();
    }
  }

  private resolve(id: string, reason: SnackngDismissReason): void {
    this.resolvers.get(id)?.(reason);
    this.resolvers.delete(id);
  }

  ngOnDestroy(): void {
    clearTimeout(this.pumpTimer);
  }
}
