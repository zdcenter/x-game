import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { SettingsService } from './settings.service';

declare var adbreak: any;

@Injectable({
  providedIn: 'root'
})
export class AdService {
  private toast = inject(ToastService);
  private i18n = inject(I18nService);

  private settingsService = inject(SettingsService);

  private readonly LAST_AD_DATE_KEY = 'xgame_last_ad_date';
  private readonly DAILY_AD_COUNT_KEY = 'xgame_daily_ad_count';
  private readonly GAMES_SINCE_LAST_AD_KEY = 'xgame_games_since_last_ad';

  /**
   * Shows a rewarded video ad. If the environment does not support it
   * or the ad is blocked, it falls back to a simulated 3-second delay.
   */
  showRewardedAd(onRewarded: () => void, onCanceled?: () => void) {
    // Check if Google H5 Games Ads API is available
    if (typeof adbreak === 'function') {
      let isHandled = false;
      const fallbackTimeout = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          console.warn('[AdSense] Rewarded ad timeout, falling back to simulated ad.');
          this.toast.show(this.i18n.t('game.ad_loading')() || 'Simulated Ad (Testing Mode)...', 'info');
          setTimeout(() => onRewarded(), 3000);
        }
      }, 1500);

      try {
        adbreak({
          type: 'reward',
          name: 'hint_ad',
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
            onRewarded();
          }
        });
        return;
      } catch (e) {
        console.warn('AdSense adbreak failed, falling back to simulated ad.', e);
        if (!isHandled) { isHandled = true; clearTimeout(fallbackTimeout); }
      }
    }

    // Fallback: Simulated Ad for Local Development / Blocked Ads
    this.toast.show(this.i18n.t('game.ad_loading')() || 'Loading Ad...', 'info');
    
    // Simulate a 3-second ad
    setTimeout(() => {
      onRewarded();
    }, 3000);
  }

  /**
   * Tries to show an interstitial ad between games (e.g., on "Play Again").
   * Adheres to frequency capping and daily limits from Admin Settings.
   */
  tryShowInterstitial(onComplete: () => void) {
    this.checkAndResetDailyCount();

    const frequency = parseInt(this.settingsService.settings().ad_interstitial_frequency || '3', 10);
    const dailyLimit = parseInt(this.settingsService.settings().ad_interstitial_daily_limit || '3', 10);

    let gamesPlayed = parseInt(localStorage.getItem(this.GAMES_SINCE_LAST_AD_KEY) || '0', 10);
    let dailyViews = parseInt(localStorage.getItem(this.DAILY_AD_COUNT_KEY) || '0', 10);

    gamesPlayed++;
    localStorage.setItem(this.GAMES_SINCE_LAST_AD_KEY, gamesPlayed.toString());

    // If conditions are not met, skip ad
    if (gamesPlayed < frequency || dailyViews >= dailyLimit) {
      onComplete();
      return;
    }

    // Attempt to show H5 Games Ads interstitial
    if (typeof adbreak === 'function') {
      let isHandled = false;
      const fallbackTimeout = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          console.warn('[AdSense] Interstitial timeout, falling back to simulated ad.');
          this.toast.show(this.i18n.t('game.ad_loading')() || 'Simulated Ad (Testing Mode)...', 'info');
          this.recordAdShown();
          setTimeout(() => onComplete(), 1500);
        }
      }, 1500);

      try {
        adbreak({
          type: 'next',
          name: 'between_games',
          beforeAd: () => {
            // Google acknowledged the ad and is starting it
            isHandled = true;
            clearTimeout(fallbackTimeout);
          },
          adBreakDone: (placementInfo: any) => {
            if (!isHandled) {
               isHandled = true;
               clearTimeout(fallbackTimeout);
            }
            // adBreakDone triggers regardless of success, fill, or failure
            if (placementInfo && placementInfo.breakStatus === 'viewed') {
               this.recordAdShown();
            }
            onComplete();
          }
        });
      } catch (e) {
        console.warn('AdSense adbreak next failed', e);
        if (!isHandled) { isHandled = true; clearTimeout(fallbackTimeout); }
        onComplete();
      }
    } else {
      // No adbreak available (dev env or adblocker)
      console.log(`[Simulated Interstitial] Ad shown! Daily view count will increase.`);
      this.toast.show(this.i18n.t('game.ad_loading')() || 'Simulated Ad (Testing Mode)...', 'info');
      this.recordAdShown();
      
      // Simulate 1.5 second ad display for testing
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }

  private recordAdShown() {
    let dailyViews = parseInt(localStorage.getItem(this.DAILY_AD_COUNT_KEY) || '0', 10);
    localStorage.setItem(this.DAILY_AD_COUNT_KEY, (dailyViews + 1).toString());
    localStorage.setItem(this.GAMES_SINCE_LAST_AD_KEY, '0');
  }

  private checkAndResetDailyCount() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(this.LAST_AD_DATE_KEY);

    if (lastDate !== today) {
      localStorage.setItem(this.LAST_AD_DATE_KEY, today);
      localStorage.setItem(this.DAILY_AD_COUNT_KEY, '0');
    }
  }
}
