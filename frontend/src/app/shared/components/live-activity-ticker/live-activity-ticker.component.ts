import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LiveActivityService } from '../../../core/services/live-activity.service';
import { LobbyActivity } from '../../../core/models/activity.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-live-activity-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-activity-ticker.component.html',
  styleUrls: ['./live-activity-ticker.component.css']
})
export class LiveActivityTickerComponent implements OnInit, OnDestroy {
  activityService = inject(LiveActivityService);
  private router = inject(Router);
  i18n = inject(I18nService);
  private auth = inject(AuthStore);
  private toast = inject(ToastService);
  private cross = inject(CrossGameJoinService);
  private ws = inject(WebSocketService);

  readonly currentIndex = signal<number>(0);
  readonly isPaused = signal<boolean>(false);
  readonly selectedActivity = signal<LobbyActivity | null>(null);

  private timer: any = null;

  readonly activities = computed(() => this.activityService.activities());

  readonly currentActivity = computed(() => {
    const list = this.activities();
    if (list.length === 0) return null;
    const idx = this.currentIndex() % list.length;
    return list[idx];
  });

  readonly currentActivityTime = computed(() => {
    const act = this.currentActivity();
    if (!act) return '';
    return this.activityService.formatTimeAgo(act.timestamp);
  });

  readonly selectedActivityTime = computed(() => {
    const act = this.selectedActivity();
    if (!act) return '';
    return this.activityService.formatTimeAgo(act.timestamp);
  });

  ngOnInit(): void {
    this.startAutoCycle();
  }

  ngOnDestroy(): void {
    this.stopAutoCycle();
  }

  private startAutoCycle(): void {
    this.stopAutoCycle();
    this.timer = setInterval(() => {
      if (!this.isPaused() && this.activities().length > 1) {
        this.next();
      }
    }, 4500);
  }

  private stopAutoCycle(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pause(): void {
    this.isPaused.set(true);
  }

  resume(): void {
    this.isPaused.set(false);
  }

  next(): void {
    const list = this.activities();
    if (list.length > 0) {
      this.currentIndex.update(i => (i + 1) % list.length);
    }
  }

  prev(): void {
    const list = this.activities();
    if (list.length > 0) {
      this.currentIndex.update(i => (i - 1 + list.length) % list.length);
    }
  }

  openDetails(act: LobbyActivity): void {
    this.selectedActivity.set(act);
    this.pause();
  }

  closeDetails(): void {
    this.selectedActivity.set(null);
    this.resume();
  }

  playSameGame(act: LobbyActivity): void {
    this.closeDetails();
    const lang = this.router.url.split('/')[1] || 'zh';
    this.router.navigate([`/${lang}/games/${act.gameId}`]);
  }

  challengePlayer(act: LobbyActivity): void {
    const myId = this.auth.currentUser()?.username || this.auth.guestId;
    if (act.username === myId) {
      this.toast.show(this.i18n.t('activity.cannot_challenge_self')() || '不能挑战自己哦！', 'info');
      return;
    }

    this.closeDetails();
    // Pre-configure pending create room with invitation
    const roomName = `duel-${Date.now().toString(36).slice(-4)}`;
    this.cross.setPendingJoin({
      game: act.gameId,
      roomId: roomName,
      mode: 'pk_speed',
      difficulty: act.diff || 'medium',
      host: myId,
      action: 'create',
      inviteUsernames: [act.username]
    });

    const lang = this.router.url.split('/')[1] || 'zh';
    this.router.navigate([`/${lang}/games/${act.gameId}`]);
    this.toast.show(
      (this.i18n.t('activity.challenge_created')() || '正在前往对战房间并邀请 {user}...')
        .replace('{user}', act.username),
      'success'
    );
  }

  cheerForPlayer(act: LobbyActivity): void {
    this.activityService.sendCheer(act.username, act.gameId);
    
    // Confetti effect
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    const cheerSentTpl = this.i18n.t('activity.cheer_sent')() || '🎉 已为玩家【{user}】送出喝彩！';
    this.toast.show(cheerSentTpl.replace('{user}', act.username), 'success');
  }

  getActivityText(act: LobbyActivity): string {
    const gameName = this.gameLabel(act.gameId);
    const diffName = act.diff ? this.diffLabel(act.diff, act.gameId) : '';

    const replaceParams = (str: string, params: Record<string, string | number>) => {
      let res = str;
      for (const [k, v] of Object.entries(params)) {
        res = res.replace(new RegExp(`\\{\\{${k}\\}\\}|\\{${k}\\}`, 'g'), String(v));
      }
      return res;
    };

    switch (act.type) {
      case 'playing': {
        const tpl = this.i18n.t('activity.action_playing')() || '正在挑战 {game} {diff}';
        const formatted = replaceParams(tpl, { game: gameName, diff: diffName ? `· ${diffName}` : '' });
        // If template translation lacked {game}, append game name so it never reads "正在挑战 难度"
        if (!formatted.includes(gameName)) {
          return `${formatted} · ${gameName}`;
        }
        return formatted;
      }
      case 'record': {
        if (act.score && act.score > 0) {
          const tpl = this.i18n.t('activity.action_score_record')() || '在 {game} 斩获 {score} 分！';
          return replaceParams(tpl, { game: gameName, score: act.score.toLocaleString() });
        }
        if (act.timeTaken && act.timeTaken > 0) {
          const tpl = this.i18n.t('activity.action_time_record')() || '在 {game} 创下 {time}s 极速记录！';
          return replaceParams(tpl, { game: gameName, time: act.timeTaken });
        }
        const tpl = this.i18n.t('activity.action_milestone')() || '在 {game} 取得了全新突破！';
        return replaceParams(tpl, { game: gameName });
      }
      case 'room_created': {
        const tpl = this.i18n.t('activity.action_room_created')() || '创建了 {game} 对决房，等待迎战！';
        return replaceParams(tpl, { game: gameName });
      }
      case 'milestone': {
        return act.text || `${this.i18n.t('activity.milestone_default')() || '在'} ${gameName} ${this.i18n.t('activity.achieved_record')() || '刷新了个人最佳！'}`;
      }
      case 'game_win': {
        const isPk = act.mode && act.mode !== 'single';
        if (isPk) {
          const tpl = this.i18n.t('activity.action_win_pk')() || '在 {game} PK 对决中力克对手，斩获胜利！';
          return replaceParams(tpl, { game: gameName });
        }
        if (act.timeTaken && act.timeTaken > 0) {
          const tpl = this.i18n.t('activity.action_win_time')() || '在 {game} {diff} 成功通关！用时 {time}s';
          return replaceParams(tpl, { game: gameName, diff: diffName ? `· ${diffName}` : '', time: act.timeTaken });
        }
        if (act.score && act.score > 0) {
          const tpl = this.i18n.t('activity.action_win_score')() || '在 {game} {diff} 成功通关！斩获 {score} 分';
          return replaceParams(tpl, { game: gameName, diff: diffName ? `· ${diffName}` : '', score: act.score.toLocaleString() });
        }
        const tpl = this.i18n.t('activity.action_win')() || '在 {game} {diff} 成功通关！';
        return replaceParams(tpl, { game: gameName, diff: diffName ? `· ${diffName}` : '' });
      }
      case 'game_lose': {
        const isPk = act.mode && act.mode !== 'single';
        if (isPk) {
          const tpl = this.i18n.t('activity.action_lose_pk')() || '在 {game} PK 对决中惜败，正蓄力复仇！';
          return replaceParams(tpl, { game: gameName });
        }
        const tpl = this.i18n.t('activity.action_lose')() || '在 {game} {diff} 遗憾失误，正在重整旗鼓！';
        return replaceParams(tpl, { game: gameName, diff: diffName ? `· ${diffName}` : '' });
      }
      default:
        return `${this.i18n.t('activity.action_playing_simple')() || '正在游玩'} ${gameName}`;
    }
  }

  gameLabel(gameId: string): string {
    const key = `lobby.${gameId}`;
    const name = this.i18n.t(key)();
    return name && name !== key ? name : gameId;
  }

  diffLabel(diff: string, gameId?: string): string {
    if (!diff) return '';
    let clean = diff.trim();
    if (clean.startsWith('game.difficulty_')) clean = clean.replace('game.difficulty_', '');
    if (clean.startsWith('game.diff_')) clean = clean.replace('game.diff_', '');
    if (gameId && clean.startsWith(`${gameId}_`)) clean = clean.replace(`${gameId}_`, '');

    const lower = clean.toLowerCase();

    // 1. 标准通用难度优先直达（避免盲猜特化 key 导致 Transloco 丢失警告）
    switch (lower) {
      case 'easy':
      case 'beginner':
        return this.i18n.t('game.diff_easy')();
      case 'medium':
      case 'normal':
      case 'intermediate':
        return this.i18n.t('game.diff_medium')();
      case 'hard':
      case 'advanced':
        return this.i18n.t('game.diff_hard')();
      case 'expert':
        return this.i18n.t('game.diff_expert')();
      case 'master':
        return this.i18n.t('game.diff_master')();
    }

    // 2. 检查游戏特化 key（安全检查当前字典是否存在）
    if (gameId) {
      const gKey = `game.diff_${gameId}_${clean}`;
      if (this.i18n.hasKey(gKey)) {
        return this.i18n.t(gKey)();
      }
    }

    // 3. 检查通用 diff key
    const dKey = `game.diff_${clean}`;
    if (this.i18n.hasKey(dKey)) {
      return this.i18n.t(dKey)();
    }

    // 4. 检查 difficulty key
    const diffKey = `game.difficulty_${clean}`;
    if (this.i18n.hasKey(diffKey)) {
      return this.i18n.t(diffKey)();
    }

    return clean.includes('.') ? (clean.split('.').pop() || clean) : clean;
  }

  getActivityBadgeIcon(type: string): string {
    switch (type) {
      case 'game_win': return '🎉';
      case 'game_lose': return '💥';
      case 'playing': return '🎮';
      case 'record': return '🏆';
      case 'room_created': return '⚔️';
      case 'milestone': return '⚡';
      default: return '🟢';
    }
  }

  getActivityTypeTag(type: string): { label: string; icon: string; css: string } {
    switch (type) {
      case 'game_win':
        return {
          label: this.i18n.t('activity.tag_win')() || '通关胜利',
          icon: '🎉',
          css: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
        };
      case 'game_lose':
        return {
          label: this.i18n.t('activity.tag_lose')() || '挑战失败',
          icon: '💥',
          css: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
        };
      case 'record':
        return {
          label: this.i18n.t('activity.tag_record')() || '破纪录',
          icon: '🏆',
          css: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30'
        };
      case 'room_created':
        return {
          label: this.i18n.t('activity.tag_room')() || '对决开房',
          icon: '⚔️',
          css: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
        };
      case 'milestone':
        return {
          label: this.i18n.t('activity.tag_milestone')() || '荣誉突破',
          icon: '⚡',
          css: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
        };
      default:
        return {
          label: this.i18n.t('activity.tag_playing')() || '挑战中',
          icon: '🎮',
          css: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/30'
        };
    }
  }

  getUserInitial(name: string): string {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  formatTime(ts: number): string {
    return this.activityService.formatTimeAgo(ts);
  }
}
