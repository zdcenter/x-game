import { Component, OnInit, OnDestroy, inject, effect, signal, computed, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MinesweeperStore, GameStatus } from './store/minesweeper.store';
import { CellComponent } from './components/cell/cell.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameService, getLocalizedField } from '../../../core/services/game.service';
import { marked } from 'marked';

import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, CellComponent, DragDropModule],
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
              } @else if (currentRoomMode() === 'pk_speed' && store.opponentProgress() !== null) {
                <div class="flex items-center gap-1 lg:gap-3 bg-[var(--color-bg-main)] px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] shadow-inner">
                  <span class="text-[8px] lg:text-xs opacity-70 font-bold uppercase tracking-wider hidden sm:inline">{{ i18n.t('game.opponent')() }}</span>
                  <div class="w-12 lg:w-32 h-1.5 lg:h-2.5 bg-[var(--color-bg-card)] rounded-full overflow-hidden border border-[var(--color-border-card)]">
                    <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] transition-all duration-300" [style.width]="store.opponentProgress() + '%'"></div>
                  </div>
                  <span class="text-[8px] lg:text-xs font-mono font-bold text-[var(--color-accent-to)]">{{ store.opponentProgress() | number:'1.0-0' }}%</span>
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
               [class.animate-gold-pulse]="store.status() === 'finished'">
            
            <!-- Waiting Overlay -->
            @if (store.status() === 'waiting' && currentRoomMode() !== 'single') {
              <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-overlay)] backdrop-blur-sm rounded-2xl text-[var(--color-text-main)]">
                @if (getPlayerScores().length < 2) {
                  <div class="w-12 h-12 border-4 border-slate-600 border-t-[var(--color-accent-to)] rounded-full animate-spin mb-4"></div>
                  <h2 class="text-2xl font-bold tracking-widest uppercase">Waiting for Challenger...</h2>
                } @else {
                  @if (store.host() === playerId) {
                    <h2 class="text-3xl font-black mb-6 uppercase">{{ i18n.t('game.ready')() }}</h2>
                    <button (click)="store.startGame()" class="px-8 py-4 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                      START PK
                    </button>
                  } @else {
                    <div class="w-12 h-12 border-4 border-slate-600 border-t-[var(--color-accent-from)] rounded-full animate-spin mb-4"></div>
                    <h2 class="text-2xl font-bold tracking-widest uppercase">Waiting for Host...</h2>
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
                <p class="text-white mt-4 font-bold tracking-[0.3em] uppercase opacity-70">Get Ready to Steal!</p>
              </div>
            }

            <!-- Victory Overlay -->
            @if (store.status() === 'finished') {
              <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-overlay)] backdrop-blur-sm">
                @if (currentRoomMode() === 'pk_speed') {
                  @if (hasWonSpeedMode()) {
                    <h2 class="text-6xl font-black uppercase tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-bounce">
                      YOU WIN!
                    </h2>
                    <p class="mt-4 text-emerald-300 font-bold text-lg animate-pulse">You cleared the board first!</p>
                  } @else {
                    <h2 class="text-6xl font-black uppercase tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                      DEFEAT!
                    </h2>
                    <p class="mt-4 text-red-300 font-bold text-lg animate-pulse">Opponent finished before you.</p>
                  }
                } @else {
                  @if (hasLostSingleMode()) {
                    <h2 class="text-6xl font-black uppercase tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                      DEFEAT!
                    </h2>
                    <p class="mt-4 text-red-300 font-bold text-lg animate-pulse mb-6">
                      You stepped on a mine.
                    </p>
                  } @else {
                    <h2 class="text-6xl font-black uppercase tracking-widest animate-gold-shine drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
                      {{ i18n.t('minesweeper.victory')() }}
                    </h2>
                    <p class="mt-4 text-yellow-400 font-bold text-lg animate-pulse mb-6">
                      {{ i18n.t('minesweeper.cleared')() }}
                    </p>
                  }
                }
                
                @if (currentRoomMode() === 'single' || store.host() === playerId) {
                  <button (click)="store.restartGame()" class="mt-8 px-8 py-3 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                    {{ i18n.t('game.restart')() }}
                  </button>
                }
              </div>
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
      <div class="w-full lg:w-80 flex-shrink-0 flex flex-col bg-[var(--color-bg-card)] backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.1)] min-h-[400px] lg:min-h-0">
        <!-- Tabs -->
        <div class="flex border-b border-[var(--color-border-card)]">
          <button (click)="activeTab = 'rooms'" [class.bg-[var(--color-bg-main)]]="activeTab === 'rooms'" [class.text-[var(--color-accent-from)]]="activeTab === 'rooms'" [class.opacity-50]="activeTab !== 'rooms'" class="flex-1 py-4 font-bold text-sm hover:opacity-100 transition-all uppercase tracking-widest">
            {{ i18n.t('game.arena_rooms')() }}
          </button>
          <button (click)="activeTab = 'online'" [class.bg-[var(--color-bg-main)]]="activeTab === 'online'" [class.text-[var(--color-accent-from)]]="activeTab === 'online'" [class.opacity-50]="activeTab !== 'online'" class="flex-1 py-4 font-bold text-sm hover:opacity-100 transition-all uppercase tracking-widest relative">
            {{ i18n.t('game.online')() }}
            <span class="absolute top-2 right-4 bg-[var(--color-accent-to)] text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{{ wsService.onlinePlayers().length }}</span>
          </button>
        </div>

        <!-- Rooms Content -->
        @if (activeTab === 'rooms') {
          <div class="p-4 flex-grow overflow-y-auto">
            <button (click)="createRoom()" class="w-full mb-4 py-3 rounded-xl font-bold border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors flex justify-center items-center gap-2">
              <span>➕</span> {{ i18n.t('game.create_pk')() }}
            </button>

            <div class="space-y-6">
              
              <!-- Other Active Rooms -->
              <div>
                <div class="flex items-center justify-between mb-3 px-1">
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ i18n.t('game.active_rooms')() }} ({{ otherRooms().length }})</h3>
                </div>
                <div class="space-y-3">
                  @for (room of otherRooms(); track room.id) {
                    <div class="p-3 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-card)] hover:border-[var(--color-accent-to)] transition-colors">
                      <div class="flex justify-between items-center mb-2">
                        <span class="font-mono text-sm font-bold text-white">{{ room.id }}</span>
                        <span class="text-xs font-bold uppercase px-2 py-0.5 rounded"
                              [class.bg-yellow-500]="room.status === 'playing'" [class.text-black]="room.status === 'playing'"
                              [class.bg-emerald-500]="room.status === 'waiting'" [class.text-black]="room.status === 'waiting'">
                          {{ room.status }}
                        </span>
                      </div>
                      <div class="flex justify-between items-end">
                        <div class="text-[10px] opacity-70 uppercase tracking-wider flex items-center gap-2">
                          <span>{{ i18n.t('game.host')() }}: <span class="text-[var(--color-accent-from)] font-bold">{{ room.host }}</span></span>
                          <span class="w-1 h-1 rounded-full bg-[var(--color-border-card)]"></span>
                          <span>{{ i18n.t('game.mode')() }}: <span class="text-inherit">{{ room.mode === 'pk_steal' ? i18n.t('game.pk_steal')() : i18n.t('game.pk_speed')() }}</span></span>
                          <span class="w-1 h-1 rounded-full bg-[var(--color-border-card)]"></span>
                          <span>{{ i18n.t('game.diff')() }}: <span class="text-yellow-500">{{ getDifficultyText(room.difficulty || 'medium') }}</span></span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-slate-400">{{ room.players }}/2</span>
                          @if (room.status === 'waiting' && room.players < 2) {
                            <button (click)="joinRoom(room.id, room.mode, room.difficulty)" class="px-3 py-1 bg-[var(--color-accent-from)] text-[var(--color-bg-main)] text-xs font-bold rounded shadow hover:opacity-80 transition-opacity">{{ i18n.t('game.join')() }}</button>
                          } @else if (room.status === 'waiting' && room.players >= 2) {
                            <button disabled class="px-3 py-1 bg-[var(--color-bg-card)] opacity-50 text-inherit text-xs font-bold rounded shadow cursor-not-allowed">{{ i18n.t('game.full')() }}</button>
                          } @else {
                            <button (click)="joinRoom(room.id, room.mode, room.difficulty)" class="px-3 py-1 bg-[var(--color-bg-card)] text-inherit text-xs font-bold rounded shadow hover:opacity-80 transition-opacity">{{ i18n.t('game.watch')() }}</button>
                          }
                        </div>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl">
                      {{ i18n.t('game.no_rooms')() }}<br>{{ i18n.t('game.create_one')() }}
                    </div>
                  }
                </div>
              </div>

              <!-- My Rooms -->
              @if (myRooms().length > 0) {
                <div>
                  <div class="flex items-center justify-between mb-3 px-1">
                    <h3 class="text-xs font-black text-emerald-400 uppercase tracking-widest">{{ i18n.t('game.my_room')() }}</h3>
                  </div>
                  <div class="space-y-3">
                    @for (room of myRooms(); track room.id) {
                      <div class="p-3 bg-[var(--color-bg-card)] rounded-xl border-[2px] border-[var(--color-accent-to)] shadow-sm">
                        <div class="flex justify-between items-center mb-2">
                          <span class="font-mono text-sm font-bold text-inherit">{{ room.id }} (Host)</span>
                          <span class="text-xs font-bold uppercase px-2 py-0.5 rounded"
                                [class.bg-yellow-500]="room.status === 'playing'" [class.text-black]="room.status === 'playing'"
                                [class.bg-emerald-500]="room.status === 'waiting'" [class.text-black]="room.status === 'waiting'">
                            {{ room.status }}
                          </span>
                        </div>
                        <div class="flex justify-between items-end">
                          <div class="text-[10px] text-slate-400 uppercase tracking-wider flex flex-col gap-1">
                            <div>{{ i18n.t('game.mode')() }}: <span class="text-white">{{ room.mode === 'pk_steal' ? i18n.t('game.pk_steal')() : i18n.t('game.pk_speed')() }}</span></div>
                            <div>{{ i18n.t('game.diff')() }}: <span class="text-yellow-400">{{ getDifficultyText(room.difficulty || 'medium') }}</span></div>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400">{{ room.players }}/2</span>
                            <button (click)="dismissRoom()" class="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/50 text-xs font-bold rounded shadow hover:bg-red-600 hover:text-white transition-colors ml-2">{{ i18n.t('game.dismiss')() }}</button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Online Content -->
        @if (activeTab === 'online') {
          <div class="p-4 flex-grow overflow-y-auto space-y-2">
            @for (player of otherOnlinePlayers(); track player.id) {
              <div class="flex items-center justify-between p-3 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-card)]">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {{ player.username?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800"
                         [class.bg-emerald-400]="player.status === 'idle'"
                         [class.bg-yellow-400]="player.status === 'playing'"></div>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-inherit leading-none">{{ player.username }}</div>
                    <div class="text-[10px] opacity-70 uppercase mt-1">{{ player.status }}</div>
                  </div>
                </div>
                <button [disabled]="player.status !== 'idle'" class="text-xs font-bold text-indigo-400 px-2 py-1 hover:bg-indigo-500/20 rounded disabled:opacity-30 transition-colors">
                  INVITE
                </button>
              </div>
            }
          </div>
        }
      </div>

    </div>

    <!-- Create Room Modal Overlay -->
    @if (isCreateModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
        <div class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-3xl p-8 w-full max-w-md shadow-2xl transform transition-all text-[var(--color-text-main)]">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">{{ i18n.t('game.create_room_title')() }}</h2>
            <button (click)="isCreateModalOpen.set(false)" class="opacity-50 hover:opacity-100 transition-opacity">
              ✕
            </button>
          </div>
          
          <div class="space-y-6">
            <!-- Room Name -->
            <div>
              <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ i18n.t('game.room_name')() }}</label>
              <input type="text" [value]="newRoomName()" (input)="updateRoomName($event)"
                     class="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors"
                     placeholder="Enter room name">
            </div>

            <!-- PK Mode -->
            <div>
              <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ i18n.t('game.game_mode')() }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button (click)="newRoomMode.set('pk_steal')" 
                        [class.bg-[var(--color-accent-to)]]="newRoomMode() === 'pk_steal'" [class.text-[var(--color-bg-main)]]="newRoomMode() === 'pk_steal'"
                        [class.bg-[var(--color-bg-card)]]="newRoomMode() !== 'pk_steal'" [class.opacity-60]="newRoomMode() !== 'pk_steal'"
                        class="px-4 py-3 rounded-xl border border-[var(--color-border-card)] font-bold text-sm transition-all text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span>⚡</span> <span>{{ i18n.t('game.steal_mode')() }}</span>
                  </div>
                  <div class="text-[10px] font-normal opacity-80 leading-tight">Shared board. Race to flag mines!</div>
                </button>
                <button (click)="newRoomMode.set('pk_speed')" 
                        [class.bg-[var(--color-accent-to)]]="newRoomMode() === 'pk_speed'" [class.text-[var(--color-bg-main)]]="newRoomMode() === 'pk_speed'"
                        [class.bg-[var(--color-bg-card)]]="newRoomMode() !== 'pk_speed'" [class.opacity-60]="newRoomMode() !== 'pk_speed'"
                        class="px-4 py-3 rounded-xl border border-[var(--color-border-card)] font-bold text-sm transition-all text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span>🏎️</span> <span>{{ i18n.t('game.speed_mode')() }}</span>
                  </div>
                  <div class="text-[10px] font-normal opacity-80 leading-tight">Separate boards. First to clear wins!</div>
                </button>
              </div>
            </div>

            <!-- Difficulty -->
            <div>
              <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ i18n.t('game.difficulty_label')() }}</label>
              <button (click)="openDifficultySettings('room')" 
                      class="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl hover:border-[var(--color-accent-to)] transition-colors">
                <span class="font-bold text-sm">{{ getDifficultyText(newRoomDifficulty()) }}</span>
                <span class="text-[var(--color-accent-to)] font-bold text-sm flex items-center gap-1">
                  Change
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </span>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="pt-4 flex gap-3">
              <button (click)="isCreateModalOpen.set(false)" class="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-card)] opacity-80 hover:opacity-100 border border-[var(--color-border-card)] transition-colors">
                {{ i18n.t('game.cancel')() }}
              </button>
              <button (click)="confirmCreateRoom()" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
                {{ i18n.t('game.create')() }} & {{ i18n.t('game.join')() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Difficulty Settings Modal -->
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
  parsedRulesHTML = computed(() => marked.parse(this.gameRules(), { async: false }) as string);

  activeTab: 'rooms' | 'online' = 'rooms';
  playerId = this.authStore.currentUser()?.username || 'Guest';
  currentRoomMode = signal<string>('single');
  currentDifficulty = signal<string>('intermediate');

  // Difficulty Settings Modal State
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

  // Derived UI State
  myRooms = computed(() => this.wsService.activeRooms().filter(r => r.host === this.playerId && r.mode !== 'single'));
  otherRooms = computed(() => this.wsService.activeRooms().filter(r => r.host !== this.playerId && r.mode !== 'single'));
  otherOnlinePlayers = computed(() => this.wsService.onlinePlayers().filter(p => p.id !== this.playerId));
  hasLostSingleMode = computed(() => this.currentRoomMode() === 'single' && this.store.board().some(row => row.some(c => c.state === 3))); // CellState.Exploded is 3

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

    // Watch for unexpected disconnects from PK rooms
    effect(() => {
      const disconnects = this.wsService.unexpectedDisconnectEvent();
      // Only react if disconnects > 0 AND we are currently in a PK room
      // Use untracked so we don't accidentally trigger this when joining a new room
      if (disconnects > 0 && untracked(() => this.currentRoomMode()) !== 'single') {
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
    
    this.countdownInterval = setInterval(() => {
      const remainingMs = this.store.startAt() - Date.now();
      if (remainingMs <= 0) {
        this.countdownDisplay.set('GO!');
        this.audioService.playFlag(); // High pitched GO
        this.stopCountdown();
      } else {
        const seconds = Math.ceil(remainingMs / 1000);
        this.countdownDisplay.set(seconds.toString());
        this.audioService.playClick(); // Tick
      }
    }, 1000); // Check every second roughly
  }

  ngOnInit() {
    // 1. Connect to Lobby
    this.wsService.connectLobby(this.playerId, this.playerId);
    
    // 2. Connect to local single player game by default
    const savedDiff = localStorage.getItem('minesweeper_single_diff') || 'intermediate';
    this.changeSingleDifficulty(savedDiff);
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  createRoom() {
    this.newRoomName.set('PK-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    this.newRoomMode.set(localStorage.getItem('minesweeper_pk_mode') || 'pk_steal');
    this.newRoomDifficulty.set(localStorage.getItem('minesweeper_pk_diff') || 'intermediate');
    this.isCreateModalOpen.set(true);
  }

  updateRoomName(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newRoomName.set(input.value);
  }

  confirmCreateRoom() {
    localStorage.setItem('minesweeper_pk_mode', this.newRoomMode());
    localStorage.setItem('minesweeper_pk_diff', this.newRoomDifficulty());
    this.isCreateModalOpen.set(false);
    this.joinRoom(this.newRoomName(), this.newRoomMode(), this.newRoomDifficulty());
  }

  joinRoom(roomId: string, mode: string, difficulty: string = 'medium') {
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.store.joinGame(roomId, this.playerId, mode, difficulty);
  }

  leaveRoom() {
    // Reset to single player
    this.changeSingleDifficulty('intermediate');
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
      title: 'Dismiss Room',
      message: 'Are you sure you want to dismiss this room? All players will be kicked out.',
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      onConfirm: () => {
        this.wsService.send({ type: 'dismiss_room' });
        this.toastService.show('Room dismissed successfully', 'success');
      }
    });
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
}
