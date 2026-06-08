import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
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
        loadComponent: () => import('./features/blog/blog-list/blog-list.component').then(m => m.BlogListComponent),
        data: { seo: { title: 'Puzzle PK Blog - Educational Games & Brain Training', desc: 'Read our latest articles on brain games, child development, and how to make learning fun.', keywords: 'blog, brain training, educational games, puzzle pk' } }
      },
      {
        path: 'blog/:id',
        loadComponent: () => import('./features/blog/blog-post/blog-post.component').then(m => m.BlogPostComponent)
      },
      {
        path: 'games/minesweeper',
        loadComponent: () => import('./features/games/minesweeper/minesweeper.component').then(m => m.MinesweeperComponent),
        data: { seo: { titleKey: 'seo.minesweeper.title', descKey: 'seo.minesweeper.desc', keywordsKey: 'seo.minesweeper.keywords' } }
      },
      {
        path: 'games/sudoku',
        loadComponent: () => import('./features/games/sudoku/sudoku.component').then(m => m.SudokuComponent),
        data: { seo: { titleKey: 'seo.sudoku.title', descKey: 'seo.sudoku.desc', keywordsKey: 'seo.sudoku.keywords' } }
      },
      {
        path: 'games/sliding',
        loadComponent: () => import('./features/games/sliding/sliding.component').then(m => m.SlidingComponent),
        data: { seo: { titleKey: 'seo.sliding.title', descKey: 'seo.sliding.desc', keywordsKey: 'seo.sliding.keywords' } }
      },
      {
        path: 'games/hexa',
        loadComponent: () => import('./features/games/hexa/hexa.component').then(m => m.HexaComponent),
        data: { seo: { titleKey: 'seo.hexa.title', descKey: 'seo.hexa.desc', keywordsKey: 'seo.hexa.keywords' } }
      },
      {
        path: 'games/tetris',
        loadComponent: () => import('./features/games/tetris/tetris.component').then(m => m.TetrisComponent),
        data: { seo: { titleKey: 'seo.tetris.title', descKey: 'seo.tetris.desc', keywordsKey: 'seo.tetris.keywords' } }
      },
      {
        path: 'games/block',
        loadComponent: () => import('./features/games/block/block.component').then(m => m.BlockComponent),
        data: { seo: { titleKey: 'seo.block.title', descKey: 'seo.block.desc', keywordsKey: 'seo.block.keywords' } }
      },
      {
        path: 'games/gomoku',
        loadComponent: () => import('./features/games/gomoku/gomoku.component').then(m => m.GomokuComponent),
        data: { seo: { titleKey: 'seo.gomoku.title', descKey: 'seo.gomoku.desc', keywordsKey: 'seo.gomoku.keywords' } }
      },
      {
        path: 'games/codebreaker',
        loadComponent: () => import('./features/games/codebreaker/codebreaker.component').then(m => m.CodebreakerComponent),
        data: { seo: { titleKey: 'seo.codebreaker.title', descKey: 'seo.codebreaker.desc', keywordsKey: 'seo.codebreaker.keywords' } }
      },
      {
        path: 'games/math24',
        loadComponent: () => import('./features/games/math24/math24.component').then(m => m.Math24Component),
        data: { seo: { titleKey: 'seo.math24.title', descKey: 'seo.math24.desc', keywordsKey: 'seo.math24.keywords' } }
      },
      {
        path: 'games/drop2048',
        loadComponent: () => import('./features/games/drop2048/drop2048.component').then(m => m.Drop2048Component),
        data: { seo: { titleKey: 'seo.drop2048.title', descKey: 'seo.drop2048.desc', keywordsKey: 'seo.drop2048.keywords' } }
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { seo: { titleKey: 'seo.profile.title', descKey: 'seo.profile.desc', keywordsKey: 'seo.profile.keywords' } }
      }
    ]
  },

  // -- Admin Facing Routes --
  {
    path: 'admin',
    loadComponent: () => import('./core/layouts/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    data: { seo: { titleKey: 'seo.admin.title', descKey: 'seo.admin.desc', keywordsKey: 'seo.admin.keywords' } },
    children: [
      { path: '', redirectTo: 'realtime', pathMatch: 'full' },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
      },
      {
        path: 'games',
        loadComponent: () => import('./features/admin/admin-games.component').then(m => m.AdminGamesComponent)
      },
      {
        path: 'announcements',
        loadComponent: () => import('./features/admin/admin-announcements.component').then(m => m.AdminAnnouncementsComponent)
      },
      {
        path: 'realtime',
        loadComponent: () => import('./features/admin/admin-realtime.component').then(m => m.AdminRealtimeComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'lobby' }
];
