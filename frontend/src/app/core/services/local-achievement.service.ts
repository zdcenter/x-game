import { Injectable, inject } from '@angular/core';
import { AchievementService } from './achievement.service';
import { AudioService } from './audio.service';
import { HapticService } from './haptic.service';
import { Achievement } from './game-stats.service';
import { isBrowser, storageGet, storageSet } from '../utils/browser.util';

export interface GameFinishedContext {
  gameId: string;
  won: boolean;
  difficulty?: string;
  score?: number;
  moves?: number;
  timeSpent?: number;
  combo?: number;
  undid?: boolean;
}

export interface CheckResult {
  newAchievements: Achievement[];
  isPersonalBest: boolean;
}

const UNLOCKED_KEY = 'pwa_local_unlocked_achievements';
const TOTAL_PLAYED_KEY = 'pwa_local_total_played';
const STREAK_KEY = 'pwa_local_win_streak';
const PB_SCORES_KEY = 'pwa_local_personal_bests';

@Injectable({
  providedIn: 'root'
})
export class LocalAchievementService {
  private achievementService = inject(AchievementService);
  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  /**
   * 获取本地已解锁的所有成就 ID 集合
   */
  getUnlockedIds(): Set<string> {
    if (!isBrowser()) return new Set();
    try {
      const raw = storageGet(UNLOCKED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  /**
   * 单机对局结束时的统一多巴胺成就与最佳纪录检测
   */
  trackGameFinished(ctx: GameFinishedContext): CheckResult {
    if (!isBrowser() || !ctx.gameId) {
      return { newAchievements: [], isPersonalBest: false };
    }

    const unlocked = this.getUnlockedIds();
    const newAchievements: Achievement[] = [];

    // 1. 累计场次与首局成就
    const totalPlayed = parseInt(storageGet(TOTAL_PLAYED_KEY) || '0', 10) + 1;
    storageSet(TOTAL_PLAYED_KEY, totalPlayed.toString());

    if (!unlocked.has('first_game')) {
      newAchievements.push({
        id: 'first_game',
        title_key: 'achievement.first_game.title',
        desc_key: 'achievement.first_game.desc',
        icon_emoji: '🌱',
        category: 'starter',
        rarity: 'common',
        xp_reward: 50
      });
    }

    if (totalPlayed >= 10 && !unlocked.has('play_10')) {
      newAchievements.push({
        id: 'play_10',
        title_key: 'achievement.play_10.title',
        desc_key: 'achievement.play_10.desc',
        icon_emoji: '🎮',
        category: 'playtime',
        rarity: 'rare',
        xp_reward: 150
      });
    }

    if (totalPlayed >= 100 && !unlocked.has('play_100')) {
      newAchievements.push({
        id: 'play_100',
        title_key: 'achievement.play_100.title',
        desc_key: 'achievement.play_100.desc',
        icon_emoji: '👑',
        category: 'playtime',
        rarity: 'epic',
        xp_reward: 500
      });
    }

    // 2. 连胜统计
    let currentStreak = parseInt(storageGet(STREAK_KEY) || '0', 10);
    if (ctx.won) {
      currentStreak++;
      storageSet(STREAK_KEY, currentStreak.toString());

      if (currentStreak >= 3 && !unlocked.has('streak_3')) {
        newAchievements.push({
          id: 'streak_3',
          title_key: 'achievement.streak_3.title',
          desc_key: 'achievement.streak_3.desc',
          icon_emoji: '🔥',
          category: 'streak',
          rarity: 'rare',
          xp_reward: 200
        });
      }
      if (currentStreak >= 5 && !unlocked.has('streak_5')) {
        newAchievements.push({
          id: 'streak_5',
          title_key: 'achievement.streak_5.title',
          desc_key: 'achievement.streak_5.desc',
          icon_emoji: '⚡',
          category: 'streak',
          rarity: 'epic',
          xp_reward: 400
        });
      }
    } else {
      storageSet(STREAK_KEY, '0');
    }

    // 3. 各单机游戏专家级/大师级专属精通成就
    if (ctx.won) {
      const diff = (ctx.difficulty || '').toLowerCase();
      const isHardOrExpert = ['hard', 'expert', 'master', 'advanced', 'professional'].some(d => diff.includes(d));

      const masterMap: Record<string, { emoji: string; rarity: 'epic' | 'legendary'; xp: number }> = {
        minesweeper: { emoji: '💣', rarity: 'legendary', xp: 500 },
        sudoku: { emoji: '🔢', rarity: 'epic', xp: 400 },
        sliding: { emoji: '🧩', rarity: 'epic', xp: 350 },
        sokoban: { emoji: '📦', rarity: 'epic', xp: 350 },
        watersort: { emoji: '🧪', rarity: 'epic', xp: 350 },
        block: { emoji: '🟦', rarity: 'epic', xp: 300 },
        hexa: { emoji: '⬡', rarity: 'epic', xp: 300 },
        drop2048: { emoji: '⬇️', rarity: 'epic', xp: 350 },
        tetris: { emoji: '🧱', rarity: 'epic', xp: 350 },
        lightsout: { emoji: '💡', rarity: 'epic', xp: 300 },
        gomoku: { emoji: '⚫', rarity: 'epic', xp: 400 },
        codebreaker: { emoji: '🔢', rarity: 'epic', xp: 350 },
        math24: { emoji: '🃏', rarity: 'epic', xp: 350 }
      };

      const meta = masterMap[ctx.gameId];
      const masterKey = `master_${ctx.gameId}`;
      if (meta && isHardOrExpert && !unlocked.has(masterKey)) {
        newAchievements.push({
          id: masterKey,
          title_key: `achievement.${masterKey}.title`,
          desc_key: 'achievement.master_game.desc',
          icon_emoji: meta.emoji,
          category: 'mastery',
          rarity: meta.rarity,
          xp_reward: meta.xp
        });
      }
    }

    // 4. 个人历史最佳纪录 (Personal Best) 检测
    let isPersonalBest = false;
    let pbs: Record<string, number> = {};
    try {
      const raw = storageGet(PB_SCORES_KEY);
      if (raw) pbs = JSON.parse(raw);
    } catch {}

    const currentScore = ctx.score ?? (ctx.won ? 100 : 0);
    if (ctx.won && currentScore > 0) {
      const prevBest = pbs[ctx.gameId] || 0;
      if (currentScore > prevBest) {
        isPersonalBest = true;
        pbs[ctx.gameId] = currentScore;
        storageSet(PB_SCORES_KEY, JSON.stringify(pbs));
      }
    }

    // 5. 保存并派发新成就
    if (newAchievements.length > 0) {
      newAchievements.forEach(a => unlocked.add(a.id));
      storageSet(UNLOCKED_KEY, JSON.stringify(Array.from(unlocked)));

      // 瞬间唤起多巴胺解锁覆层！
      this.achievementService.handleNewAchievements(newAchievements);
      this.audio.playWin();
      this.haptic.vibrateCombo();
    }

    return {
      newAchievements,
      isPersonalBest
    };
  }
}
