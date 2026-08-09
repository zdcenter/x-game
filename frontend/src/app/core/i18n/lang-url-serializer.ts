import { Injectable } from '@angular/core';
import { DefaultUrlSerializer, UrlTree } from '@angular/router';
import { isBrowser } from '../utils/browser.util';
import { SUPPORTED_LANGS } from './i18n.service';

const getLangRe = () => {
  const codes = SUPPORTED_LANGS.map(l => l.code).join('|');
  return new RegExp(`^\\/(${codes})(\\/|$)`);
};

@Injectable()
export class LangUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string): UrlTree {
    if (url.startsWith('/') && url !== '/' && !getLangRe().test(url)) {
      return super.parse('/' + this.getCurrentLang() + url);
    }
    return super.parse(url);
  }

  private getCurrentLang(): string {
    if (isBrowser()) {
      const m = window.location.pathname.match(getLangRe());
      if (m) return m[1];
    }
    return 'zh';
  }
}
