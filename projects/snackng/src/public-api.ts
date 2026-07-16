/*
 * Public API Surface of snackng
 */

export { SnackngService } from './lib/snackng.service';
export { provideSnackng, SNACKNG_CONFIG, SNACKNG_DEFAULTS } from './lib/snackng.config';
export type { SnackngConfig } from './lib/snackng.config';
export type {
  SnackngAction,
  SnackngBuiltInType,
  SnackngDismissReason,
  SnackngOptions,
  SnackngPoliteness,
  SnackngPosition,
  SnackngRef,
  SnackngType,
  SnackngTypeDef,
} from './lib/snackng.model';
