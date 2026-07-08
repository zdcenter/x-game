import { GameResult, GameResultType } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';
import { Router } from '@angular/router';
import { GameRegistryService, GameConfig } from '../../../core/services/game-registry.service';
import { AdService } from '../../../core/services/ad.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { XPResult } from '../../../core/services/game-stats.service';
import { ShareService } from '../../../core/services/share.service';
import { StreakService } from '../../../core/services/streak.service';
import { getOrigin } from '../../../core/utils/browser.util';
import { AdsenseComponent } from '../adsense/adsense.component';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule, AdsenseComponent],
  templateUrl: './game-result-overlay.component.html',
})
export class GameResultOverlayComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  audio = inject(AudioService);
  private router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  adService = inject(AdService);
  private shareService = inject(ShareService);
  private streakService = inject(StreakService);
  authStore = inject(AuthStore);

  GameResult = GameResult;
  streak = signal<number>(0);

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
  @Input() showLeave = false;
  @Input() enableChangeRoomGame = false;
  @Input() showRevive = false;

  /** Optional: pass result from submitSingleStat() response to show XP & new-record badge */
  @Input() xpResult?: XPResult | null;
  @Input() isNewRecord?: boolean;

  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();
  @Output() changeRoomGame = new EventEmitter<string>();
  @Output() revive = new EventEmitter<void>();

  private audioPlayed = false;
  recommendedGames: GameConfig[] = [];
  animatedStats = signal<{ icon?: string, label?: string, value: string | number }[]>([]);

  ngOnInit() {
    this.playEffect();
    this.loadRecommendations();
    if (this.currentGameId) {
      const isWin = this.status === GameResult.Win;
      this.streak.set(this.streakService.recordResult(this.currentGameId, isWin));
      if (isWin) {
        this.fireConfetti();
      }
    }
    this.animateStats();
  }

  private fireConfetti() {
    // Fire confetti from left and right edges
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
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
    this.router.navigate(['/login']);
  }

  handleLeave() {
    this.adService.tryShowInterstitial(() => this.leave.emit());
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
      title: `Puzzle PK - ${gameName}`,
      text,
      url,
      gameName,
      gameEmoji: config?.iconEmoji,
      isWin: this.status === GameResult.Win,
      stats: this.stats,
    });
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
    this.shareService.share({ title: `Puzzle PK - ${gameName}`, text, url,
      gameName, gameEmoji: config?.iconEmoji, isWin: true, stats: this.stats });
  }

  shareLevelUp() {
    if (!this.xpResult) return;
    const url = `${getOrigin()}/lobby`;
    const text = this.i18n.t('share.level_up_text')().replace('[level]', String(this.xpResult.level));
    this.shareService.share({ title: 'Puzzle PK', text, url });
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
    this.shareService.share({ title: `Puzzle PK - ${gameName}`, text, url,
      gameName, gameEmoji: config?.iconEmoji, isWin: true });
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
      this.audio.playWin();
    } else if (this.status === GameResult.Lose) {
      this.audio.playLose();
    }
    this.audioPlayed = true;
  }

  ngOnDestroy() {
    this.audioPlayed = false;
  }
}
