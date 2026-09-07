import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

type Tab = 'call' | 'global' | 'css';

/**
 * Shows the page's current settings as code you can paste. Dumb on purpose:
 * App owns the signals, this only picks a tab, copies, and collapses.
 */
@Component({
  selector: 'app-snippet-bar',
  templateUrl: './snippet-bar.html',
  styleUrl: './snippet-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnippetBar {
  readonly perCall = input.required<readonly string[]>();
  readonly global = input.required<readonly string[]>();
  readonly css = input.required<readonly string[]>();

  protected readonly tabs: readonly { id: Tab; label: string }[] = [
    { id: 'call', label: 'per call' },
    { id: 'global', label: 'global' },
    { id: 'css', label: 'CSS tokens' },
  ];

  protected readonly tab = signal<Tab>('call');
  // Starts closed: bottom-anchored toast stacks sit above this bar.
  protected readonly open = signal(false);
  protected readonly copied = signal(false);

  protected readonly lines = computed<readonly string[]>(() => {
    switch (this.tab()) {
      case 'global':
        return this.global();
      case 'css':
        return this.css();
      default:
        return this.perCall();
    }
  });

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.lines().join('\n'));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard is permission-gated and absent over plain http on some
      // browsers. The code is on screen either way — say nothing, do nothing.
    }
  }
}
