import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  
  // -- Player Facing Routes --
  {
    path: '',
    loadComponent: () => import('./core/layouts/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'lobby',
        loadComponent: () => import('./features/lobby/lobby.component').then(m => m.LobbyComponent)
      },
      {
        path: 'games/minesweeper',
        loadComponent: () => import('./features/games/minesweeper/minesweeper.component').then(m => m.MinesweeperComponent)
      },
      {
        path: 'games/sudoku',
        loadComponent: () => import('./features/games/sudoku/sudoku.component').then(m => m.SudokuComponent)
      }
    ]
  },

  // -- Admin Facing Routes --
  {
    path: 'admin',
    loadComponent: () => import('./core/layouts/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
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
