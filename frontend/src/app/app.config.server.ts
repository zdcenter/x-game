import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { BlogService } from './core/services/blog.service';
import { ServerBlogService } from './core/services/blog.service.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: BlogService, useClass: ServerBlogService },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
