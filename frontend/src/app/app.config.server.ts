import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { BlogService } from './core/services/blog.service';
import { ServerBlogService } from './core/services/blog.service.server';
import { GameService } from './core/services/game.service';
import { ServerGameService } from './core/services/game.service.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: BlogService, useClass: ServerBlogService },
    { provide: GameService, useClass: ServerGameService },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
