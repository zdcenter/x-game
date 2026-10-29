import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { SettingsService } from './settings.service';
import { AdPlacement, AdNetwork } from '../models/ad.model';
import { environment } from '../../../environments/environment';
import { isBrowser } from '../utils/browser.util';

declare var adbreak: any;

@Injectable({
  providedIn: 'root'
})
export class AdService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  private settingsService = inject(SettingsService);

  private readonly LAST_AD_DATE_KEY = 'xgame_last_ad_date';
  private readonly DAILY_AD_COUNT_PREFIX = 'xgame_daily_ad_count_';
  private readonly GAMES_SINCE_LAST_AD_KEY = 'xgame_games_since_last_ad';
  private readonly FIRST_VISIT_TIME_KEY = 'xgame_first_visit_time';
  private readonly LAST_INTERSTITIAL_TRY_TIME_KEY = 'xgame_last_int_try_time';

  public placements = signal<AdPlacement[]>([]);

  constructor() {
    this.fetchPlacements();
  }

  private fetchPlacements() {
    this.http.get<AdPlacement[]>(`${environment.apiUrl}/ads/placements`).subscribe({
      next: (data) => {
        this.placements.set(data || []);
      },
      error: (err) => console.error('Failed to load ad placements', err)
    });
    
    // Initialize first visit time for guest exemption
    if (isBrowser() && !localStorage.getItem(this.FIRST_VISIT_TIME_KEY)) {
      localStorage.setItem(this.FIRST_VISIT_TIME_KEY, Date.now().toString());
    }
  }

  getPlacement(id: string): AdPlacement | undefined {
    return this.placements().find(p => p.id === id);
  }

  isPlacementEnabled(id: string): boolean {
    const p = this.getPlacement(id);
    return p ? p.is_enabled : false;
  }

  getBannerSlotId(placementId: string): string | null {
    const p = this.getPlacement(placementId);
    if (!p || !p.is_enabled || p.networks.length === 0) return null;
    
    // Find the first enabled network
    for (const net of p.networks) {
      if (net.is_enabled && (net.provider === 'google_admob' || net.provider === 'google_adsense')) {
         return net.slot_id;
      }
    }
    return null;
  }

  private getDailyViews(placementId: string): number {
    this.checkAndResetDailyCount();
    return parseInt(localStorage.getItem(this.DAILY_AD_COUNT_PREFIX + placementId) || '0', 10);
  }

  private recordAdShown(placementId: string) {
    let dailyViews = this.getDailyViews(placementId);
    localStorage.setItem(this.DAILY_AD_COUNT_PREFIX + placementId, (dailyViews + 1).toString());
    
    if (placementId === 'interstitial') {
       localStorage.setItem(this.GAMES_SINCE_LAST_AD_KEY, '0');
    }
  }

  private checkAndResetDailyCount() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(this.LAST_AD_DATE_KEY);

    if (lastDate !== today) {
      localStorage.setItem(this.LAST_AD_DATE_KEY, today);
      // Remove all count keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.DAILY_AD_COUNT_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Helper to execute the waterfall scheduling logic over available networks.
   * Currently just falls back to simulated ad if real ad fails. 
   * In a fully implemented waterfall, it would recursively call the next network on failure.
   */
  private executeAdWaterfall(placement: AdPlacement, adType: 'reward' | 'next', name: string, onRewardOrComplete: () => void, onCanceled?: () => void) {
    const dailyViews = this.getDailyViews(placement.id);
    if (placement.daily_total_limit !== -1 && dailyViews >= placement.daily_total_limit) {
       console.log(`[AdService] ${placement.id} reached daily limit (${placement.daily_total_limit})`);
       onRewardOrComplete(); // Treat as success or just skip ad based on UX need. Usually we just skip ad and give reward/continue.
       return;
    }

    if (!placement.is_enabled || placement.networks.length === 0) {
       // Disabled or no networks configured, act like it was successful immediately.
       onRewardOrComplete();
       return;
    }

    // Here we'd iterate over placement.networks based on priority and limit_per_user.
    // For now, we simulate finding the best network.
    // Assuming the first network is selected.
    let selectedNetwork: AdNetwork | undefined;
    for (const net of placement.networks) {
        if (net.is_enabled) {
            // Simplified: we just pick the first enabled one.
            selectedNetwork = net;
            break;
        }
    }

    if (!selectedNetwork) {
       onRewardOrComplete();
       return;
    }

    // Integration Branching based on Provider
    if ((selectedNetwork.provider === 'google_admob' || selectedNetwork.provider === 'google_adsense') && typeof adbreak === 'function') {
      let isHandled = false;
      const fallbackTimeout = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          console.warn(`[AdSense] ${adType} timeout, falling back to simulated ad.`);
          this.toast.show(this.i18n.t('game.ad_loading')() || 'Simulated Ad (Testing Mode)...', 'info');
          this.recordAdShown(placement.id);
          setTimeout(() => onRewardOrComplete(), 1500);
        }
      }, 1500);

      try {
        if (adType === 'reward') {
          adbreak({
            type: 'reward',
            name: name,
            beforeReward: (showAdFn: () => void) => {
              isHandled = true;
              clearTimeout(fallbackTimeout);
              showAdFn();
            },
            adDismissed: () => {
              if (!isHandled) { isHandled = true; clearTimeout(fallbackTimeout); }
              if (onCanceled) onCanceled();
              this.toast.show(this.i18n.t('game.ad_canceled')() || 'Ad canceled.', 'error');
            },
            adViewed: () => {
              if (!isHandled) { isHandled = true; clearTimeout(fallbackTimeout); }
              this.recordAdShown(placement.id);
              onRewardOrComplete();
            }
          });
        } else { // 'next' / interstitial
          adbreak({
            type: 'next',
            name: name,
            beforeAd: () => {
              isHandled = true;
              clearTimeout(fallbackTimeout);
            },
            adBreakDone: (placementInfo: any) => {
              if (!isHandled) {
                 isHandled = true;
                 clearTimeout(fallbackTimeout);
              }
              if (placementInfo && placementInfo.breakStatus === 'viewed') {
                 this.recordAdShown(placement.id);
              }
              onRewardOrComplete();
            }
          });
        }
        return;
      } catch (e) {
        console.warn(`AdSense adbreak ${adType} failed`, e);
        if (!isHandled) { isHandled = true; clearTimeout(fallbackTimeout); }
      }
    } else if (selectedNetwork.provider === 'adsterra_monetag') {
      // ----------------------------------------------------------------------
      // Monetag / Adsterra Integration Adapter (Popunder or Vignette)
      // ----------------------------------------------------------------------
      console.log(`[Monetag Adapter] Loading Monetag Vignette for zone: ${selectedNetwork.slot_id}`);
      this.toast.show('Loading Sponsor Ad...', 'info');
      
      const script = document.createElement('script');
      script.dataset['zone'] = selectedNetwork.slot_id;
      script.src = 'https://n6wxm.com/vignette.min.js';
      
      script.onload = () => {
        console.log('[Monetag Adapter] Ad Loaded Successfully');
        this.recordAdShown(placement.id);
        // Monetag popunders open automatically on next click, 
        // so we can grant the reward and let their script handle the UX.
        setTimeout(() => onRewardOrComplete(), 1000);
      };
      
      script.onerror = () => {
        console.warn('[Monetag Adapter] Ad Blocked or Failed to load');
        // Fallback to giving reward so user isn't stuck
        onRewardOrComplete(); 
      };
      
      document.head.appendChild(script);
      return;
    }

    // Fallback: Simulated Ad
    console.log(`[Simulated Ad] Provider: ${selectedNetwork.provider}`);
    this.toast.show(this.i18n.t('game.ad_loading')() || 'Loading Ad...', 'info');
    this.recordAdShown(placement.id);
    setTimeout(() => {
      onRewardOrComplete();
    }, 1500);
  }

  showRewardedAd(onRewarded: () => void, onCanceled?: () => void) {
    const placement = this.getPlacement('hint_ad');
    if (!placement || !placement.is_enabled) {
      // If ad is disabled for hint, directly give hint without ad
      onRewarded();
      return;
    }
    
    const dailyViews = this.getDailyViews(placement.id);
    if (placement.daily_total_limit !== -1 && dailyViews >= placement.daily_total_limit) {
      this.toast.show('Today\'s hint limit reached.', 'error');
      if (onCanceled) onCanceled();
      return;
    }

    this.executeAdWaterfall(placement, 'reward', 'hint_ad', onRewarded, onCanceled);
  }

  tryShowInterstitial(onComplete: () => void) {
    const placement = this.getPlacement('interstitial');
    if (!placement || !placement.is_enabled) {
      onComplete();
      return;
    }

    const now = Date.now();
    const settings = this.settingsService.settings();

    // Strategy 1: New User Exemption
    const exemptionHours = parseInt(settings['ad_new_user_exemption_hours'] || '24', 10);
    if (exemptionHours > 0) {
      const startTime = parseInt(localStorage.getItem(this.FIRST_VISIT_TIME_KEY) || now.toString(), 10);
      const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
      if (hoursSinceStart < exemptionHours) {
        console.log(`[AdService] Skipping interstitial due to new user exemption (${exemptionHours}h)`);
        onComplete();
        return;
      }
    }

    // Strategy 2: Min Game Seconds Protection
    const minSeconds = parseInt(settings['ad_min_game_seconds'] || '30', 10);
    const lastTryTime = parseInt(localStorage.getItem(this.LAST_INTERSTITIAL_TRY_TIME_KEY) || '0', 10);
    localStorage.setItem(this.LAST_INTERSTITIAL_TRY_TIME_KEY, now.toString());
    
    if (lastTryTime > 0 && minSeconds > 0) {
      const secondsSinceLastTry = (now - lastTryTime) / 1000;
      if (secondsSinceLastTry < minSeconds) {
        console.log(`[AdService] Skipping interstitial increment due to fast death (${secondsSinceLastTry.toFixed(1)}s < ${minSeconds}s)`);
        onComplete();
        return;
      }
    }

    const frequency = parseInt(settings['ad_interstitial_frequency'] || '3', 10);
    let gamesPlayed = parseInt(localStorage.getItem(this.GAMES_SINCE_LAST_AD_KEY) || '0', 10);
    gamesPlayed++;
    localStorage.setItem(this.GAMES_SINCE_LAST_AD_KEY, gamesPlayed.toString());

    if (gamesPlayed < frequency) {
      onComplete();
      return;
    }

    const dailyViews = this.getDailyViews(placement.id);
    if (placement.daily_total_limit !== -1 && dailyViews >= placement.daily_total_limit) {
      onComplete();
      return;
    }

    this.executeAdWaterfall(placement, 'next', 'between_games', onComplete);
  }

  private readonly AUTO_NEXT_GAMES_PREFIX = 'xgame_auto_next_count_';

  /**
   * 自动下一局频控调度钩子 (Auto-Next Interstitial Flow Controller)
   * 记录该游戏的自动连续通关次数，当达到后台配置的频次时弹出插屏广告，结束后无缝自动进入下一题。
   * 支持单游戏独立指定的自定义频次 (customFrequency)：-1 继承全局，0 完全免广告，>0 自定义通关局数。
   */
  tryShowAutoNextInterstitial(gameId: string, onContinueNextGame: () => void, customFrequency?: number): void {
    if (!isBrowser()) {
      onContinueNextGame();
      return;
    }

    // 若指定为 0，代表该游戏关闭自动下一局插屏广告
    if (customFrequency === 0) {
      onContinueNextGame();
      return;
    }

    const key = this.AUTO_NEXT_GAMES_PREFIX + gameId;
    let count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, count.toString());

    // 优先采用单游戏独立指定的频次；若未指定或为 -1，则继承全局基准频控
    let frequency = 3;
    if (customFrequency !== undefined && customFrequency > 0) {
      frequency = customFrequency;
    } else {
      const settings = this.settingsService.settings();
      frequency = parseInt(settings['ad_auto_next_frequency'] || settings['ad_interstitial_frequency'] || '3', 10);
    }

    if (count >= frequency) {
      localStorage.setItem(key, '0');
      this.tryShowInterstitial(() => onContinueNextGame());
    } else {
      onContinueNextGame();
    }
  }

  /**
   * 绝境复活激励广告钩子 (Revive Rewarded Ad Hook)
   * 支持扫雷踩雷复活、羊了个羊卡槽满清移复活、2048死局清障等
   */
  showReviveRewardedAd(gameId: string, onRevived: () => void, onDeclined?: () => void): void {
    const placement = this.getPlacement('revive_ad') || this.getPlacement('hint_ad');
    if (!placement || !placement.is_enabled) {
      // 若后台未启用复活广告或广告暂不可用，直接宽容触发复活
      onRevived();
      return;
    }

    const dailyViews = this.getDailyViews(placement.id);
    if (placement.daily_total_limit !== -1 && dailyViews >= placement.daily_total_limit) {
      this.toast.show(this.i18n.t('game.ad_limit_reached')() || "Today's limit reached.", 'error');
      if (onDeclined) onDeclined();
      return;
    }

    this.executeAdWaterfall(
      placement,
      'reward',
      `revive_${gameId}`,
      () => {
        this.toast.show(this.i18n.t('game.revived')() || 'Revived!', 'success');
        onRevived();
      },
      onDeclined
    );
  }
}

