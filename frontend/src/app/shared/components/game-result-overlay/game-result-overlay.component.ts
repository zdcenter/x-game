import { GameResult, GameResultType } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';
import { Router } from '@angular/router';
import { GameRegistryService, GameConfig } from '../../../core/services/game-registry.service';
import { AdService } from '../../../core/services/ad.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { XPResult } from '../../../core/services/game-stats.service';
import { ShareService } from '../../../core/services/share.service';
import { TextShareService, TextShareData } from '../../../core/services/text-share.service';
import { StreakService } from '../../../core/services/streak.service';
import { getOrigin } from '../../../core/utils/browser.util';
import { AdsenseComponent } from '../adsense/adsense.component';
import { GhostChallengeService } from '../../../core/services/ghost-challenge.service';
import { CoinService } from '../../../core/services/coin.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';
import { LiveActivityService } from '../../../core/services/live-activity.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule, AdsenseComponent, CoinIconComponent],
  templateUrl: './game-result-overlay.component.html',
  styles: [`
    :host {
      display: contents;
    }
    @keyframes spinSlow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes floatTrophy {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-6px) scale(1.03); }
    }
    @keyframes shieldImpact {
      0% { transform: scale(0.65) rotate(-6deg); opacity: 0; }
      50% { transform: scale(1.08) rotate(3deg); opacity: 1; }
      75% { transform: scale(0.97) rotate(-1deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes revengePulse {
      0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(249, 115, 22, 0.2); }
      50% { box-shadow: 0 0 30px rgba(249, 115, 22, 0.7), inset 0 0 20px rgba(239, 68, 68, 0.4); }
    }
    @keyframes sparkTwinkle {
      0%, 100% { opacity: 0.2; transform: scale(0.6); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .animate-spin-slow {
      animation: spinSlow 30s linear infinite;
    }
    .animate-float-trophy {
      animation: floatTrophy 3s ease-in-out infinite;
    }
    .animate-shield-impact {
      animation: shieldImpact 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .animate-revenge-pulse {
      animation: revengePulse 2s ease-in-out infinite;
    }
    .animate-sparkle {
      animation: sparkTwinkle 2s ease-in-out infinite;
    }
  `]
})
export class GameResultOverlayComponent implements OnInit, OnDestroy, OnChanges {
  i18n = inject(I18nService);
  audio = inject(AudioService);
  private router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  adService = inject(AdService);
  private shareService = inject(ShareService);
  private textShareService = inject(TextShareService);
  private streakService = inject(StreakService);
  private ghostChallengeService = inject(GhostChallengeService);
  authStore = inject(AuthStore);
  coinService = inject(CoinService);
  settingsService = inject(SettingsService);
  private wsService = inject(WebSocketService);
  private liveActivityService = inject(LiveActivityService);

  readonly costRevive = computed(() => this.settingsService.coinEconomy().costRevive);
  readonly canAffordRevive = computed(() => this.coinService.canAfford(this.costRevive()));

  GameResult = GameResult;
  streak = signal<number>(0);
  rays = Array.from({ length: 16 }, (_, i) => i);
  sparkles = signal<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  @Input() currentGameId?: string;

  @Input({ required: true }) status!: GameResultType;
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() promptText?: string;
  @Input() stats?: { icon?: string, label?: string, value: string | number }[];
  @Input() showNextLevel = false;
  @Input() disableAudio: boolean = false;
  @Input() showRestart = false;
  @Input() showDismiss = false;
  @Input() showLeave?: boolean;
  @Input() isWaitingOthers = false;

  isTemporarilyDismissed = signal(false);

  spectateOpponent() {
    this.isTemporarilyDismissed.set(true);
  }

  reopenOverlay() {
    this.isTemporarilyDismissed.set(false);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isWaitingOthers'] && !this.isWaitingOthers) {
      this.isTemporarilyDismissed.set(false);
      this.playEffect();
      this.animateStats();
    }
  }

  get canShowLeave(): boolean {
    if (this.isWaitingOthers) return true;
    if (this.showLeave !== undefined) {
      return this.showLeave;
    }
    return true;
  }
  @Input() enableChangeRoomGame = false;
  @Input() showRevive = false;

  /** Optional: pass result from submitSingleStat() response to show XP & new-record badge */
  @Input() xpResult?: XPResult | null;
  @Input() coinsEarned?: number;
  @Input() isNewRecord?: boolean;
  /** Game-specific extras for Wordle-style text share card (e.g. { mines: 99, hints: 0 }) */
  @Input() textShareExtras?: Record<string, any>;

  /** PK Match Specific Inputs */
  @Input() isPkMatch: boolean = false;
  @Input() opponentInfo?: { nickname?: string; avatar?: string; score?: number | string; isHost?: boolean; id?: string; playerId?: string };
  @Input() pkSeriesScore?: { me: number; opponent: number };
  @Input() pkRoundFormat?: string;
  @Input() bountyCoins: number = 0;
  @Input() bountyPrize: number = 0;

  get effectiveBountyCoins(): number {
    if (this.bountyCoins > 0) return this.bountyCoins;
    const state: any = this.wsService?.gameState ? this.wsService.gameState() : null;
    return state?.bountyCoins || 0;
  }

  get bountyNetReward(): number {
    const b = this.effectiveBountyCoins;
    if (b <= 0) return 0;
    if (this.bountyPrize > 0) return this.bountyPrize - b;
    return Math.floor(b * 0.8);
  }

  get effectiveCoinsEarned(): number {
    if (this.coinsEarned !== undefined && this.coinsEarned !== null) {
      return this.coinsEarned;
    }
    if (this.status !== GameResult.Win) return 0;
    if (this.isPkMatch) {
      return this.effectiveBountyCoins > 0 ? (25 + this.bountyNetReward) : 25;
    }
    return 10;
  }

  textCopied = signal(false);
  challengeCopied = signal(false);

  get hasPkMode(): boolean {
    if (!this.currentGameId) return false;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    if (!config || !config.modes) return false;
    return config.modes.some(m => m.id !== 'single');
  }

  get levelProgressPercent(): number {
    if (!this.xpResult) return 50;
    const currentLevelBase = (this.xpResult.level - 1) * 100;
    const progress = Math.max(12, Math.min(100, Math.floor(((this.xpResult.xp - currentLevelBase) / 100) * 100)));
    return isNaN(progress) ? 65 : progress;
  }

  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();
  @Output() changeRoomGame = new EventEmitter<string>();
  @Output() revive = new EventEmitter<void>();
  @Output() rematch = new EventEmitter<void>();

  private audioPlayed = false;
  recommendedGames: GameConfig[] = [];
  animatedStats = signal<{ icon?: string, label?: string, value: string | number }[]>([]);

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space' || event.code === 'KeyR') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      if (this.isPkMatch) {
        this.handleRematch();
      } else if (this.showNextLevel) {
        this.handleNextLevel();
      } else if (this.showRestart) {
        this.handleRestart();
      }
    }
  }

  handleRematch() {
    this.adService.tryShowInterstitial(() => {
      if (this.rematch.observed) {
        this.rematch.emit();
      } else {
        this.restart.emit();
      }
    });
  }

  ngOnInit() {
    this.playEffect();
    this.loadRecommendations();
    const isWin = this.status === GameResult.Win;
    if (this.currentGameId) {
      this.streak.set(this.streakService.recordResult(this.currentGameId, isWin));
      this.liveActivityService.reportGameResult(
        this.currentGameId,
        isWin,
        this.isPkMatch ? 'pk' : 'single'
      );
    }
    if (isWin) {
      const generated = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: 6 + Math.random() * 88,
        y: 6 + Math.random() * 88,
        size: 8 + Math.random() * 12,
        delay: Math.random() * 2,
        duration: 1.6 + Math.random() * 1.6
      }));
      this.sparkles.set(generated);

      if (this.isNewRecord) {
        this.fireNewRecordConfetti();
      } else {
        this.fireConfetti();
      }
    }
    this.animateStats();
  }

  private fireConfetti() {
    // A quick, celebratory burst from the center bottom
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 90, ticks: 100, zIndex: 10000, colors: ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'] };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  private fireNewRecordConfetti() {
    // A massive, glorious golden explosion for new records
    const duration = 4000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 60, spread: 120, ticks: 150, zIndex: 10000 };
    const goldenColors = ['#FEE715', '#FFD700', '#FFA500', '#FF8C00', '#FFDF00'];

    // Initial massive explosion
    confetti({
      particleCount: 150,
      spread: 180,
      origin: { y: 0.6 },
      colors: goldenColors,
      startVelocity: 80,
      zIndex: 10000
    });

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 60 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.1 }, colors: goldenColors });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.1 }, colors: goldenColors });
    }, 200);
  }

  private animateStats() {
    if (!this.stats || this.stats.length === 0) {
      this.animatedStats.set([]);
      return;
    }
    
    // Initialize animated stats with 0 for numbers
    const targetStats = [...this.stats];
    const currentStats = targetStats.map(s => ({
      ...s,
      value: typeof s.value === 'number' ? 0 : s.value
    }));
    this.animatedStats.set([...currentStats]);

    let startTimestamp: number | null = null;
    const duration = 1500; // 1.5 seconds animation

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      let hasChanges = false;
      const newStats = currentStats.map((s, i) => {
        const target = targetStats[i].value;
        if (typeof target === 'number' && typeof s.value === 'number') {
          const currentVal = Math.floor(target * easeProgress);
          if (currentVal !== s.value) hasChanges = true;
          return { ...s, value: currentVal };
        }
        return s;
      });

      if (hasChanges || progress === 1) {
        // Ensure final values match exactly
        if (progress === 1) {
          this.animatedStats.set([...targetStats]);
        } else {
          this.animatedStats.set(newStats);
        }
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  private loadRecommendations() {
    if (!this.currentGameId) return;
    const allGames = this.gameRegistry.getAllConfigs();
    const config = this.gameRegistry.getConfig(this.currentGameId);
    
    let recommendedIds: string[] = [];
    if (config && config.recommendations) {
      recommendedIds = [...config.recommendations];
    }
    
    const otherGames = allGames.filter(g => g.id !== this.currentGameId && !recommendedIds.includes(g.id));
    for (let i = otherGames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherGames[i], otherGames[j]] = [otherGames[j], otherGames[i]];
    }
    
    const needed = Math.max(0, 6 - recommendedIds.length);
    const toAdd = otherGames.slice(0, needed).map(g => g.id);
    
    this.recommendedGames = [...recommendedIds, ...toAdd]
      .map(id => this.gameRegistry.getConfig(id))
      .filter((c): c is GameConfig => !!c);
  }

  t(key: string): string {
    return this.i18n.t(key)();
  }

  goToLogin() {
    this.router.navigate(['/', this.i18n.currentLang(), 'login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  goToRegister() {
    this.router.navigate(['/', this.i18n.currentLang(), 'register'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  handleLeave() {
    if (this.leave.observed) {
      this.leave.emit();
    } else {
      const lang = this.i18n.currentLang();
      this.router.navigate(['/', lang, 'lobby']);
    }
  }

  handleRestart() {
    this.adService.tryShowInterstitial(() => this.restart.emit());
  }

  handleNextLevel() {
    this.adService.tryShowInterstitial(() => this.nextLevel.emit());
  }

  handleRevive() {
    this.adService.showRewardedAd(() => this.revive.emit());
  }

  handleCoinRevive(event: MouseEvent) {
    this.coinService.consumeCoins('revive', event).subscribe({
      next: () => {
        this.revive.emit();
      },
      error: () => {
        this.handleRevive();
      }
    });
  }

  handleDismiss() {
    this.adService.tryShowInterstitial(() => this.dismiss.emit());
  }

  shareResult() {
    if (!this.currentGameId) return;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    const gameName = config ? this.i18n.t(config.titleKey)() : this.currentGameId;
    const username = this.authStore.currentUser()?.username;
    const challengeParam = username ? `?challenge=${encodeURIComponent(username)}` : '';
    const url = `${getOrigin()}/games/${this.currentGameId}${challengeParam}`;

    const statsStr = (this.stats || [])
      .map(s => `${s.icon || ''}${s.value}`)
      .join('  ');

    const textKey = this.status === GameResult.Win ? 'share.result_win' : 'share.result_lose';
    let text = this.i18n.t(textKey)().replace('[game]', gameName);
    if (statsStr) text += `\n${statsStr}`;

    this.shareService.share({
      title: `${this.i18n.t('app.title')()} - ${gameName}`,
      text,
      url,
      gameName,
      gameEmoji: config?.iconEmoji,
      isWin: this.status === GameResult.Win,
      stats: this.stats,
    });
  }

  copyTextResult() {
    if (!this.currentGameId) return;
    this.textShareService.copyTextCard({
      gameId: this.currentGameId,
      isWin: this.status === GameResult.Win,
      stats: this.stats,
      extras: {
        ...this.textShareExtras,
        streak: this.streak(),
      },
    });
    this.textCopied.set(true);
    setTimeout(() => this.textCopied.set(false), 2000);
  }

  shareNewRecord() {
    if (!this.currentGameId) return;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    const gameName = config ? this.i18n.t(config.titleKey)() : this.currentGameId;
    const username = this.authStore.currentUser()?.username;
    const challengeParam = username ? `?challenge=${encodeURIComponent(username)}` : '';
    const url = `${getOrigin()}/games/${this.currentGameId}${challengeParam}`;
    const bestStat = (this.stats || [])[0];
    const statStr = bestStat ? `${bestStat.icon || ''}${bestStat.value}` : '';
    const text = this.i18n.t('share.new_record_text')()
      .replace('[game]', gameName)
      .replace('[stat]', statStr);
    this.shareService.share({ title: `${this.i18n.t('app.title')()} - ${gameName}`, text, url,
      gameName, gameEmoji: config?.iconEmoji, isWin: true, stats: this.stats });
  }

  shareLevelUp() {
    if (!this.xpResult) return;
    const url = `${getOrigin()}/lobby`;
    const text = this.i18n.t('share.level_up_text')().replace('[level]', String(this.xpResult.level));
    this.shareService.share({ title: this.i18n.t('app.title')(), text, url });
  }

  shareStreak() {
    if (!this.currentGameId) return;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    const gameName = config ? this.i18n.t(config.titleKey)() : this.currentGameId;
    const username = this.authStore.currentUser()?.username;
    const challengeParam = username ? `?challenge=${encodeURIComponent(username)}` : '';
    const url = `${getOrigin()}/games/${this.currentGameId}${challengeParam}`;
    const text = this.i18n.t('share.streak_text')()
      .replace('[count]', String(this.streak()))
      .replace('[game]', gameName);
    this.shareService.share({ title: `${this.i18n.t('app.title')()} - ${gameName}`, text, url,
      gameName, gameEmoji: config?.iconEmoji, isWin: true });
  }

  copyChallengeLink() {
    if (!this.currentGameId) return;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    const gameName = config ? this.i18n.t(config.titleKey)() : this.currentGameId;
    const bestStat = (this.stats || [])[0];
    const statStr = bestStat ? `${bestStat.label || ''}: ${bestStat.value}` : '';

    let targetTime = 0;
    let targetScore = 0;
    const timeGames = ['minesweeper','sudoku','sliding','codebreaker','math24','watersort','sokoban','lightsout'];
    if (timeGames.includes(this.currentGameId)) {
      const val = typeof bestStat?.value === 'number' ? bestStat.value : parseInt(String(bestStat?.value || 0), 10);
      targetTime = isNaN(val) ? 0 : val;
    } else {
      const val = typeof bestStat?.value === 'number' ? bestStat.value : parseInt(String(bestStat?.value || 0), 10);
      targetScore = isNaN(val) ? 0 : val;
    }

    this.ghostChallengeService.createChallenge({
      game_id: this.currentGameId,
      target_time: targetTime,
      target_score: targetScore,
    }).subscribe({
      next: res => {
        const lang = this.i18n.currentLang();
        const url = `${getOrigin()}/${lang}/games/${this.currentGameId}?challengeId=${res.challenge_id}`;
        const text = `⚔️ ${this.i18n.t('challenge.ghost_title')()}！\n【${gameName}】来看看你能否超越我的成绩 (${statStr})：\n${url}`;

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            this.challengeCopied.set(true);
            setTimeout(() => this.challengeCopied.set(false), 2500);
          });
        }
      },
      error: () => {
        const username = this.authStore.currentUser()?.username || this.authStore.guestId;
        const url = `${getOrigin()}/${this.i18n.currentLang()}/games/${this.currentGameId}?challenge=${encodeURIComponent(username)}`;
        const text = `${this.i18n.t('share.challenge_banner')().replace('[challenger]', username)}\n${gameName} ${statStr}\n${url}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            this.challengeCopied.set(true);
            setTimeout(() => this.challengeCopied.set(false), 2500);
          });
        }
      }
    });
  }

  goToPkArena() {
    if (!this.currentGameId) return;
    const lang = this.i18n.currentLang();
    this.router.navigate(['/', lang, 'pk-arena'], { queryParams: { game: this.currentGameId } });
  }

  handleGoToGame(gameId: string) {
    this.adService.tryShowInterstitial(() => {
      if (this.enableChangeRoomGame) {
        this.changeRoomGame.emit(gameId);
      } else {
        const lang = this.router.url.split('/')[1] || 'zh';
        this.router.navigate(['/', lang, 'games', gameId]);
      }
    });
  }

  // Play effect only once per component lifecycle to avoid double-playing
  private playEffect() {
    if (this.audioPlayed || this.disableAudio) return;
    if (this.status === GameResult.Win) {
      this.audio.playWin(this.isPkMatch);
    } else if (this.status === GameResult.Lose) {
      this.audio.playLose(this.isPkMatch);
    }
    this.audioPlayed = true;
  }

  ngOnDestroy() {
    this.audioPlayed = false;
  }
}
