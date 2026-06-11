import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameService, GameConfig as BackendGameConfig, getLocalizedField } from '../../core/services/game.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthStore } from '../../core/auth/auth.store';
import { CrossGameJoinService } from '../../core/services/cross-game-join.service';
import { GameConfig as RegistryGameConfig, GameRegistryService } from '../../core/services/game-registry.service';
import { GameLobbyPanelComponent } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { HttpClient } from '@angular/common/http';
import { environment as versionEnv } from '../../../environments/version';
import { environment as appEnvironment } from '../../../environments/environment';
import { SettingsService } from '../../core/services/settings.service';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';
import { ShareService } from '../../core/services/share.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, GameLobbyPanelComponent, AdsenseComponent],
  template: `
    <div class="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)]">
      
      <!-- LEFT: Main Games Content -->
      <div class="flex-grow flex flex-col items-center p-4 lg:p-8 relative">
        
        <!-- Global Announcement Marquee -->
        @if (activeAnnouncements().length > 0) {
          <div class="w-full max-w-[1600px] mb-2 bg-[var(--color-bg-card)] border border-blue-500/30 rounded-xl p-3 flex items-center shadow-[0_0_15px_rgba(59,130,246,0.1)] z-10 relative overflow-hidden">
            <span class="mr-3 text-xl shrink-0 animate-pulse z-20 bg-[var(--color-bg-card)] pr-2">📣</span>
            <div class="marquee-container w-full overflow-hidden whitespace-nowrap relative">
              <div class="animate-marquee inline-block text-sm font-bold text-blue-400">
                @for (ann of activeAnnouncements(); track ann.id) {
                  <span class="mx-8">✨ {{ ann.content }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- Lobby Top Banner Ad (Visible on all devices) -->
        @if (settingsService.settings().ad_mobile_lobby_slot) {
          <div class="w-full max-w-[1600px] mb-4">
            <app-adsense
              [adSlot]="settingsService.settings().ad_mobile_lobby_slot"
              adFormat="horizontal"
              [fullWidthResponsive]="true"
              class="w-full min-h-[100px] rounded-xl overflow-hidden flex justify-center items-center">
            </app-adsense>
          </div>
        }

        <!-- Welcome Header -->
        <div class="flex flex-col items-center justify-center w-full mb-8 lg:mb-16 mt-2 lg:mt-4 relative max-w-[1600px]">
          
          <!-- Mobile Title & Toggle Lobby Button -->
          <div class="flex items-center justify-between w-full lg:hidden px-2 mb-4">
            <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent"
                style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              <ng-container i18n="@@lobby.title">lobby.title</ng-container>
            </h1>
            @if (settingsService.settings().multiplayer_enabled === 'true') {
              <button (click)="isGlobalLobbyOpen.set(true)" class="p-2 sm:p-3 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl text-emerald-400 shadow-sm active:scale-95 transition-all hover:bg-[var(--color-bg-main)] z-10 flex shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            }
          </div>

          <!-- Desktop Title -->
          <div class="hidden lg:block text-center">
            <h1 class="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent"
                style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              <ng-container i18n="@@lobby.title">lobby.title</ng-container>
            </h1>
          </div>
          
          <p class="text-sm sm:text-lg opacity-80 max-w-2xl mx-auto text-center px-4">
            <ng-container i18n="@@lobby.subtitle">lobby.subtitle</ng-container>
          </p>
        </div>

        <!-- Games Grid -->
        <div class="grid gap-6 lg:gap-8 max-w-[1600px] w-full pb-10" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
        @for (game of games(); track game.id) {
          <!-- Dynamic Game Card -->
          <a [routerLink]="['/games', game.id]" class="group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
            <!-- Card Image Banner (Padding Hack for Aspect Ratio) -->
            <div class="w-full relative shrink-0 overflow-hidden bg-[var(--color-bg-main)] border-b border-[var(--color-border-card)]"
                 style="padding-top: 100%;">
              <!-- Subtle accent gradient overlay -->
              <div class="absolute inset-0 opacity-[0.15]"
                   style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))"></div>
              <!-- Game SVG Icon -->
              <div class="absolute inset-0 flex items-center justify-center">
                <img [src]="'/assets/games/icons/' + game.id + '.svg?v=3'"
                     [alt]="getGameTitle(game.id)"
                     class="w-[90%] h-[90%] object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)] group-hover:scale-110 transition-all duration-500"
                     (error)="handleIconError($event, game.id)" />
              </div>
            </div>
            <!-- Card Content -->
            <div class="p-6 relative">
              <h2 class="text-2xl font-bold mb-2 pr-16">{{ getGameTitle(game.id) }}</h2>
              <div class="absolute top-6 right-6 flex items-center gap-2">
                <div class="flex items-center gap-1 text-[var(--color-text-muted)] text-sm bg-[var(--color-bg-main)] px-2 py-1 rounded-full border border-[var(--color-border-card)] shadow-sm">
                  <span class="text-xs">🔥</span>
                  <span class="font-bold">{{ game.visitCount || 0 }}</span>
                </div>
                <button (click)="shareGame($event, game.id)" 
                        class="p-1.5 bg-[var(--color-bg-main)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-full text-[var(--color-text-muted)] hover:text-blue-400 shadow-sm transition-all hover:scale-110"
                        title="Share this game">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
              <p class="opacity-70 text-sm line-clamp-2">
                {{ getGameDesc(game.id) }}
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="px-2 py-1 text-xs font-semibold rounded bg-[var(--color-bg-main)] shadow-sm border border-[var(--color-border-card)] text-emerald-500"><ng-container i18n="@@lobby.ready">lobby.ready</ng-container></span>
                @for (mode of getGameModes(game.id); track mode) {
                  <span class="px-2 py-1 text-xs font-semibold rounded bg-[var(--color-bg-main)] shadow-sm border border-[var(--color-border-card)] text-[var(--color-accent-from)]">{{ mode }}</span>
                }
              </div>
            </div>
          </a>
        }
        </div>

        <!-- Copyright & Version Footer -->
        <div class="w-full mt-auto pt-16 pb-8 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-sm opacity-60">
          <p>© 2026 Puzzle PK. All rights reserved.</p>
          <div class="flex items-center gap-4 mt-2 font-mono text-xs">
            <span>Frontend: {{ frontendVersion }}</span>
            <span class="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
            <span>Backend: {{ backendVersion() }}</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Global Arena Lobby (Sidebar on Desktop, Drawer on Mobile) -->
      @if (isGlobalLobbyOpen()) {
        <!-- Overlay Background for Mobile -->
        <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden transition-opacity"
             (click)="isGlobalLobbyOpen.set(false)"></div>
      }

      <!-- Sidebar Container -->
      @if (settingsService.settings().multiplayer_enabled === 'true') {
        <div class="fixed lg:sticky top-[64px] lg:top-0 right-0 h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] w-[300px] sm:w-[350px] lg:w-[350px] xl:w-[400px] z-50 lg:z-10 transition-transform duration-300 ease-in-out shrink-0 flex flex-col p-0 lg:p-4 bg-[var(--color-bg-main)] lg:bg-transparent border-l border-[var(--color-border-card)] lg:border-none"
             [class.translate-x-0]="isGlobalLobbyOpen()"
             [class.translate-x-full]="!isGlobalLobbyOpen()"
             [class.lg:translate-x-0]="true">

          <app-game-lobby-panel
            class="flex-grow flex w-full h-full min-h-0 lg:bg-transparent"
            [isGlobal]="true"
            (createRoom)="handleGlobalCreateRoom($event)">
          </app-game-lobby-panel>
        </div>
      }

    </div>
  `
})
export class LobbyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  gameService = inject(GameService);
  private wsService = inject(WebSocketService);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  private http = inject(HttpClient);
  router = inject(Router);
  settingsService = inject(SettingsService);
  announcementService = inject(AnnouncementService);
  shareService = inject(ShareService);
  
  games = signal<BackendGameConfig[]>([]);
  activeAnnouncements = signal<Announcement[]>([]);
  isGlobalLobbyOpen = signal(false);
  frontendVersion = versionEnv.version;
  backendVersion = signal('loading...');

  ngOnInit() {
    this.http.get<{version: string}>(`${appEnvironment.apiUrl}/version`).subscribe({
      next: (res) => this.backendVersion.set(res.version),
      error: () => this.backendVersion.set('unknown')
    });

    // Fetch active games
    this.gameService.getGames().subscribe(games => {
      this.games.set(games);
    });

    // Fetch active announcements
    this.announcementService.getActiveAnnouncements().subscribe(anns => {
      this.activeAnnouncements.set(anns);
    });

    const player = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.wsService.connectLobby(player, player);
  }

  ngOnDestroy() {
    this.wsService.disconnectLobby();
  }

  handleGlobalCreateRoom(event: {name: string, gameId: string, mode: string, difficulty: string}) {
    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.crossGameJoin.setPendingJoin({
      game: event.gameId,
      roomId: event.name,
      mode: event.mode,
      difficulty: event.difficulty,
      host: playerId,
      action: 'create'
    });
    this.router.navigate([`/games/${event.gameId}`]);
  }

  getGameEmoji(id: string): string {
    switch (id) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      case 'hexa': return '🔶';
      case 'gomoku': return '⚫⚪';
      case 'codebreaker': return '🔐';
      case 'drop2048': return '🧊';
      case 'block': return '🟩';
      default: return '🎮';
    }
  }

  getGameModes(id: string): string[] {
    const isZh = this.i18n.currentLang() === 'zh';
    switch (id) {
      case 'minesweeper': return isZh ? ['⚡ 同盘抢雷', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sudoku': return isZh ? ['⚡ 同盘填数', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sliding': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'hexa': return isZh ? ['⏱️ 异盘竞分'] : ['⏱️ PK Score'];
      case 'gomoku': return isZh ? ['⚔️ 经典对战'] : ['⚔️ PK Classic'];
      case 'math24': return isZh ? ['⚡ 同盘抢分', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'codebreaker': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'drop2048': return isZh ? ['⏱️ 积分赛'] : ['⏱️ PK Score'];
      case 'block': return isZh ? ['⚔️ 积分乱斗'] : ['⚔️ PK Score'];
      default: return [];
    }
  }

  gameRegistry = inject(GameRegistryService);

  getGameTitle(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config && config.titleKey) return this.i18n.t(config.titleKey)();
    return this.i18n.t('app.title')();
  }

  getGameDesc(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config && config.titleKey) return this.i18n.t(config.titleKey + '.desc')();
    return '';
  }

  handleIconError(event: Event, gameId: string) {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent && !parent.querySelector('.fallback-emoji')) {
      const span = document.createElement('span');
      span.className = 'text-6xl fallback-emoji drop-shadow-2xl hover:scale-110 transition-transform duration-500';
      span.textContent = this.getGameEmoji(gameId);
      parent.appendChild(span);
    }
  }

  shareGame(event: Event, gameId: string) {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/games/${gameId}`;
    const title = this.getGameTitle(gameId);
    const desc = this.getGameDesc(gameId);
    
    this.shareService.share({
      title: `${title} - Puzzle PK`,
      text: `${this.i18n.t('share.game_invite')() || 'Play this awesome game with me!'} ${title}\n${desc}`,
      url: url
    });
  }
}

