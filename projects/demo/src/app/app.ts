import { Component, inject, signal } from '@angular/core';
import { SnackngPosition, SnackngService } from 'snackng';

const POSITIONS: SnackngPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly toast = inject(SnackngService);

  protected readonly positions = POSITIONS;
  protected readonly position = signal<SnackngPosition>('top-end');
  protected readonly lastReason = signal<string>('—');
  protected readonly prefersReducedMotion = signal(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  protected success(): void {
    this.toast.success('Your changes were saved successfully.', {
      title: 'All done',
      position: this.position(),
    });
  }

  protected warning(): void {
    this.toast.warning('3 records are still unreconciled for this period.', {
      title: 'Review pending items',
      position: this.position(),
    });
  }

  protected danger(): void {
    this.toast.danger('Could not reach the server. Please try again.', {
      title: 'Something went wrong',
      position: this.position(),
    });
  }

  protected info(): void {
    this.toast.info('The next automatic sync runs at 18:00.', {
      title: 'Scheduled sync',
      position: this.position(),
    });
  }

  protected custom(): void {
    this.toast.show('deploy', 'Version 2.4.0 is now live in production.', {
      title: 'Deploy complete',
      position: this.position(),
    });
  }

  protected withAction(): void {
    const ref = this.toast.success('Item #4821 was deleted.', {
      title: 'Item deleted',
      position: this.position(),
      action: { label: 'Undo', handler: () => this.lastReason.set('Undo handler ran') },
    });
    ref.afterDismissed.then(reason => this.lastReason.set(reason));
  }

  protected sticky(): void {
    this.toast.warning('This toast will not close on its own. Use the X.', {
      title: 'Sticky',
      position: this.position(),
      duration: 0,
      dismissible: true,
    });
  }

  protected burst(): void {
    for (let i = 1; i <= 10; i++) {
      this.toast.info(`Burst message number ${i}.`, {
        title: `Toast ${i}`,
        position: this.position(),
        // Shorter than the default so the queue visibly drains during the demo.
        duration: 2000,
      });
    }
  }

  protected dismissAll(): void {
    this.toast.dismissAll();
  }
}
