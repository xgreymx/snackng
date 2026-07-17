/** Built-in severities. Any other string is a custom type registered via `provideSnackng`. */
export type SnackngBuiltInType = 'success' | 'warning' | 'danger' | 'info';

// `(string & {})` keeps autocomplete for the built-ins while still accepting custom types.
// eslint-disable-next-line @typescript-eslint/ban-types
export type SnackngType = SnackngBuiltInType | (string & {});

export type SnackngPosition =
  'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

export type SnackngPoliteness = 'polite' | 'assertive' | 'off';

export type SnackngOverflow = 'queue' | 'dismiss-oldest';

/** Built-in glass presets. `(string & {})` keeps autocomplete while allowing a
 * custom preset defined in CSS via a `.sng-style--<name>` rule. */
export type SnackngBuiltInStyle =
  'glass' | 'solid' | 'translucent' | 'transparent' | 'frosted' | 'flat';
// eslint-disable-next-line @typescript-eslint/ban-types
export type SnackngStyle = SnackngBuiltInStyle | (string & {});

/** Idle/interactive light effect on the glass surface. */
export type SnackngEffect = 'none' | 'drift' | 'glare' | 'both';

/** `'replaced'` means the toast was evicted under `overflow: 'dismiss-oldest'`. */
export type SnackngDismissReason = 'timeout' | 'action' | 'manual' | 'replaced';

export interface SnackngAction {
  label: string;
  handler?: () => void;
  /** Dismiss the toast when the action is clicked. Defaults to true. */
  dismissOnClick?: boolean;
}

/**
 * Definition for a custom type. Built-in types already have icon and colors;
 * a custom type inherits the neutral surface and is styled through
 * `--snackng-<type>-bg` / `--snackng-<type>-ink`.
 */
export interface SnackngTypeDef {
  /**
   * Raw SVG markup for the icon. Trusted as-is (bypasses Angular's sanitizer),
   * so it must come from your code, never from user input. Falls back to the
   * `info` glyph when omitted.
   */
  icon?: string;
  politeness?: SnackngPoliteness;
}

export interface SnackngOptions {
  title?: string;
  /** Milliseconds before auto-dismiss. `0` keeps the toast until dismissed. */
  duration?: number;
  action?: SnackngAction;
  position?: SnackngPosition;
  /** Show the close button. */
  dismissible?: boolean;
  /** Overrides the politeness derived from the type. */
  politeness?: SnackngPoliteness;
  /** Glass preset for this toast. Overrides the global `style`. Defaults to `'glass'`. */
  style?: SnackngStyle;
  /** Surface light effect for this toast. Overrides the global `effect`. Defaults to `'drift'`. */
  effect?: SnackngEffect;
  panelClass?: string | string[];
}

export interface SnackngRef {
  readonly id: string;
  dismiss(): void;
  readonly afterDismissed: Promise<SnackngDismissReason>;
}
