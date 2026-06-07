import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';

declare var adbreak: any;

@Injectable({
  providedIn: 'root'
})
export class AdService {
  private toast = inject(ToastService);
  private i18n = inject(I18nService);

  /**
   * Shows a rewarded video ad. If the environment does not support it
   * or the ad is blocked, it falls back to a simulated 3-second delay.
   */
  showRewardedAd(onRewarded: () => void, onCanceled?: () => void) {
    // Check if Google H5 Games Ads API is available
    if (typeof adbreak === 'function') {
      try {
        adbreak({
          type: 'reward',
          name: 'hint_ad',
          beforeReward: (showAdFn: () => void) => {
            showAdFn();
          },
          adDismissed: () => {
            if (onCanceled) onCanceled();
            this.toast.show(this.i18n.t('game.ad_canceled')() || 'Ad canceled.', 'error');
          },
          adViewed: () => {
            onRewarded();
          }
        });
        return;
      } catch (e) {
        console.warn('AdSense adbreak failed, falling back to simulated ad.', e);
      }
    }

    // Fallback: Simulated Ad for Local Development / Blocked Ads
    this.toast.show(this.i18n.t('game.ad_loading')() || 'Loading Ad...', 'info');
    
    // Simulate a 3-second ad
    setTimeout(() => {
      onRewarded();
    }, 3000);
  }
}
