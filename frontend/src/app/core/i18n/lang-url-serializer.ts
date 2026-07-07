import { Injectable } from '@angular/core';
import { DefaultUrlSerializer, UrlTree } from '@angular/router';
import { isBrowser } from '../utils/browser.util';

const LANG_RE = /^\/(en|zh)(\/|$)/;

@Injectable()
export class LangUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string): UrlTree {
    if (url.startsWith('/') && url !== '/' && !LANG_RE.test(url)) {
      return super.parse('/' + this.getCurrentLang() + url);
    }
    return super.parse(url);
  }

  private getCurrentLang(): string {
    if (isBrowser()) {
      const m = window.location.pathname.match(LANG_RE);
      if (m) return m[1];
    }
    return 'zh';
  }
}
