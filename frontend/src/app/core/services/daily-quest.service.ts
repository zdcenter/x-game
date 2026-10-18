import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

export interface DailyQuestItem {
  id: string;
  title_key: string;
  desc_key: string;
  icon: string;
  current: number;
  target: number;
  xp_amount: number;
  coins?: number;
  completed: boolean;
  claimed: boolean;
  action_url: string;
}

export interface DailyChestItem {
  id: string;
  title_key: string;
  desc_key: string;
  icon: string;
  completed: boolean;
  claimed: boolean;
  xp_amount: number;
  coins?: number;
}

export interface StreakMilestone {
  days: number;
  xp_amount: number;
  coins: number;
  title_key: string;
  reward_desc: string;
  reward_icon: string;
  reached: boolean;
}

export interface DailyQuestsResponse {
  date: string;
  streak: number;
  streak_freezes: number;
  brain_coins: number;
  quests: DailyQuestItem[];
  chest: DailyChestItem;
  completed_count: number;
  total_count: number;
  all_completed: boolean;
  milestones: StreakMilestone[];
}

export interface ClaimQuestResponse {
  quest_id: string;
  xp_amount: number;
  coins_amount: number;
  xp_result: {
    xp_earned: number;
    xp: number;
    level: number;
    leveled_up: boolean;
  };
  streak: number;
  streak_freezes: number;
  brain_coins: number;
  milestone_notice?: string;
}

@Injectable({ providedIn: 'root' })
export class DailyQuestService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = environment.apiUrl;

  questsData = signal<DailyQuestsResponse | null>(null);

  getTodayQuests(): Observable<DailyQuestsResponse> {
    return this.http.get<DailyQuestsResponse>(`${this.apiUrl}/quests/today`).pipe(
      tap(res => this.questsData.set(res))
    );
  }

  claimQuest(questId: string): Observable<ClaimQuestResponse> {
    return this.http.post<ClaimQuestResponse>(`${this.apiUrl}/quests/claim`, { quest_id: questId }).pipe(
      tap(res => {
        // Update local state reactively
        this.questsData.update(data => {
          if (!data) return null;
          if (questId === 'daily_chest') {
            data.chest.claimed = true;
            data.streak = res.streak;
          } else {
            const q = data.quests.find(item => item.id === questId);
            if (q) q.claimed = true;
          }
          data.brain_coins = res.brain_coins;
          data.streak_freezes = res.streak_freezes;
          if (data.milestones) {
            for (const m of data.milestones) {
              m.reached = res.streak >= m.days;
            }
          }
          return { ...data };
        });

        // Update authStore user if present
        if (this.authStore.currentUser()) {
          const user = this.authStore.currentUser()!;
          this.authStore.updateUser({
            ...user,
            xp: res.xp_result.xp,
            level: res.xp_result.level,
            login_streak: res.streak,
            streak_freezes: res.streak_freezes,
            brain_coins: res.brain_coins,
          });
        }
      })
    );
  }

  secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  }

  formatCountdown(seconds: number): string {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
