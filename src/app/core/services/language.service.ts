import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem('lang') || 'fr';
    this.translate.setDefaultLang('fr');
    this.translate.use(saved);
  }

  get current(): string {
    return this.translate.currentLang || 'fr';
  }

  toggle() {
    const next = this.current === 'fr' ? 'en' : 'fr';
    this.translate.use(next);
    localStorage.setItem('lang', next);
  }

  use(lang: 'fr' | 'en') {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }
}