import { SnackngBuiltInType } from './snackng.model';

/**
 * Path data for the built-in glyphs, inlined so the package never requires an
 * icon font. Bound with `[attr.d]`, so no sanitizer is involved.
 */
export const SNACKNG_ICONS: Record<SnackngBuiltInType, string> = {
  success: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  warning: 'M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z',
  danger:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z',
};
