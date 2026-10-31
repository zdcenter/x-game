import { Routes, Router } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { GAME_DEFINITIONS } from './core/config/game-definitions';
import { langResolver } from './core/i18n/lang.resolver';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { SUPPORTED_LANGS } from './core/i18n/i18n.service';

const browserRedirectGuard = () => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return inject(Router).parseUrl('/zh/lobby');
  }
  return true; // Stay on route during SSR to prevent meta refresh HTML generation
};

import { Route } from '@angular/router';

const adminRoute: Route = {
  path: 'admin',
  loadComponent: () => import('./core/layouts/admin-layout.component').then(m => m.AdminLayoutComponent),
  canActivate: [adminGuard],
  data: { seo: { titleKey: 'seo.admin.title', descKey: 'seo.admin.desc', keywordsKey: 'seo.admin.keywords' } },
  children: [
    { path: '', redirectTo: 'realtime', pathMatch: 'full' },
    { path: 'users', loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
    { path: 'games', loadComponent: () => import('./features/admin/admin-games.component').then(m => m.AdminGamesComponent) },
    { path: 'announcements', loadComponent: () => import('./features/admin/admin-announcements.component').then(m => m.AdminAnnouncementsComponent) },
    { path: 'realtime', loadComponent: () => import('./features/admin/admin-realtime.component').then(m => m.AdminRealtimeComponent) },
    { path: 'ads', loadComponent: () => import('./features/admin/admin-ads.component').then(m => m.AdminAdsComponent) },
    { path: 'settings', loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent) },
    { path: 'achievements', loadComponent: () => import('./features/admin/admin-achievements.component').then(m => m.AdminAchievementsComponent) },
    { path: 'daily-challenges', loadComponent: () => import('./features/admin/admin-daily-challenges.component').then(m => m.AdminDailyChallengesComponent) },
    { path: 'leaderboard', loadComponent: () => import('./features/admin/admin-leaderboard.component').then(m => m.AdminLeaderboardComponent) },
    { path: 'xp-config', loadComponent: () => import('./features/admin/admin-xp-config.component').then(m => m.AdminXpConfigComponent) },
    { path: 'images', loadComponent: () => import('./features/admin/admin-images.component').then(m => m.AdminImagesComponent) },
    { path: 'feedbacks', loadComponent: () => import('./features/admin/admin-feedback.component').then(m => m.AdminFeedbackComponent) },
    { path: 'database', loadComponent: () => import('./features/admin/admin-database.component').then(m => m.AdminDatabaseComponent) }
  ]
};

// Shared children used by both the 'en' and 'zh' literal routes.
// Using literal paths ('en'/'zh') instead of ':lang' prevents
// bare paths like /games/sudoku from ever matching as a lang segment.
const langChildren: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    data: { seo: { titleKey: 'seo.login.title', descKey: 'seo.login.desc', keywordsKey: 'seo.login.keywords' } }
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
    data: { seo: { titleKey: 'seo.register.title', descKey: 'seo.register.desc', keywordsKey: 'seo.register.keywords' } }
  },

  // -- Admin Facing Routes -- (Must precede Player Facing empty path to avoid wildcard hijacking)
  adminRoute,

  // -- Player Facing Routes --
  {
    path: '',
    loadComponent: () => import('./core/layouts/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'lobby',
        loadComponent: () => import('./features/lobby/lobby.component').then(m => m.LobbyComponent),
        data: { seo: { titleKey: 'seo.lobby.title', descKey: 'seo.lobby.desc', keywordsKey: 'seo.lobby.keywords' } }
      },
      {
        path: 'blog',
        loadComponent: () => import('./features/blog/blog-post/blog-post.component').then(m => m.BlogPostComponent),
        data: { seo: { titleKey: 'seo.blog.title', descKey: 'seo.blog.desc', keywordsKey: 'seo.blog.keywords' } }
      },
      {
        path: 'blog/:id',
        loadComponent: () => import('./features/blog/blog-post/blog-post.component').then(m => m.BlogPostComponent)
      },
      {
        path: 'pages/:id',
        loadComponent: () => import('./features/pages/static-page.component').then(m => m.StaticPageComponent)
      },
      {
        path: 'docs',
        loadComponent: () => import('./features/docs/docs.component').then(m => m.DocsComponent),
        data: { seo: { titleKey: 'seo.docs.title', descKey: 'seo.docs.desc', keywordsKey: 'seo.docs.keywords' } }
      },
      ...GAME_DEFINITIONS.map(def => ({
        path: `docs/${def.id}`,
        loadComponent: () => import('./features/docs/docs.component').then(m => m.DocsComponent),
        data: { 
          gameId: def.id,
          seo: {
            titleKey:    `seo.docs.${def.id}.title`,
            descKey:     `seo.docs.${def.id}.desc`,
            keywordsKey: `seo.docs.${def.id}.keywords`
          }
        }
      })),
      {
        path: 'legal/:type',
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent),
        data: { seo: { titleKey: 'seo.legal.title', descKey: 'seo.legal.desc', keywordsKey: 'seo.legal.keywords' } }
      },
      // Game routes — auto-generated from GAME_DEFINITIONS
      ...GAME_DEFINITIONS.map(def => ({
        path: def.route.slice(1), // '/games/foo' -> 'games/foo'
        loadComponent: def.loadComponent,
        data: { seo: {
          titleKey:    `seo.${def.id}.title`,
          descKey:     `seo.${def.id}.desc`,
          keywordsKey: `seo.${def.id}.keywords`
        }}
      })),
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { seo: { titleKey: 'seo.profile.title', descKey: 'seo.profile.desc', keywordsKey: 'seo.profile.keywords' } }
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
        data: { seo: { titleKey: 'seo.leaderboard.title', descKey: 'seo.leaderboard.desc', keywordsKey: 'seo.leaderboard.keywords' } }
      },
      {
        path: 'daily',
        loadComponent: () => import('./features/daily/daily.component').then(m => m.DailyComponent),
        data: { seo: { titleKey: 'seo.daily.title', descKey: 'seo.daily.desc', keywordsKey: 'seo.daily.keywords' } }
      },
      {
        path: 'pk-arena',
        loadComponent: () => import('./features/pk-arena/pk-arena.component').then(m => m.PkArenaComponent),
        data: { seo: { titleKey: 'seo.pk_arena.title', descKey: 'seo.pk_arena.desc', keywordsKey: 'seo.pk_arena.keywords' } }
      },
      {
        path: '404',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
        data: { seo: { titleKey: 'seo.not_found.title', descKey: 'seo.not_found.desc', keywordsKey: 'seo.not_found.keywords' } }
      },
      {
        path: '**',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
        data: { seo: { titleKey: 'seo.not_found.title', descKey: 'seo.not_found.desc', keywordsKey: 'seo.not_found.keywords' } }
      }
    ]
  }
];

export const routes: Routes = [
  { path: '', canActivate: [browserRedirectGuard], children: [], pathMatch: 'full' },
  // Direct support for root-level /admin/** routes without requiring lang prefix
  adminRoute,
  ...SUPPORTED_LANGS.map(lang => ({
    path: lang.code,
    resolve: { lang: langResolver },
    children: langChildren
  })),
  { path: '**', canActivate: [browserRedirectGuard], children: [] }
];
