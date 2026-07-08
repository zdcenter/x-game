import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { GameHeaderComponent } from '../game-header/game-header.component';
import { GameLobbyPanelComponent } from '../game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../game-rules-modal/game-rules-modal.component';
import { ViewChild } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-game-layout',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, GameLobbyPanelComponent, GameRulesModalComponent],
  template: `
<div class="flex min-h-[calc(100dvh-64px)] lg:h-[calc(100dvh-64px)] w-full flex-col relative text-[var(--color-text-main)] select-none bg-[var(--color-bg-base)]">
  <!-- Rules Modal -->
  <app-game-rules-modal [gameId]="gameId" [isOpen]="showRules" (closed)="rulesClosed.emit()"></app-game-rules-modal>

  <!-- Top Full-Width Game Header -->
  <div class="w-full max-w-[1600px] mx-auto pt-2 lg:pt-4 px-2 lg:px-6 z-40 sticky top-0 pb-2">
    <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden" style="background-color: var(--color-bg-card);">
      <app-game-header (titleClick)="titleClick.emit()"
        [title]="title"
        [subtitle]="subtitle"
        [iconGradientClass]="iconGradientClass"
        [titleGradientClass]="titleGradientClass"
        [shadowClass]="shadowClass"
        [headerBgClass]="headerBgClass"
        (back)="back.emit()"
        (rules)="rulesOpen.emit()"
      >
        <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">{{ icon }}</div>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
            @if (showPlayAgainBtn) {
              <button (click)="playAgain.emit()" class="px-2 lg:px-4 py-1 lg:py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/50 rounded-lg lg:rounded-xl text-xs lg:text-sm font-bold transition-colors flex items-center gap-1 lg:gap-2 shadow-inner active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.play_again')() }}</span>
              </button>
            }

            @if (showLeaveBtn) {
              <button (click)="back.emit()" class="px-2 lg:px-4 py-1 lg:py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg lg:rounded-xl text-xs lg:text-sm font-bold transition-colors flex items-center gap-1 lg:gap-2 shadow-inner active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.leave')() }}</span>
              </button>
            }
            @if (settingsService.settings().multiplayer_enabled === 'true') {
              <button (click)="navigateToPk.emit()" class="px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:text-amber-500 hover:border-amber-500/50 hover:bg-[var(--color-bg-card)] transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group text-xs lg:text-sm font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5 text-amber-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.pk_arena')() }}</span>
              </button>
            }
          </div>
        </ng-container>
      </app-game-header>
    </div>
  </div>

  <div class="flex-grow min-h-0 w-full flex flex-col lg:flex-row p-1 sm:p-2 lg:p-4 lg:px-6 gap-2 sm:gap-4 lg:gap-8 justify-center lg:items-stretch max-w-[1600px] mx-auto transition-colors duration-300">
    
    <!-- LEFT: SEO Description (Desktop only) -->
    <div class="hidden xl:flex w-[320px] xl:w-[400px] flex-shrink-0 flex-col gap-4 justify-start pt-2 z-10 overflow-y-auto custom-scrollbar min-h-0 pr-2">
      <div class="markdown-body text-[var(--color-text-secondary)] text-sm leading-relaxed text-left" 
           [innerHTML]="i18n.t(computedSeoDescKey)()">
      </div>
    </div>

    <!-- CENTER: Game Arena -->
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-0 max-w-[800px] w-full self-center lg:self-stretch z-10 animate-fade-in">
      <div class="w-full flex-grow flex flex-col backdrop-blur-xl border rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 overflow-hidden"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <!-- Project custom content into center area -->
        <ng-content></ng-content>
      </div>
    </div>

    <!-- RIGHT: Right Column / Multiplayer Sidebar -->
    <div class="w-[320px] xl:w-[400px] flex-shrink-0 hidden lg:flex flex-col gap-4">
      @if (settingsService.settings().multiplayer_enabled === 'true') {
        <app-game-lobby-panel
          #lobbyPanel
          class="flex-grow flex"
          [currentGameId]="gameId"
          [currentRoomId]="currentRoomId!"
          (joinRoom)="joinRoom.emit($event)"
          (createRoom)="createRoom.emit($event)">
        </app-game-lobby-panel>
      }
    </div>
  </div>

  <!-- BOTTOM: Mobile SEO Section -->
  <div class="lg:hidden w-full max-w-[800px] mt-4 pb-8 mx-auto px-4">
    <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4 sm:p-6 shadow-sm">
      <div class="markdown-body text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed" 
           [innerHTML]="i18n.t(computedSeoDescKey)()">
      </div>
    </div>
  </div>

  <!-- Mobile Sidebar Overlay Backdrop -->
  @if (showMobileSidebar) {
    <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden" (click)="mobileSidebarClosed.emit()"></div>
    <div class="fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4 flex flex-col transition-transform duration-300">
       <div class="flex justify-between items-center mb-4 lg:hidden" >
         <h3 class="font-bold text-lg text-[var(--color-text-main)]">{{ i18n.t('game.room_info')() }}</h3>
       </div>
       <app-game-lobby-panel
          [currentGameId]="gameId"
          [currentRoomId]="currentRoomId!"
          (joinRoom)="joinRoom.emit($event)"
          (createRoom)="createRoom.emit($event)">
       </app-game-lobby-panel>
    </div>
  }
</div>
  `
})
export class GameLayoutComponent {
  settingsService = inject(SettingsService);
  i18n = inject(I18nService);

  @Input({ required: true }) gameId!: string;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = '';
  @Input() iconGradientClass: string = '';
  @Input() titleGradientClass: string = '';
  @Input() shadowClass: string = '';
  @Input() headerBgClass: string = '';
  
  @Input() currentRoomMode: string = GameMode.Single;
  @Input() currentRoomId: string | null = null;
  @Input() status: string = GameStatus.Waiting;
  
  @Input() showRules: boolean = false;
  @Input() showMobileSidebar: boolean = false;
  
  @Input() seoDescKey?: string;

  @Input() showPlayAgainBtn: boolean = false;
  @Input() showLeaveBtn: boolean = false;

  @Output() rulesClosed = new EventEmitter<void>();
  @Output() rulesOpen = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() playAgain = new EventEmitter<void>();
  @Output() navigateToPk = new EventEmitter<void>();
  @Output() joinRoom = new EventEmitter<any>();
  @Output() createRoom = new EventEmitter<any>();
  @Output() mobileSidebarClosed = new EventEmitter<void>();

  GameMode = GameMode;
  GameStatus = GameStatus;

  get computedSeoDescKey() {
    return this.seoDescKey || `game.${this.gameId}.seo_desc`;
  }

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  openUpdateRoomModal(data: any) {
    if (this.lobbyPanel) {
      this.lobbyPanel.openUpdateRoomModal(data);
    }
  }
}
