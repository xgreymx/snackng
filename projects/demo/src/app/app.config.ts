import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideSnackng } from 'snackng';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideSnackng({
      max: 4,
      types: {
        deploy: {
          icon: '<svg viewBox="0 0 24 24"><path d="M12 2 4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
        },
      },
    }),
  ],
};
