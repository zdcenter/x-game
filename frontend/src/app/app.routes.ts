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
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
      },
      {
        path: 'games',
        loadComponent: () => import('./features/admin/admin-games.component').then(m => m.AdminGamesComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'lobby' }
];
