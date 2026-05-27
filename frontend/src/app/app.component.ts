import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiOverlayComponent } from './core/components/ui-overlay/ui-overlay.component';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiOverlayComponent],
  template: `
    <router-outlet></router-outlet>
    <app-ui-overlay></app-ui-overlay>
  `
})
export class AppComponent {
  private seoService = inject(SeoService); // Instantiate SEO service globally
}
