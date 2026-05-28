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
