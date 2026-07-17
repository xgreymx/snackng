/*
 * Public API Surface of snackng
 */

export { SnackngService } from './lib/snackng.service';
export type { SnackngVariantFn } from './lib/snackng.service';
export { provideSnackng, SNACKNG_CONFIG, SNACKNG_DEFAULTS } from './lib/snackng.config';
export type { SnackngConfig } from './lib/snackng.config';
export type {
  SnackngAction,
  SnackngBuiltInStyle,
  SnackngBuiltInType,
  SnackngDismissReason,
  SnackngEffect,
  SnackngOptions,
  SnackngPoliteness,
  SnackngPosition,
  SnackngRef,
  SnackngStyle,
  SnackngType,
  SnackngTypeDef,
} from './lib/snackng.model';
