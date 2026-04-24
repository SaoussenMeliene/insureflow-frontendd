import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'; // ← withInterceptorsFromDi
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
import { KeycloakService, KeycloakBearerInterceptor } from 'keycloak-angular';

function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url:      'http://localhost:8180',
        realm:    'insureflow',
        clientId: 'angular-app'
      },
      initOptions: {
        onLoad: 'check-sso', 
        silentCheckSsoRedirectUri:
          window.location.origin + '/silent-check-sso.html'
      },
      enableBearerInterceptor: true,
      bearerExcludedUrls: [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/health',
        '/api/auth/profile-image'
      ]
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),

    // ✅ withInterceptorsFromDi pour supporter HTTP_INTERCEPTORS classique
    provideHttpClient(withInterceptorsFromDi()),

    // ✅ Interceptor Keycloak
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: KeycloakBearerInterceptor,
      multi:    true
    },

    KeycloakService,
    {
      provide:    APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi:      true,
      deps:       [KeycloakService]
    }
  ]
};