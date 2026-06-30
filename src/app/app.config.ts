import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
import { KeycloakService, KeycloakBearerInterceptor } from 'keycloak-angular';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export class ManualTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}
  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/i18n/${lang}.json`);
  }
}

export function HttpLoaderFactory(http: HttpClient): ManualTranslateLoader {
  return new ManualTranslateLoader(http);
}

function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url:      'https://insureflow-keycloak.onrender.com',
        realm:    'insureflow',
        clientId: 'angular-app'
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false, 
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

    provideHttpClient(withInterceptorsFromDi()),

    // ✅ ngx-translate
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'fr',
        loader: {
          provide:    TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps:       [HttpClient]
        }
      })
    ),

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
    },
  ]
};
