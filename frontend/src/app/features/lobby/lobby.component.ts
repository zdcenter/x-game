import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
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
import { LiveActivityTickerComponent } from '../../shared/components/live-activity-ticker/live-activity-ticker.component';
import { LiveRoomService } from '../../core/services/live-room.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { BlogService, BlogPostMeta } from '../../core/services/blog.service';
import { isBrowser, getOrigin, getRecentGames } from '../../core/utils/browser.util';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
import { SiteRecommendModalComponent } from '../../shared/components/site-recommend-modal/site-recommend-modal.component';
const PAGE_SIZE = 8;

export interface GameBadge {
  type: 'pinned' | 'new' | 'hot';
  icon: string;
  label: string;
  gradientClass: string;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, GameLobbyPanelComponent, DailyChallengeBannerComponent, LiveWaitingRoomsComponent, LiveActivityTickerComponent, SiteRecommendModalComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  gameService = inject(GameService);
  private wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  private authModal = inject(AuthModalService);
  private crossGameJoin = inject(CrossGameJoinService);
  private http = inject(HttpClient);
  router = inject(Router);
  settingsService = inject(SettingsService);
  announcementService = inject(AnnouncementService);
  shareService = inject(ShareService);
  adService = inject(AdService);
  gameRegistry = inject(GameRegistryService);
  liveRoom = inject(LiveRoomService);

  games = signal<BackendGameConfig[]>(
    GAME_DEFINITIONS.map(def => ({
      id: def.id, name: def.id, overview: '', rules: '', config: '',
      isActive: true, visitCount: 0, createdAt: '', updatedAt: '',
    }))
  );
  
  // Loading skeleton state (active on client until games stats are hydrated)
  isLoading = signal<boolean>(isBrowser());

  // Active category filter: 'all' | 'hot' | 'pk' | 'logic' | 'puzzle'
  selectedCategory = signal<'all' | 'hot' | 'pk' | 'logic' | 'puzzle'>('all');
  sortMode = signal<'recommended' | 'visit' | 'name'>('recommended');
  searchQuery = signal<string>('');
  isQuickSwitcherOpen = signal<boolean>(false);

  recentGameIds = signal<string[]>([]);
  recentGames = computed(() => {
    const ids = this.recentGameIds();
    const lang = this.i18n.currentLang();
    return ids.map(id => {
      const def = GAME_DEFINITIONS.find(d => d.id === id);
      if (!def) return null;
      return {
        id: def.id,
        title: this.getGameTitle(def.id),
        emoji: def.iconEmoji || this.getGameEmoji(def.id),
        route: ['/', lang, 'games', def.id],
        isPk: this.hasMultiplayer(def.id)
      };
    }).filter((g): g is NonNullable<typeof g> => g !== null);
  });

  clearRecentGamesList() {
    if (isBrowser()) {
      localStorage.removeItem('xgame_recent_games');
      this.recentGameIds.set([]);
    }
  }

  getGamePriority(id: string): number {
    return this.gameRegistry.getConfig(id)?.priority || 0;
  }

  getGameBadge(id: string): GameBadge | null {
    const config = this.gameRegistry.getConfig(id);
    const badgeType = config?.badgeType;
    const priority = config?.priority || 0;

    if (badgeType === 'new') {
      return {
        type: 'new',
        icon: '✨',
        label: this.i18n.t('badge.new')() || 'NEW',
        gradientClass: 'from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 border-emerald-300/40'
      };
    }
    if (badgeType === 'hot') {
      return {
        type: 'hot',
        icon: '🔥',
        label: this.i18n.t('badge.hot')() || 'HOT',
        gradientClass: 'from-rose-500 to-amber-500 text-white shadow-rose-500/30 border-rose-300/40'
      };
    }
    if (badgeType === 'pinned') {
      return {
        type: 'pinned',
        icon: '⭐',
        label: this.i18n.t('badge.pinned')() || '置顶',
        gradientClass: 'from-amber-500 to-orange-500 text-white shadow-amber-500/30 border-amber-300/40'
      };
    }
    if (badgeType === 'none') {
      return null;
    }

    // 向下兼容历史数据：未配置 badgeType 且 priority > 0
    if (priority > 0) {
      return {
        type: 'pinned',
        icon: '⭐',
        label: this.i18n.t('badge.pinned')() || '置顶',
        gradientClass: 'from-amber-500 to-orange-500 text-white shadow-amber-500/30 border-amber-300/40'
      };
    }

    return null;
  }

  allQuickGames = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const lang = this.i18n.currentLang();
    return GAME_DEFINITIONS.map(def => {
      const title = this.getGameTitle(def.id);
      const emoji = def.iconEmoji || this.getGameEmoji(def.id);
      const isPk = this.hasMultiplayer(def.id);
      return {
        id: def.id,
        title,
        emoji,
        route: ['/', lang, 'games', def.id],
        isPk
      };
    }).filter(g => {
      if (!q) return true;
      return g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
    });
  });

  toggleQuickSwitcher(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isQuickSwitcherOpen.update(v => !v);
  }

  openQuickSwitcher() {
    this.isQuickSwitcherOpen.set(true);
  }

  closeQuickSwitcher() {
    this.isQuickSwitcherOpen.set(false);
    this.searchQuery.set('');
  }

  selectQuickGame(game: { route: string[] }) {
    this.closeQuickSwitcher();
    this.router.navigate(game.route);
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.isQuickSwitcherOpen()) {
      this.closeQuickSwitcher();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isQuickSwitcherOpen() && !target.closest('.quick-switcher-container') && !target.closest('.quick-switcher-modal')) {
      this.closeQuickSwitcher();
    }
  }

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
    const sort = this.sortMode();
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

    // Apply sorting when not hard-locked to hot filter
    if (cat !== 'hot') {
      if (sort === 'recommended') {
        list.sort((a, b) => {
          const priorityA = this.getGamePriority(a.id);
          const priorityB = this.getGamePriority(b.id);
          const scoreA = (priorityA * 100000) + (a.visitCount || 0);
          const scoreB = (priorityB * 100000) + (b.visitCount || 0);
          return scoreB - scoreA;
        });
      } else if (sort === 'visit') {
        list.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
      } else if (sort === 'name') {
        list.sort((a, b) => {
          const titleA = this.getGameTitle(a.id);
          const titleB = this.getGameTitle(b.id);
          return titleA.localeCompare(titleB, this.i18n.currentLang());
        });
      }
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
    if (!this.authStore.isAuthenticated()) {
      const returnUrl = '/' + this.i18n.currentLang() + '/pk-arena' + (gameId ? '?game=' + gameId : '');
      this.authModal.open({ returnUrl });
      return;
    }
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
    if (!this.authStore.isAuthenticated()) {
      const returnUrl = '/' + this.i18n.currentLang() + '/pk-arena' + (gameId ? '?game=' + gameId : '');
      this.authModal.open({ returnUrl });
      return;
    }
    const myId = this.liveRoom.currentUserId();
    const waitingRoom = this.liveRoom.waitingRooms().find(r => r.game === gameId && r.host !== myId);
    if (waitingRoom) {
      this.liveRoom.quickJoin(waitingRoom);
    } else {
      this.goToPkArena(gameId);
    }
  }

  ngOnInit() {
    // Populate recently played games from client storage
    if (isBrowser()) {
      this.recentGameIds.set(getRecentGames());
    }

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
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load game stats:', err);
        this.isLoading.set(false);
      }
    });

    // Safety fallback: ensure skeleton transitions out within 600ms even on slow networks
    if (isBrowser()) {
      setTimeout(() => this.isLoading.set(false), 600);
    }
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
