import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameService, GameConfig as BackendGameConfig, getLocalizedField } from '../../core/services/game.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthStore } from '../../core/auth/auth.store';
import { CrossGameJoinService } from '../../core/services/cross-game-join.service';
import { GameConfig as RegistryGameConfig, GameRegistryService } from '../../core/services/game-registry.service';
import { GameMode } from '../../core/models/game.model';
import { GameLobbyPanelComponent } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { HttpClient } from '@angular/common/http';
import { environment as versionEnv } from '../../../environments/version';
import { environment as appEnvironment } from '../../../environments/environment';
import { SettingsService } from '../../core/services/settings.service';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';
// AdsenseComponent import temporarily removed — ad slots are commented out for AdSense review
import { ShareService } from '../../core/services/share.service';
import { SeoService } from '../../core/services/seo.service';
import { AdService } from '../../core/services/ad.service';
import { DailyChallengeBannerComponent } from '../../shared/components/daily-challenge-banner/daily-challenge-banner.component';
import { LiveWaitingRoomsComponent } from './components/live-waiting-rooms/live-waiting-rooms.component';
import { LiveRoomService } from '../../core/services/live-room.service';
import { BlogService, BlogPostMeta } from '../../core/services/blog.service';
import { isBrowser, getOrigin } from '../../core/utils/browser.util';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
const PAGE_SIZE = 8;

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, GameLobbyPanelComponent, DailyChallengeBannerComponent, LiveWaitingRoomsComponent],
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
  gameRegistry = inject(GameRegistryService);
  liveRoom = inject(LiveRoomService);

  // Statically populate all games from frontend SSOT to prevent SSR sorting flicker.
  games = signal<BackendGameConfig[]>(
    GAME_DEFINITIONS.map(def => ({
      id: def.id, name: def.id, overview: '', rules: '', config: '',
      isActive: true, visitCount: 0, createdAt: '', updatedAt: '',
    }))
  );
  
  // Active category filter: 'all' | 'hot' | 'pk' | 'logic' | 'puzzle'
  selectedCategory = signal<'all' | 'hot' | 'pk' | 'logic' | 'puzzle'>('all');
  searchQuery = signal<string>('');

  activeAnnouncements = signal<Announcement[]>([]);
  isGlobalLobbyOpen = signal(false);
  frontendVersion = versionEnv.version;
  
  private blogService = inject(BlogService);
  rawBlogs = signal<BlogPostMeta[]>([]);
  displayBlogs = computed(() => {
    const lang = this.i18n.currentLang();
    return this.rawBlogs().map(post => ({
      id: post.id,
      date: post.date,
      meta: lang === 'zh' ? post.zh : post.en
    }));
  });

  hasMultiplayer(gameId: string): boolean {
    const config = this.gameRegistry.getConfig(gameId);
    if (!config || !config.modes) return false;
    return config.modes.some(m => m.id !== 'single');
  }

  filteredGames = computed(() => {
    let list = [...this.games()];
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    if (cat === 'hot') {
      list.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    } else if (cat === 'pk') {
      list = list.filter(g => this.hasMultiplayer(g.id));
    } else if (cat === 'logic') {
      const logicIds = ['minesweeper', 'sudoku', 'nonogram', 'sliding', 'codebreaker', 'math24', 'connect', 'drop2048', 'classic2048'];
      list = list.filter(g => logicIds.includes(g.id));
    } else if (cat === 'puzzle') {
      const puzzleIds = ['hexa', 'block', 'tetris', 'gomoku', 'sokoban', 'watersort', 'lightsout', 'hashi', 'idiom'];
      list = list.filter(g => puzzleIds.includes(g.id));
    }

    if (q) {
      list = list.filter(g => {
        const title = this.getGameTitle(g.id).toLowerCase();
        const desc = this.getGameDesc(g.id).toLowerCase();
        return title.includes(q) || desc.includes(q) || g.id.toLowerCase().includes(q);
      });
    }

    return list;
  });

  playRandomGame() {
    const all = this.games();
    if (!all.length) return;
    const randomIndex = Math.floor(Math.random() * all.length);
    const targetGame = all[randomIndex];
    this.router.navigate(['/', this.i18n.currentLang(), 'games', targetGame.id]);
  }

  goToPkArena(gameId?: string) {
    const queryParams = gameId ? { game: gameId } : {};
    this.router.navigate(['/', this.i18n.currentLang(), 'pk-arena'], { queryParams });
  }

  playSoloGame(event: Event, gameId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/', this.i18n.currentLang(), 'games', gameId]);
  }

  hasWaitingRoom(gameId: string): boolean {
    const myId = this.liveRoom.currentUserId();
    return this.liveRoom.waitingRooms().some(r => r.game === gameId && r.host !== myId);
  }

  playPkGame(event: Event, gameId: string) {
    event.preventDefault();
    event.stopPropagation();
    const myId = this.liveRoom.currentUserId();
    const waitingRoom = this.liveRoom.waitingRooms().find(r => r.game === gameId && r.host !== myId);
    if (waitingRoom) {
      this.liveRoom.quickJoin(waitingRoom);
    } else {
      this.goToPkArena(gameId);
    }
  }

  ngOnInit() {
    // Load dynamic game stats (visitCounts) and merge without reordering
    this.loadGamesStats();

    // Fetch active announcements
    this.announcementService.getActiveAnnouncements().subscribe(anns => {
      this.activeAnnouncements.set(anns);
    });

    const player = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.wsService.connectLobby(player, player);

    // Fetch latest blogs for AdSense text density and UX
    this.blogService.getBlogPosts().subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.rawBlogs.set(sorted.slice(0, 4));
      },
      error: (err) => console.error('Failed to load recent blogs', err)
    });
  }

  private loadGamesStats() {
    // Use getAllGames to fetch the active list and stats, then merge them by ID.
    // We ignore the backend sort order to maintain the frontend static order.
    this.gameService.getAllGames().subscribe({
      next: res => {
        this.games.update(currentGames => {
          return currentGames.map(cg => {
            const backendData = res.find(bg => bg.id === cg.id);
            if (backendData) {
              return { ...cg, visitCount: backendData.visitCount, isActive: backendData.isActive };
            }
            return cg;
          });
        });
      },
      error: err => {
        console.error('Failed to load game stats:', err);
      }
    });
  }

  ngOnDestroy() {
    // Preserve global lobby connection for navbar beacon and challenge notifications
  }

  handleGlobalCreateRoom(event: {name: string, gameId: string, mode: string, difficulty: string, password?: string, target?: number}) {
    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.crossGameJoin.setPendingJoin({
      game: event.gameId,
      roomId: event.name,
      mode: event.mode,
      difficulty: event.difficulty,
      host: playerId,
      action: 'create',
      password: event.password,
      target: event.target
    });
    this.router.navigate([`/${this.i18n.currentLang()}/games/${event.gameId}`]);
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
      case 'idiom': return '📖';
      default: return '🎮';
    }
  }

  getPkButtonInfo(gameId: string): { icon: string; label: string; gradient: string; shadow: string } {
    if (gameId === 'gomoku') {
      return {
        icon: '♟️',
        label: this.i18n.t('lobby.pk_btn_duel')() || '经典对弈',
        gradient: 'var(--gradient-pk-duel)',
        shadow: 'var(--shadow-pk-duel)'
      };
    }
    if (gameId === 'tetris') {
      return {
        icon: '💥',
        label: this.i18n.t('lobby.pk_btn_battle')() || '攻防对抗',
        gradient: 'var(--gradient-pk-battle)',
        shadow: 'var(--shadow-pk-battle)'
      };
    }
    if (gameId === 'idiom') {
      return {
        icon: '📖',
        label: this.i18n.t('lobby.pk_btn_word')() || '接龙对决',
        gradient: 'var(--gradient-pk-word)',
        shadow: 'var(--shadow-pk-word)'
      };
    }
    const config = this.gameRegistry.getConfig(gameId);
    const pkMode = config?.modes?.find(m => m.id !== GameMode.Single);
    const modeId = pkMode?.id;
    if (modeId === GameMode.Score || modeId === GameMode.SameScore || ['hexa', 'block', 'drop2048', 'classic2048'].includes(gameId)) {
      return {
        icon: '🏆',
        label: this.i18n.t('lobby.pk_btn_score')() || '抢分对抗',
        gradient: 'var(--gradient-pk-score)',
        shadow: 'var(--shadow-pk-score)'
      };
    }
    return {
      icon: '⚡',
      label: this.i18n.t('lobby.pk_btn_speed')() || '竞速对决',
      gradient: 'var(--gradient-pk-speed)',
      shadow: 'var(--shadow-pk-speed)'
    };
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
    const url = `${getOrigin()}/${this.i18n.currentLang()}/games/${gameId}`;
    const title = this.getGameTitle(gameId);
    const desc = this.getGameDesc(gameId);
    
    this.shareService.share({
      title: `${title} - ${this.i18n.t('app.title')()}`,
      text: `${this.i18n.t('share.game_invite')() || 'Play this awesome game with me!'} ${title}\n${desc}`,
      url: url
    });
  }
}
