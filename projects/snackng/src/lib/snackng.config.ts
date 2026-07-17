import { InjectionToken, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  SnackngEffect,
  SnackngOverflow,
  SnackngPosition,
  SnackngStyle,
  SnackngTypeDef,
} from './snackng.model';

export interface SnackngConfig {
  duration: number;
  position: SnackngPosition;
  /** Maximum toasts on screen at once. Extras are handled per `overflow`. */
  max: number;
  /**
   * What happens when a toast arrives while `max` are already visible.
   * `'queue'` waits for a free slot — nothing is ever lost, but a flood becomes
   * a long parade. `'dismiss-oldest'` evicts the oldest to make room, so the
   * newest always wins; useful when an interceptor can emit toasts in bursts.
   */
  overflow: SnackngOverflow;
  /**
   * Milliseconds between releasing consecutive queued toasts. Staggering keeps
   * a burst from firing every enter animation at the same instant. `0` releases
   * as many as fit at once.
   */
  stagger: number;
  pauseOnHover: boolean;
  dismissible: boolean;
  /** Default glass preset for every toast. Overridable per call via `options.style`. */
  style: SnackngStyle;
  /** Default surface light effect. Overridable per call via `options.effect`. */
  effect: SnackngEffect;
  types: Record<string, SnackngTypeDef>;
}

export const SNACKNG_DEFAULTS: SnackngConfig = {
  duration: 5000,
  position: 'top-end',
  max: 5,
  overflow: 'queue',
  stagger: 90,
  pauseOnHover: true,
  dismissible: false,
  style: 'glass',
  effect: 'drift',
  types: {},
};

export const SNACKNG_CONFIG = new InjectionToken<SnackngConfig>('snackng.config', {
  providedIn: 'root',
  factory: () => SNACKNG_DEFAULTS,
});

/**
 * Optional. Without it the defaults above apply, so `npm i snackng` and calling
 * the service is enough to get working toasts.
 */
export function provideSnackng(config: Partial<SnackngConfig> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SNACKNG_CONFIG,
      useValue: {
        ...SNACKNG_DEFAULTS,
        ...config,
        types: { ...SNACKNG_DEFAULTS.types, ...config.types },
      } satisfies SnackngConfig,
    },
  ]);
}
