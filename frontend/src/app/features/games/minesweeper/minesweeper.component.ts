import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, Renderer2, inject, effect, signal, computed, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { MinesweeperStore, GameStatus } from './store/minesweeper.store';
import { CellComponent } from './components/cell/cell.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { DragDropModule } from '@angular/cdk/drag-drop';


@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, CellComponent, GameLobbyPanelComponent, GameResultOverlayComponent, GameWaitingRoomComponent, GameRulesModalComponent, DragDropModule],
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
          <div class="flex flex-col mb-4 lg:mb-6 pb-4 border-b relative" style="border-color: var(--color-border-card)">
            <div class="flex items-center justify-between w-full">
              <!-- Left: Title & Mode -->
              <div class="flex items-center space-x-2 lg:space-x-4 flex-1">
                <button (click)="goBack()" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm lg:text-base mr-2 z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                  </svg>
                  <span class="hidden sm:inline">{{ i18n.t('game.back')() || 'Back' }}</span>
                </button>
                <h1 class="text-lg lg:text-2xl font-extrabold tracking-tight flex items-center whitespace-nowrap z-10">
                  <span class="bg-clip-text text-transparent" style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                    {{ i18n.t('app.title')() }}
                  </span>
                  <span class="text-[10px] lg:text-sm ml-2 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg text-[var(--color-text-main)] font-semibold shadow-sm tracking-normal">
                    {{ currentRoomMode() === 'pk_steal' ? i18n.t('game.pk_steal_label')() : (currentRoomMode() === 'pk_speed' ? i18n.t('game.pk_speed_label')() : i18n.t('game.single_label')()) }}
                  </span>
                </h1>
                <button (click)="showRules.set(true)" class="opacity-70 hover:opacity-100 hover:text-[var(--color-accent-to)] transition-colors p-1 rounded-full hover:bg-[var(--color-bg-card)] z-10" [title]="i18n.t('game.rules.tooltip')()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              
              <!-- Center: PK Scoreboard OR Single Player Difficulty -->
              <div class="flex justify-center gap-2 lg:gap-4 flex-1 items-center z-10">
                @if (currentRoomMode() === 'single') {
                  <div class="flex rounded-xl p-0.5 sm:p-1 shadow-inner">
                    <button (click)="openDifficultySettings('single')" 
                            class="px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg border border-[var(--color-border-card)] text-xs sm:text-sm font-bold bg-[var(--color-bg-card)] hover:bg-[var(--color-accent-to)] hover:text-[var(--color-bg-main)] transition-colors flex items-center gap-1 sm:gap-2 shadow-sm shrink-0">
                      <span class="truncate max-w-[60px] sm:max-w-none">{{ getDifficultyText(currentDifficulty()) }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                } @else if (currentRoomMode() === 'pk_speed' && store.speedOpponents().length > 0) {
                  <div class="flex flex-wrap items-center gap-2 lg:gap-4 justify-center flex-1">
                    @for (opp of store.speedOpponents(); track opp.id) {
                      <div class="flex items-center gap-1 lg:gap-2 bg-[var(--color-bg-main)] px-2 lg:px-3 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] shadow-inner">
                        <span class="text-[8px] lg:text-xs opacity-70 font-bold max-w-[50px] truncate" [title]="opp.id">
                          {{ opp.id === store.host() ? '👑 ' : '' }}{{ opp.id }}
                        </span>
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
                      <span class="text-[8px] lg:text-xs font-bold opacity-70 max-w-[80px] truncate" [title]="player.id">
                        {{ player.id === store.host() ? '👑 ' : '' }}{{ player.id }}
                      </span>
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
              <div class="flex space-x-2 lg:space-x-6 flex-1 justify-end items-center z-10">

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
                  <button (click)="returnToLobby()" class="px-2 lg:px-4 py-1 lg:py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-bold transition-colors flex items-center gap-1 lg:gap-2 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span class="hidden sm:inline">{{ i18n.t('game.leave')() }}</span>
                  </button>
                }
                
                @if (store.status() !== 'waiting'){
                  <button (click)="isMobileSidebarOpen.set(true)" class="p-1.5 md:p-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-lg text-[var(--color-accent-to)] shadow-sm active:scale-95 transition-all z-10 hover:bg-[var(--color-bg-card)]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                }
                
              </div>
            </div>

            <!-- Global Progress Bar -->
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-border-card)] group cursor-help translate-y-[2px]">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                   [style.width.%]="store.myProgress()">
              </div>
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-[10px] font-bold text-[var(--color-text-main)] bg-[var(--color-bg-card)] border border-[var(--color-border-card)] backdrop-blur-sm px-2 rounded-full absolute bottom-2 whitespace-nowrap shadow-md z-20">
                  {{ store.myRevealedCnt() }} / {{ store.totalSafeCells() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Game Board (Grid) Wrapper -->
          <div class="relative flex-grow flex flex-col min-h-0 rounded-2xl overflow-hidden border border-[var(--color-border-card)]"
               [class.animate-gold-pulse]="store.status() === 'finished' && !isDefeat()"
               [class.animate-red-pulse]="store.status() === 'finished' && isDefeat()">
            
            <!-- Waiting Overlay -->
            @if (store.status() === 'waiting' && currentRoomMode() !== 'single') {
              <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-main)]">
                <app-game-waiting-room
                  class="w-full h-full flex"
                  [gameId]="'minesweeper'"
                  [mode]="currentRoomMode()"
                  [roomId]="currentRoomId()"
                  [players]="getPlayerScores()"
                  [hostId]="store.host()"
                  [currentUserId]="playerId"
                  (leave)="returnToLobby()"
                  (start)="store.startGame()"
                  (changeSettings)="openChangeSettings()"
                ></app-game-waiting-room>
              </div>
            }

            <div #boardContainer class="p-4 bg-[var(--color-bg-card)] shadow-inner flex-grow overflow-hidden flex justify-center items-center">
            
              <div cdkDrag class="cursor-grab active:cursor-grabbing will-change-transform relative z-10"
                   [class.pointer-events-none]="isFrozen() || store.status() === GameStatus.Starting">
            

            
            <!-- Starting Overlay -->
            @if (store.status() === GameStatus.Starting) {
              <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-overlay)] backdrop-blur-md rounded-2xl">
                <h2 class="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-pulse">
                  {{ gameTimer.countdownDisplay() }}
                </h2>
                <p class="text-white mt-4 font-bold tracking-[0.3em] uppercase opacity-70">{{ i18n.t('game.get_ready')() }}</p>
              </div>
            }

            @if (store.status() === 'finished') {
              <app-game-result-overlay
                [status]="getOverlayStatus()"
                [title]="getOverlayTitle()"
                [subtitle]="getOverlaySubtitle()"
                [stats]="getOverlayStats()"
                [showRestart]="currentRoomMode() === 'single' || store.host() === playerId"
                [showDismiss]="currentRoomMode() !== 'single' && store.host() === playerId"
                [showLeave]="currentRoomMode() === 'single' || store.host() !== playerId"
                (leave)="goBack()"
                (restart)="store.restartGame()"
                (dismiss)="dismissRoom()">
              </app-game-result-overlay>
            }

            <!-- Frozen Overlay (PK Steal Penalty) -->
            @if (isFrozen()) {
              <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/20 backdrop-blur-sm rounded-2xl pointer-events-none">
                  <div class="font-mono text-lg md:text-xl font-bold text-[var(--color-accent-to)] font-digital tracking-widest bg-[var(--color-bg-card)] border border-[var(--color-border-card)] px-3 py-1 rounded-md shadow-inner">
                    {{ gameTimer.formatTime(frozenRemaining()) }}
                  </div>
                <p class="text-red-300 font-bold text-sm mt-2">{{ i18n.t('game.frozen_msg')() }}</p>
              </div>
            }



            @if (store.status() !== 'waiting' || currentRoomMode() === 'single') {
              <div #board class="inline-flex flex-col gap-1 relative z-0 m-auto will-change-transform origin-center transition-transform duration-75"
                   [class.opacity-50]="isFrozen()" 
                   [class.animate-board-shake]="store.status() === 'finished'">
                @for (row of store.board(); track $index) {
                  <div class="flex gap-1">
                    @for (cell of row; track cell.x + '-' + cell.y) {
                      <app-cell 
                        [cell]="cell"
                        (reveal)="handleCellReveal(cell)"
                        (flag)="handleCellFlag(cell)"
                      ></app-cell>
                    }
                  </div>
                }
              </div>
            }
              </div>
          </div>
          </div>
          <!-- Rules Modal -->
          <app-game-rules-modal [gameId]="'minesweeper'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>
        </div>
      </div>

      <!-- Mobile Sidebar Overlay Backdrop -->
      @if (isMobileSidebarOpen()) {
        <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden" (click)="isMobileSidebarOpen.set(false)"></div>
      }

      <div class="flex-shrink-0 transition-transform duration-300"
           [ngClass]="{
             'fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4 flex flex-col': true,
             'translate-x-0': isMobileSidebarOpen(),
             'translate-x-full': !isMobileSidebarOpen(),
             'lg:relative lg:inset-auto lg:w-80 lg:shadow-none lg:p-0 lg:z-auto lg:translate-x-0': currentRoomId() === ''
           }">
           
           <div class="flex justify-between items-center mb-4" [class.lg:hidden]="currentRoomId() === '' || currentRoomId() === 'local'">
             <h3 class="font-bold text-lg text-[var(--color-text-main)]">{{ i18n.t('game.room_info')() || 'Room Info' }}</h3>
           </div>
        <app-game-lobby-panel
          #lobbyPanel
          [currentGameId]="'minesweeper'"
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
        <div class="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm" (click)="isDifficultyModalOpen.set(false)"></div>
        
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
export class MinesweeperComponent extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(MinesweeperStore);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  audioService = inject(AudioService);
  toastService = inject(ToastService);
  GameStatus = GameStatus;
  router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  private roomLifecycle!: RoomLifecycleHandle;

  showRules = signal(false);
  get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }
  currentRoomMode = signal<string>('single');
  currentRoomId = signal<string>('');
  currentDifficulty = signal<string>('intermediate');
  isDifficultyModalOpen = signal(false);
  editingDifficultyFor = signal<'single' | 'room'>('single');
  selectedDifficulty = signal<string>('intermediate');
  customWidth = signal(9);
  customHeight = signal(9);
  customMines = signal(10);
  frozenRemaining = signal(0);
  
  get predefinedDifficulties() {
    return this.gameRegistry.getConfig('minesweeper')?.difficulties || [];
  }

  hasLostSingleMode = computed(() => this.currentRoomMode() === 'single' && this.store.board().some(row => row.some(c => c.state === 3)));

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

  @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  @ViewChild('board') board!: ElementRef<HTMLDivElement>;
  private ngZone = inject(NgZone);
  private renderer = inject(Renderer2);

  constructor() {
    super();

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
    });

    effect(() => {
      const status = this.store.status();
      const mode = this.currentRoomMode();

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

    effect((onCleanup) => {
      const cooldowns = this.store.cooldowns();
      const until = cooldowns[this.playerId] || 0;
      const now = Date.now();
      let interval: any;
      if (until > now) {
        this.frozenRemaining.set(Math.ceil((until - now) / 1000));
        interval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(interval);
            this.frozenRemaining.set(0);
          } else {
            this.frozenRemaining.set(rem);
          }
        }, 200);
      } else {
        this.frozenRemaining.set(0);
      }

      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'minesweeper',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => this.returnToLobby(),
    });
  }

  isFrozen = computed(() => this.frozenRemaining() > 0);

  elapsedTime = signal<string>('00:00');
  private elapsedInterval: any;

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host);
    } else {
      const savedDiff = localStorage.getItem('minesweeper_single_diff') || 'intermediate';
      this.changeSingleDifficulty(savedDiff);
    }
  }

  override ngOnDestroy() {
    this.wsService.disconnect('minesweeper');
    this.gameTimer.stopCountdown();
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string }) {
    if (this.currentRoomId() === event.roomId) return;
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string }) {
    this.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomId.set(roomId);
    this.isMobileSidebarOpen.set(false);
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinGame(roomId, this.playerId, mode, difficulty, hostId);
  }

  returnToLobby() {
    this.currentRoomId.set('');
    this.store.leaveGame();
    this.roomLifecycle.clearReconnectInfo();
    setTimeout(() => this.changeSingleDifficulty('intermediate'), 100);
  }

  dismissRoom() {
    this.toastService.confirm({
      title: this.i18n.t('game.dismiss_title')(),
      message: this.i18n.t('game.dismiss_msg')(),
      confirmText: this.i18n.t('game.dismiss_confirm')(),
      cancelText: this.i18n.t('game.cancel')(),
      onConfirm: () => {
        this.store.dismissRoom();
        this.toastService.show(this.i18n.t('game.dismiss_success')(), 'success');
      }
    });
  }

  goBack() {
    if (this.currentRoomId()) {
      this.wsService.send({ type: this.store.host() === this.playerId ? 'dismiss_room' : 'leave_room' });
    }
    this.router.navigate(['/lobby']);
  }

  handleCellReveal(cell: any) { this.store.revealCell(cell.x, cell.y); }
  handleCellFlag(cell: any) { this.store.toggleFlag(cell.x, cell.y); }

  openDifficultySettings(forMode: 'single' | 'room') {
    this.editingDifficultyFor.set(forMode);
    this.isDifficultyModalOpen.set(true);
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'minesweeper',
        mode: this.currentRoomMode(),
        difficulty: this.currentDifficulty(),
        host: this.store.host()
      });
    }
  }

  applyDifficultySettings() {
    let diff = this.selectedDifficulty();
    if (diff === 'custom') diff = `custom_${this.customWidth()}_${this.customHeight()}_${this.customMines()}`;
    if (this.editingDifficultyFor() === 'single') this.changeSingleDifficulty(diff);
    this.isDifficultyModalOpen.set(false);
  }

  updateCustomMines() {
    const maxMines = this.customWidth() * this.customHeight() - 1;
    if (this.customMines() > maxMines) this.customMines.set(maxMines);
  }

  changeSingleDifficulty(diff: string) {
    this.currentDifficulty.set(diff);
    localStorage.setItem('minesweeper_single_diff', diff);
    this.currentRoomMode.set('single');
    let width = 16, height = 16, mines = 40;
    if (diff.startsWith('custom_')) {
      const parts = diff.split('_');
      width = parseInt(parts[1], 10); height = parseInt(parts[2], 10); mines = parseInt(parts[3], 10);
    } else {
      switch (diff) {
        case 'beginner': width = 9; height = 9; mines = 10; break;
        case 'intermediate': width = 16; height = 16; mines = 40; break;
        case 'advanced': width = 30; height = 16; mines = 99; break;
        case 'hard_mode': width = 30; height = 18; mines = 130; break;
        case 'professional': width = 30; height = 20; mines = 160; break;
        case 'master': width = 30; height = 22; mines = 190; break;
        case 'expert': width = 30; height = 24; mines = 230; break;
      }
    }
    this.store.startLocalGame(width, height, mines);
  }

  getDifficultyText(difficulty: string): string {
    const d = this.predefinedDifficulties.find((x: any) => x.id === difficulty);
    return d ? `${this.i18n.t(d.labelKey as any)()} (${d.desc})` : difficulty;
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

  getOverlayStats() {
    const stats: { label: string, value: string | number }[] = [];

    // Time spent is relevant for single and speed mode
    if (this.currentRoomMode() !== 'pk_steal') {
      let timeStr = this.elapsedTime();
      if (this.currentRoomMode() === 'single') {
        const start = this.store.startAt();
        if (start > 0) {
          const diffMs = Date.now() - start;
          const totalSec = Math.max(0, Math.floor(diffMs / 1000));
          const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
          const s = (totalSec % 60).toString().padStart(2, '0');
          timeStr = `${m}:${s}`;
        }
      }
      if (timeStr && timeStr !== '00:00') {
        stats.push({ label: 'TIME', value: timeStr });
      }
    }

    // Score (flags) is relevant for steal mode
    if (this.currentRoomMode() === 'pk_steal') {
      const scores = this.store.scores();
      const myScore = scores[this.playerId] || 0;
      stats.push({ label: 'SCORE', value: myScore });
    }

    return stats;
  }
}
