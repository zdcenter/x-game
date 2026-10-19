import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore, User } from '../auth/auth.store';
import { FloatingTextService } from './floating-text.service';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';

export interface ConsumeCoinsResponse {
  success: boolean;
  action: string;
  consumed: number;
  brain_coins: number;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class CoinService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private floatingText = inject(FloatingTextService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  private apiUrl = environment.apiUrl;

  readonly coins = computed(() => this.authStore.currentUser()?.brain_coins ?? 0);
  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());
  readonly pendingCoinGain = signal<{ amount: number } | null>(null);

  showCoinGain(amount: number): void {
    if (amount <= 0) return;
    this.pendingCoinGain.set({ amount });
    // Dismiss at 2.7s (slightly after XP 2.3s so player sees both clearly)
    setTimeout(() => this.pendingCoinGain.set(null), 2700);
  }

  canAfford(cost: number): boolean {
    return this.isAuthenticated() && this.coins() >= cost;
  }

  consumeCoins(action: 'hint' | 'revive' | 'streak_freeze', originEvent?: MouseEvent): Observable<ConsumeCoinsResponse> {
    return this.http.post<ConsumeCoinsResponse>(`${this.apiUrl}/shop/consume`, { action }).pipe(
      tap({
        next: (res) => {
          if (res.user) {
            this.authStore.updateUser(res.user);
          } else {
            const current = this.authStore.currentUser();
            if (current) {
              this.authStore.updateUser({ ...current, brain_coins: res.brain_coins });
            }
          }

          // Trigger gold floating text at mouse position or center top
          const x = originEvent ? originEvent.clientX : window.innerWidth / 2;
          const y = originEvent ? originEvent.clientY - 30 : 120;
          const badgeText = action === 'hint'
            ? '-20 🪙'
            : action === 'revive'
            ? '-50 🪙'
            : '-100 🪙';
          this.floatingText.show(badgeText, x, y, { color: '#fbbf24', size: 'lg' });
        },
        error: (err) => {
          this.toast.show(this.i18n.t('game.insufficient_coins')(), 'error');
        }
      })
    );
  }

  awardCoinsLocally(amount: number) {
    if (amount <= 0) return;
    const current = this.authStore.currentUser();
    if (current) {
      this.authStore.updateUser({
        ...current,
        brain_coins: (current.brain_coins ?? 0) + amount
      });
    }
    const x = window.innerWidth / 2;
    const y = 140;
    this.floatingText.show(`+${amount} 🪙`, x, y, { color: '#34d399', size: 'xl' });
  }

  setCoins(coins: number) {
    const current = this.authStore.currentUser();
    if (current) {
      this.authStore.updateUser({
        ...current,
        brain_coins: coins
      });
    }
  }
}
