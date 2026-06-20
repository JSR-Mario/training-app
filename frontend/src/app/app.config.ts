import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { apiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([
      apiUrlInterceptor,
      jwtInterceptor,
      authErrorInterceptor
    ])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Disable caching for data APIs by making registration strategy manual or caching none.
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideCharts(withDefaultRegisterables())
  ]
};
