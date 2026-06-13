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
import { SeoService } from '../../core/services/seo.service';
import { AdService } from '../../core/services/ad.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { isBrowser, getOrigin } from '../../core/utils/browser.util';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, GameLobbyPanelComponent, AdsenseComponent, FooterComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
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
  adService = inject(AdService);
  
  games = signal<BackendGameConfig[]>([]);
  activeAnnouncements = signal<Announcement[]>([]);
  isGlobalLobbyOpen = signal(false);
  frontendVersion = versionEnv.version;

  ngOnInit() {
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
    const config = this.gameRegistry.getConfig(id);
    if (!config || !config.modes) return [];
    
    return config.modes.map(mode => {
      const label = mode.labelKey ? this.i18n.t(mode.labelKey)() : mode.id;
      const icon = mode.icon || '🎮';
      return `${icon} ${label}`;
    });
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
    const url = `${getOrigin()}/games/${gameId}`;
    const title = this.getGameTitle(gameId);
    const desc = this.getGameDesc(gameId);
    
    this.shareService.share({
      title: `${title} - Puzzle PK`,
      text: `${this.i18n.t('share.game_invite')() || 'Play this awesome game with me!'} ${title}\n${desc}`,
      url: url
    });
  }
}
