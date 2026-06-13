import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

// Mock browser APIs for SSG Prerendering
const mockStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};
(global as any).localStorage = mockStorage;
(global as any).sessionStorage = mockStorage;
if (!(global as any).document) {
  (global as any).document = { body: { className: '' }, location: { href: '' } };
}

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
