import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

const mockStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};
(globalThis as any).localStorage = mockStorage;
(globalThis as any).sessionStorage = mockStorage;
if (!(globalThis as any).document) {
  (globalThis as any).document = { body: { className: '' }, location: { href: '' }, createElement: () => ({}) };
}

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
