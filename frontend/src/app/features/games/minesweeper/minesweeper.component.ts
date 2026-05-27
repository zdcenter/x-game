import { Component, OnInit, OnDestroy, inject, effect, signal, computed, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MinesweeperStore, GameStatus } from './store/minesweeper.store';
import { CellComponent } from './components/cell/cell.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameService, getLocalizedField } from '../../../core/services/game.service';
import { marked } from 'marked';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';

import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, CellComponent, DragDropModule, GameLobbyPanelComponent, GameResultOverlayComponent],
  providers: [MinesweeperStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-grow flex flex-col lg:flex-row h-[calc(100vh-64px)] p-2 lg:p-6 gap-4 lg:gap-6 transition-colors duration-300 overflow-y-auto lg:overflow-hidden">
      
      <!-- LEFT: Game Arena (70%) -->
      <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-[600px] lg:min-h-0">
        
        <!-- Premium Glassmorphism Container -->
        <div class="w-full h-full flex flex-col backdrop-blur-xl border rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 overflow-y-auto"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
          
          <!-- Header -->
          <div class="flex items-center justify-between mb-4 lg:mb-6 pb-4 border-b" style="border-color: var(--color-border-card)">
            <!-- Left: Title & Mode -->
            <!-- Left: Title & Mode -->
            <div class="flex items-center space-x-2 lg:space-x-4 flex-1">
              <button (click)="goBack()" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm lg:text-base mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.back')() || 'Back' }}</span>
              </button>
              <h1 class="text-lg lg:text-2xl font-extrabold tracking-tight flex items-center whitespace-nowrap">
                <span class="bg-clip-text text-transparent" style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                  {{ i18n.t('app.title')() }}
                </span>
                <span class="text-[10px] lg:text-sm ml-2 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg text-[var(--color-text-main)] font-semibold shadow-sm tracking-normal">
                  {{ currentRoomMode() === 'pk_steal' ? i18n.t('game.pk_steal_label')() : (currentRoomMode() === 'pk_speed' ? i18n.t('game.pk_speed_label')() : i18n.t('game.single_label')()) }}
                </span>
              </h1>
              <button (click)="showRules.set(true)" class="opacity-70 hover:opacity-100 hover:text-[var(--color-accent-to)] transition-colors p-1 rounded-full hover:bg-[var(--color-bg-card)]" [title]="i18n.t('game.rules.tooltip')()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            
            <!-- Center: PK Scoreboard OR Single Player Difficulty -->
            <div class="flex justify-center gap-2 lg:gap-4 flex-1 items-center">
              @if (currentRoomMode() === 'single') {
                <div class="hidden sm:flex rounded-xl p-1 shadow-inner">
                  <button (click)="openDifficultySettings('single')" 
                          class="px-4 py-1.5 rounded-lg border border-[var(--color-border-card)] text-sm font-bold bg-[var(--color-bg-card)] hover:bg-[var(--color-accent-to)] hover:text-[var(--color-bg-main)] transition-colors flex items-center gap-2 shadow-sm">
                    {{ getDifficultyText(currentDifficulty()) }}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              } @else if (currentRoomMode() === 'pk_speed' && store.speedOpponents().length > 0) {
                <div class="flex flex-wrap items-center gap-2 lg:gap-4 justify-center flex-1">
                  @for (opp of store.speedOpponents(); track opp.id) {
                    <div class="flex items-center gap-1 lg:gap-2 bg-[var(--color-bg-main)] px-2 lg:px-3 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] shadow-inner">
                      <span class="text-[8px] lg:text-xs opacity-70 font-bold max-w-[50px] truncate" [title]="opp.id">{{ opp.id }}</span>
                      <div class="w-10 lg:w-20 h-1.5 lg:h-2 bg-[var(--color-bg-card)] rounded-full overflow-hidden border border-[var(--color-border-card)]">
                        <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] transition-all duration-300" [style.width]="opp.progress + '%'"></div>
                      </div>
                      <span class="text-[8px] lg:text-xs font-mono font-bold text-[var(--color-accent-to)]">{{ opp.progress | number:'1.0-0' }}%</span>
                      @if (opp.errors > 0) {
                        <span class="text-[8px] lg:text-xs font-bold text-red-400 flex items-center" title="Mistakes">
                          💣{{ opp.errors }}
                        </span>
                      }
                    </div>
                  }
                </div>
              } @else {
                @for (player of getPlayerScores(); track player.id) {
                  <div class="px-2 lg:px-4 py-1 lg:py-2 rounded-full border bg-[var(--color-bg-main)] flex items-center gap-1.5 lg:gap-3 transition-transform"
                       [class.border-[var(--color-accent-to)]]="player.id === playerId"
                       [class.scale-110]="player.id === playerId"
                       [class.shadow-lg]="player.id === playerId"
                       [class.border-[var(--color-border-card)]]="player.id !== playerId">
                    <span class="text-[8px] lg:text-xs font-bold opacity-70 max-w-[80px] truncate" [title]="player.id">{{ player.id }}</span>
                    <span class="text-sm lg:text-lg font-black" [class.text-[var(--color-accent-to)]]="player.id === playerId" [class.text-inherit]="player.id !== playerId">{{ player.score }}</span>
                    @if (player.id !== playerId && store.opponentErrors() > 0) {
                      <span class="text-xs text-red-400 font-bold" title="Mistakes">💣{{ store.opponentErrors() }}</span>
                    }
                    @if (player.id === playerId && store.myErrors() > 0) {
                      <span class="text-xs text-red-400 font-bold" title="Mistakes">💣{{ store.myErrors() }}</span>
                    }
                  </div>
                }
              }
            </div>

            <!-- Right: Timer & Mines -->
            <div class="flex space-x-2 lg:space-x-6 flex-1 justify-end items-center">
              @if (store.status() === 'playing') {
                <div class="font-mono text-sm lg:text-xl font-bold text-[var(--color-accent-to)] bg-[var(--color-bg-main)] px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] flex items-center gap-1 lg:gap-2 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-5 lg:w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ elapsedTime() }}
                </div>
              }

              <div class="flex flex-col items-center bg-[var(--color-bg-main)] px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] shadow-inner">
                <span class="text-[8px] lg:text-xs opacity-70 font-semibold uppercase tracking-wider">{{ i18n.t('minesweeper.mines')() }}</span>
                <span class="text-sm lg:text-2xl font-mono text-[var(--color-accent-to)] font-bold">{{ store.remainingMines() | number:'2.0' }}</span>
              </div>
              
              @if (currentRoomMode() !== 'single') {
                <button (click)="leaveRoom()" class="px-2 lg:px-4 py-1 lg:py-2 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-bold transition-colors flex items-center gap-1 lg:gap-2 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span class="hidden sm:inline">{{ i18n.t('game.leave')() }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Game Board (Grid) -->
          <div class="relative p-4 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-inner flex justify-center flex-grow overflow-hidden"
               [class.animate-gold-pulse]="store.status() === 'finished' && !isDefeat()"
               [class.animate-red-pulse]="store.status() === 'finished' && isDefeat()">
            
            <!-- Waiting Overlay -->
            @if (store.status() === 'waiting' && currentRoomMode() !== 'single') {
              <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-overlay)] backdrop-blur-sm rounded-2xl text-[var(--color-text-main)]">
                @if (getPlayerScores().length < 2) {
                  <div class="w-12 h-12 border-4 border-slate-600 border-t-[var(--color-accent-to)] rounded-full animate-spin mb-4"></div>
                  <h2 class="text-2xl font-bold tracking-widest uppercase">{{ i18n.t('game.waiting_challenger')() }}</h2>
                } @else {
                  @if (store.host() === playerId) {
                    <h2 class="text-3xl font-black mb-6 uppercase">{{ i18n.t('game.ready')() }}</h2>
                    <button (click)="store.startGame()" class="px-8 py-4 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                      {{ i18n.t('game.start_pk')() }}
                    </button>
                  } @else {
                    <div class="w-12 h-12 border-4 border-slate-600 border-t-[var(--color-accent-from)] rounded-full animate-spin mb-4"></div>
                    <h2 class="text-2xl font-bold tracking-widest uppercase">{{ i18n.t('game.waiting_host')() }}</h2>
                  }
                }
              </div>
            }
            
            <!-- Starting Overlay -->
            @if (store.status() === GameStatus.Starting) {
              <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-overlay)] backdrop-blur-md rounded-2xl">
                <h2 class="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse">
                  {{ countdownDisplay() }}
                </h2>
                <p class="text-white mt-4 font-bold tracking-[0.3em] uppercase opacity-70">{{ i18n.t('game.get_ready')() }}</p>
              </div>
            }

            <!-- Victory Overlay -->
            @if (store.status() === 'finished') {
              <app-game-result-overlay
                [status]="getOverlayStatus()"
                [title]="getOverlayTitle()"
                [subtitle]="getOverlaySubtitle()"
                [showRestart]="currentRoomMode() === 'single' || store.host() === playerId"
                (restart)="store.restartGame()">
              </app-game-result-overlay>
            }

            <!-- Frozen Overlay (PK Steal Penalty) -->
            @if (isFrozen()) {
              <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/20 backdrop-blur-sm rounded-2xl pointer-events-none">
                <h2 class="text-4xl font-black text-red-500 uppercase tracking-widest animate-pulse drop-shadow-md">
                  {{ frozenCountdownDisplay() }}s
                </h2>
                <p class="text-red-300 font-bold text-sm mt-2">{{ i18n.t('game.frozen_msg')() }}</p>
              </div>
            }

            <div class="inline-flex flex-col gap-1 relative z-0 m-auto cursor-grab active:cursor-grabbing will-change-transform" 
                 [class.opacity-50]="isFrozen()" 
                 [class.pointer-events-none]="isFrozen() || store.status() === GameStatus.Starting"
                 [class.animate-board-shake]="store.status() === 'finished'"
                 cdkDrag>
              @for (row of store.board(); track $index) {
                <div class="flex gap-1">
                  @for (cell of row; track cell.x + '-' + cell.y) {
                    <app-cell 
                      [cell]="cell"
                      (reveal)="handleCellClick(cell.x, cell.y)"
                      (flag)="store.toggleFlag(cell.x, cell.y)"
                    ></app-cell>
                  }
                </div>
              }
            </div>
          </div>
          
          <!-- Rules Modal -->
          @if (showRules()) {
            <div class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-overlay)] backdrop-blur-sm text-[var(--color-text-main)]">
              <div class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                <div class="flex justify-between items-center p-4 border-b border-[var(--color-border-card)]">
                  <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ i18n.t('game.rules.title')() }}
                  </h3>
                  <button (click)="showRules.set(false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div class="p-6 overflow-y-auto text-sm opacity-90 markdown-body leading-relaxed"
                     [innerHTML]="parsedRulesHTML()">
                </div>
                <div class="p-4 border-t border-[var(--color-border-card)] flex justify-end">
                  <button (click)="showRules.set(false)" class="px-6 py-2 bg-[var(--color-bg-card)] hover:opacity-80 rounded-lg font-bold transition-colors border border-[var(--color-border-card)]">
                    {{ i18n.t('game.rules.got_it')() }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- RIGHT: Social Lobby Sidebar (30%) -->
      <div class="w-full lg:w-80 flex-shrink-0 flex flex-col min-h-[400px] lg:min-h-0">
        <app-game-lobby-panel
          [currentGameId]="'minesweeper'"
          [gameModes]="minesweeperModes"
          [difficulties]="predefinedDifficulties"
          [currentRoomId]="currentRoomId()"
          (joinRoom)="handleJoinRoom($event)"
          (createRoom)="handleCreateRoom($event)"
          (dismissRoom)="dismissRoom()"
        ></app-game-lobby-panel>
      </div>

    </div>

    <!-- Difficulty Settings Modal (Only used for single player now) -->
    @if (isDifficultyModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="isDifficultyModalOpen.set(false)"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-[var(--color-bg-main)] rounded-3xl shadow-2xl border border-[var(--color-border-card)] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="p-6 pb-4 border-b border-[var(--color-border-card)] flex justify-between items-center bg-[var(--color-bg-card)]">
            <h2 class="text-xl font-bold">{{ i18n.t('game.settings_title')() }}</h2>
            <button (click)="isDifficultyModalOpen.set(false)" class="opacity-50 hover:opacity-100 transition-opacity p-2 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <!-- Content -->
          <div class="overflow-y-auto p-4 flex-1 space-y-2">
            @for (diff of predefinedDifficulties; track diff.id) {
              <button (click)="selectedDifficulty.set(diff.id)"
                      class="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                      [class.border-[var(--color-accent-to)]]="selectedDifficulty() === diff.id"
                      [class.bg-[var(--color-bg-card)]]="selectedDifficulty() === diff.id"
                      [class.border-[var(--color-border-card)]]="selectedDifficulty() !== diff.id"
                      [class.hover:bg-[var(--color-bg-card)]]="selectedDifficulty() !== diff.id">
                <span class="font-bold text-sm" [class.text-[var(--color-accent-to)]]="selectedDifficulty() === diff.id">{{ i18n.t($any(diff.labelKey))() }}</span>
                <span class="text-xs opacity-60 font-mono">{{ diff.desc }}</span>
              </button>
            }

            <div class="w-full mt-4 border border-[var(--color-border-card)] rounded-xl overflow-hidden transition-all"
                 [class.border-[var(--color-accent-to)]]="selectedDifficulty() === 'custom'"
                 [class.bg-[var(--color-bg-card)]]="selectedDifficulty() === 'custom'">
              <button (click)="selectedDifficulty.set('custom')" class="w-full flex items-center justify-between px-4 py-3">
                <span class="font-bold text-sm" [class.text-[var(--color-accent-to)]]="selectedDifficulty() === 'custom'">{{ i18n.t('game.diff_custom')() }}</span>
                <span class="text-xs opacity-60 font-mono" *ngIf="selectedDifficulty() === 'custom'">{{ customWidth() }}x{{ customHeight() }}, {{ customMines() }}</span>
              </button>
              
              @if (selectedDifficulty() === 'custom') {
                <div class="px-4 pb-4 space-y-4">
                  <div class="pt-2 border-t border-[var(--color-border-card)]">
                    <div class="flex justify-between mb-1">
                      <label class="text-xs font-bold opacity-70">{{ i18n.t('game.width')() }}</label>
                      <span class="text-xs font-mono">{{ customWidth() }}</span>
                    </div>
                    <input type="range" [min]="9" [max]="30" [value]="customWidth()" (input)="customWidth.set($any($event.target).valueAsNumber); updateCustomMines()"
                           class="w-full accent-[var(--color-accent-to)] h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <label class="text-xs font-bold opacity-70">{{ i18n.t('game.height')() }}</label>
                      <span class="text-xs font-mono">{{ customHeight() }}</span>
                    </div>
                    <input type="range" [min]="9" [max]="24" [value]="customHeight()" (input)="customHeight.set($any($event.target).valueAsNumber); updateCustomMines()"
                           class="w-full accent-[var(--color-accent-to)] h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <label class="text-xs font-bold opacity-70">{{ i18n.t('game.mines')() }}</label>
                      <span class="text-xs font-mono">{{ customMines() }}</span>
                    </div>
                    <input type="range" [min]="10" [max]="customWidth() * customHeight() - 15" [value]="customMines()" (input)="customMines.set($any($event.target).valueAsNumber)"
                           class="w-full accent-[var(--color-accent-to)] h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                  </div>
                </div>
              }
            </div>
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
            <button (click)="applyDifficultySettings()" class="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              {{ i18n.t('game.apply')() }}
            </button>
          </div>
        </div>
      </div>
    }

  `
})
export class MinesweeperComponent implements OnInit {
  store = inject(MinesweeperStore);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  wsService = inject(WebSocketService); // For lobby data
  audioService = inject(AudioService);
  toastService = inject(ToastService);
  gameService = inject(GameService);
  GameStatus = GameStatus; // Expose for template
  
  showRules = signal(false);
  gameRules = signal('');
  route = inject(ActivatedRoute);
  router = inject(Router);
  parsedRulesHTML = computed(() => marked.parse(this.gameRules(), { async: false }) as string);

  playerId = this.authStore.currentUser()?.username || 'Guest';
  currentRoomMode = signal<string>('single');
  currentRoomId = signal<string>('');
  currentDifficulty = signal<string>('intermediate');

  // Difficulty Settings Modal State (Single player)
  isDifficultyModalOpen = signal(false);
  editingDifficultyFor = signal<'single' | 'room'>('single');
  selectedDifficulty = signal<string>('intermediate');
  customWidth = signal(9);
  customHeight = signal(9);
  customMines = signal(10);

  predefinedDifficulties = [
    { id: 'beginner', labelKey: 'game.diff_beginner', desc: '9x9 (10)' },
    { id: 'intermediate', labelKey: 'game.diff_intermediate', desc: '16x16 (40)' },
    { id: 'advanced', labelKey: 'game.diff_advanced', desc: '30x16 (99)' },
    { id: 'hard_mode', labelKey: 'game.diff_hard_mode', desc: '30x18 (130)' },
    { id: 'professional', labelKey: 'game.diff_professional', desc: '30x20 (160)' },
    { id: 'master', labelKey: 'game.diff_master', desc: '30x22 (190)' },
    { id: 'expert', labelKey: 'game.diff_expert', desc: '30x24 (230)' }
  ];

  minesweeperModes = [
    { id: 'pk_steal', labelKey: 'game.steal_mode', descKey: 'game.pk_steal_desc', icon: '⚡', desc: 'Shared board. Race to flag mines!' },
    { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to clear wins!' }
  ];

  // Derived UI State
  hasLostSingleMode = computed(() => this.currentRoomMode() === 'single' && this.store.board().some(row => row.some(c => c.state === 3))); // CellState.Exploded is 3

  isDefeat = computed(() => {
    if (this.currentRoomMode() === 'single') return this.hasLostSingleMode();
    if (this.currentRoomMode() === 'pk_speed') return !this.hasWonSpeedMode();
    if (this.currentRoomMode() === 'pk_steal') {
      const rawScores = this.store.scores();
      const myScore = rawScores[this.playerId] || 0;
      const otherScores = Object.keys(rawScores).filter(id => id !== this.playerId).map(id => rawScores[id]);
      const maxOtherScore = otherScores.length > 0 ? Math.max(...otherScores) : 0;
      
      return myScore < maxOtherScore;
    }
    return false;
  });

  // Modal State
  isCreateModalOpen = signal<boolean>(false);
  newRoomName = signal<string>('');
  newRoomMode = signal<string>('pk_steal');
  newRoomDifficulty = signal<string>('intermediate');

  // React to cooldowns received from the server
  isFrozen = signal<boolean>(false);
  frozenCountdownDisplay = signal<number>(0);
  private freezeTimer: any;
  private freezeInterval: any;
  
  // Countdown Timer for PK Start
  countdownDisplay = signal<string>('3');
  private countdownInterval: any;

  // Elapsed Timer for PK Match
  elapsedTime = signal<string>('00:00');
  private elapsedInterval: any;

  constructor() {
    // Initial loading state
    effect(() => {
      if (this.gameRules() === '') {
        this.gameRules.set(this.i18n.t('game.rules.loading')());
      }
    }, { allowSignalWrites: true });

    this.gameService.getGames().subscribe(games => {
      const ms = games.find(g => g.id === 'minesweeper');
      if (ms) {
        this.gameRules.set(getLocalizedField(ms.rules, this.i18n.currentLang()));
      } else {
        this.gameRules.set(this.i18n.t('game.rules.not_found')());
      }
    });

    // Watch for countdown and elapsed timer
    effect(() => {
      const status = this.store.status();
      const mode = this.currentRoomMode();

      // Countdown logic
      if (status === GameStatus.Starting) {
        this.startCountdown();
      } else {
        this.stopCountdown();
      }

      // Elapsed timer logic
      if (status === GameStatus.Playing && mode !== 'single') {
        if (!this.elapsedInterval) {
          this.elapsedInterval = setInterval(() => {
            const startAt = this.store.startAt();
            if (startAt > 0) {
              const diffMs = Date.now() - startAt;
              const totalSec = Math.max(0, Math.floor(diffMs / 1000));
              const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
              const s = (totalSec % 60).toString().padStart(2, '0');
              this.elapsedTime.set(`${m}:${s}`);
            }
          }, 1000);
        }
      } else {
        if (this.elapsedInterval) {
          clearInterval(this.elapsedInterval);
          this.elapsedInterval = null;
        }
        if (status === GameStatus.Waiting || status === GameStatus.Starting) {
          this.elapsedTime.set('00:00');
        }
      }
    });

    // Watch for cooldown updates
    effect(() => {
      const cooldowns = this.store.cooldowns();
      const until = cooldowns[this.playerId] || 0;
      const now = Date.now();
      
      if (this.freezeInterval) {
        clearInterval(this.freezeInterval);
        this.freezeInterval = null;
      }
      
      if (until > now) {
        this.isFrozen.set(true);
        this.frozenCountdownDisplay.set(Math.ceil((until - now) / 1000));
        
        this.freezeInterval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          } else {
            this.frozenCountdownDisplay.set(rem);
          }
        }, 100);

        clearTimeout(this.freezeTimer);
        this.freezeTimer = setTimeout(() => {
          this.isFrozen.set(false);
          if (this.freezeInterval) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          }
        }, until - Date.now());
      } else {
        this.isFrozen.set(false);
      }
    }, { allowSignalWrites: true });

    // Watch for room dismissed events
    effect(() => {
      const dismissed = this.wsService.roomDismissedEvent();
      if (dismissed > 0 && untracked(() => this.currentRoomMode()) !== 'single') {
        this.toastService.show(this.i18n.t('game.room_dismissed_msg')() || 'The host has dismissed the room.', 'info');
        this.leaveRoom();
      }
    });
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  startCountdown() {
    this.stopCountdown();
    this.audioService.playClick(); // initial beep
    
    // We do a local 3-second countdown to avoid server-client clock sync drift
    let secondsLeft = 3;
    this.countdownDisplay.set(secondsLeft.toString());
    
    this.countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        this.countdownDisplay.set('GO!');
        this.audioService.playFlag(); // High pitched GO
        this.stopCountdown();
      } else {
        this.countdownDisplay.set(secondsLeft.toString());
        this.audioService.playClick(); // Tick
      }
    }, 1000);
  }

  ngOnInit() {
    // 1. Connect to Lobby
    this.wsService.connectLobby(this.playerId, this.playerId);
    
    // 2. Check for deep link (query params)
    this.route.queryParams.subscribe(params => {
      if (params['roomId']) {
        this.joinRoom(params['roomId'], params['mode'] || 'pk_steal', params['difficulty'] || 'intermediate', params['host']);
        // Clean URL to prevent re-join on refresh (optional, but good UX)
        window.history.replaceState({}, '', '/minesweeper');
        return; // Don't check sessionStorage if we joined via URL
      }
      
      // 3. Check for reconnect
      const reconnectRoom = sessionStorage.getItem('minesweeper_reconnect_room');
      const reconnectMode = sessionStorage.getItem('minesweeper_reconnect_mode');
      const reconnectDiff = sessionStorage.getItem('minesweeper_reconnect_diff');
      
      if (reconnectRoom && reconnectMode) {
        this.joinRoom(reconnectRoom, reconnectMode, reconnectDiff || 'medium');
      } else {
        // 4. Connect to local single player game by default
        const savedDiff = localStorage.getItem('minesweeper_single_diff') || 'intermediate';
        this.changeSingleDifficulty(savedDiff);
      }
    });
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  createRoom() {
    this.newRoomName.set('PK-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    this.isCreateModalOpen.set(true);
  }


  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string}) {
    if (this.currentRoomId() === event.roomId) return;
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    this.newRoomName.set(event.name);
    this.newRoomMode.set(event.mode);
    this.newRoomDifficulty.set(event.difficulty);
    this.confirmCreateRoom();
  }

  confirmCreateRoom() {
    localStorage.setItem('minesweeper_pk_mode', this.newRoomMode());
    localStorage.setItem('minesweeper_pk_diff', this.newRoomDifficulty());
    this.isCreateModalOpen.set(false);
    this.joinRoom(this.newRoomName(), this.newRoomMode(), this.newRoomDifficulty(), this.playerId);
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomId.set(roomId);
    
    let finalHostId: string | undefined = hostId;
    if (!finalHostId && mode !== 'single') {
      const room = this.wsService.activeRooms().find((r: any) => r.id === roomId);
      if (room) {
        finalHostId = room.host;
      } else {
        finalHostId = sessionStorage.getItem('minesweeper_reconnect_host') || undefined;
      }
    }

    if (mode !== 'single') {
      sessionStorage.setItem('minesweeper_reconnect_room', roomId);
      sessionStorage.setItem('minesweeper_reconnect_mode', mode);
      sessionStorage.setItem('minesweeper_reconnect_diff', difficulty);
      if (finalHostId) {
        sessionStorage.setItem('minesweeper_reconnect_host', finalHostId);
      }
    }
    
    this.store.joinGame(roomId, this.playerId, mode, difficulty, finalHostId);
  }

  leaveRoom() {
    this.currentRoomId.set('');
    this.store.leaveGame();
    sessionStorage.removeItem('minesweeper_reconnect_room');
    sessionStorage.removeItem('minesweeper_reconnect_mode');
    sessionStorage.removeItem('minesweeper_reconnect_diff');
    sessionStorage.removeItem('minesweeper_reconnect_host');
    // Give the leave_game message 100ms to be sent before resetting to single player
    setTimeout(() => {
      this.changeSingleDifficulty('intermediate');
    }, 100);
  }

  openDifficultySettings(forMode: 'single' | 'room') {
    this.editingDifficultyFor.set(forMode);
    const currentDiff = forMode === 'single' ? this.currentDifficulty() : this.newRoomDifficulty();
    
    if (currentDiff.startsWith('custom_')) {
      this.selectedDifficulty.set('custom');
      const parts = currentDiff.split('_');
      if (parts.length === 4) {
        this.customWidth.set(parseInt(parts[1], 10));
        this.customHeight.set(parseInt(parts[2], 10));
        this.customMines.set(parseInt(parts[3], 10));
      }
    } else {
      this.selectedDifficulty.set(currentDiff);
    }
    
    this.isDifficultyModalOpen.set(true);
  }

  applyDifficultySettings() {
    let diffToApply = this.selectedDifficulty();
    if (diffToApply === 'custom') {
      diffToApply = `custom_${this.customWidth()}_${this.customHeight()}_${this.customMines()}`;
    }
    
    if (this.editingDifficultyFor() === 'single') {
      this.changeSingleDifficulty(diffToApply);
    } else {
      this.newRoomDifficulty.set(diffToApply);
    }
    this.isDifficultyModalOpen.set(false);
  }

  updateCustomMines() {
    // Ensure mines don't exceed (W*H - 1)
    const maxMines = this.customWidth() * this.customHeight() - 1;
    if (this.customMines() > maxMines) {
      this.customMines.set(maxMines);
    }
  }

  changeSingleDifficulty(diff: string) {
    this.currentDifficulty.set(diff);
    localStorage.setItem('minesweeper_single_diff', diff);
    this.currentRoomMode.set('single');
    
    let width = 16, height = 16, mines = 40;
    if (diff.startsWith('custom_')) {
      const parts = diff.split('_');
      if (parts.length === 4) {
        width = parseInt(parts[1], 10) || 16;
        height = parseInt(parts[2], 10) || 16;
        mines = parseInt(parts[3], 10) || 40;
      }
    } else {
      switch (diff) {
        case 'easy': case 'beginner': width = 9; height = 9; mines = 10; break;
        case 'medium': case 'intermediate': width = 16; height = 16; mines = 40; break;
        case 'hard': case 'advanced': width = 30; height = 16; mines = 99; break;
        case 'hard_mode': width = 30; height = 18; mines = 130; break;
        case 'professional': width = 30; height = 20; mines = 160; break;
        case 'master': width = 30; height = 22; mines = 190; break;
        case 'expert': width = 30; height = 24; mines = 230; break;
      }
    }
    
    this.store.startLocalGame(width, height, mines);
  }

  getDifficultyText(difficulty: string): string {
    if (difficulty.startsWith('custom_')) {
      const parts = difficulty.split('_');
      if (parts.length === 4) {
        return `${this.i18n.t('game.diff_custom')()} (${parts[1]}x${parts[2]}, ${parts[3]})`;
      }
      return this.i18n.t('game.diff_custom')();
    }
    const predefined = this.predefinedDifficulties.find(d => d.id === difficulty || d.id === difficulty.replace('easy', 'beginner').replace('medium', 'intermediate').replace('hard', 'advanced'));
    if (predefined) {
      return `${this.i18n.t(predefined.labelKey as any)()} (${predefined.desc})`;
    }
    return difficulty;
  }

  dismissRoom() {
    this.toastService.confirm({
      title: this.i18n.t('game.dismiss_title')() || 'Dismiss Room',
      message: this.i18n.t('game.dismiss_msg')() || 'Are you sure you want to dismiss this room? All players will be kicked out.',
      confirmText: this.i18n.t('game.dismiss_confirm')() || 'Dismiss',
      cancelText: this.i18n.t('game.cancel')() || 'Cancel',
      onConfirm: () => {
        this.wsService.send({ type: 'dismiss_room' });
        this.toastService.show(this.i18n.t('game.dismiss_success')() || 'Room dismissed successfully', 'success');
      }
    });
  }

  goBack() {
    if (this.currentRoomId()) {
      if (this.store.host() === this.playerId) {
        this.wsService.send({ type: 'dismiss_room' });
      } else {
        this.wsService.send({ type: 'leave_room' });
      }
    }
    this.router.navigate(['/lobby']);
  }

  handleCellClick(x: number, y: number) {
    this.store.revealCell(x, y);
  }

  getPlayerScores() {
    const scores = this.store.scores();
    const players = Object.keys(scores).map(id => ({ id, score: scores[id] }));
    
    // Sort logic: current player first, then others by score (descending)
    return players.sort((a, b) => {
      if (a.id === this.playerId) return -1;
      if (b.id === this.playerId) return 1;
      return b.score - a.score;
    });
  }

  hasWonSpeedMode(): boolean {
    const scores = this.store.scores();
    return scores[this.playerId] > 0;
  }

  getOverlayStatus(): 'win' | 'lose' {
    if (this.currentRoomMode() === 'pk_speed') {
      return this.hasWonSpeedMode() ? 'win' : 'lose';
    }
    return this.isDefeat() ? 'lose' : 'win';
  }

  getOverlayTitle(): string {
    const status = this.getOverlayStatus();
    if (status === 'win') {
      return this.currentRoomMode() === 'pk_speed' ? this.i18n.t('game.you_win')() : this.i18n.t('minesweeper.victory')();
    }
    return this.i18n.t('game.defeat')();
  }

  getOverlaySubtitle(): string {
    if (this.currentRoomMode() === 'pk_speed') {
      return this.hasWonSpeedMode() ? this.i18n.t('game.cleared_first')() : this.i18n.t('game.opponent_finished')();
    }
    if (this.isDefeat()) {
      return this.currentRoomMode() === 'single' ? this.i18n.t('game.stepped_mine')() : this.i18n.t('game.steal_defeat')();
    }
    return this.currentRoomMode() === 'single' ? this.i18n.t('minesweeper.cleared')() : this.i18n.t('game.steal_victory')();
  }
}
