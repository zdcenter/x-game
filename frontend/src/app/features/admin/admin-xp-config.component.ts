import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsService } from '../../core/services/settings.service';
import { environment } from '../../../environments/environment';

interface ConfigItem {
  key: string;
  value: string;
  label: string;
  description: string;
  unit: string;
  category?: 'reward' | 'cost' | 'rule';
}

const DEFAULT_COIN_SETTINGS: ConfigItem[] = [
  { key: 'coins.solo_easy',   value: '2',  label: '单机简单通关', description: '单机简单难度通关胜利奖励脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.solo_medium', value: '5',  label: '单机中等通关', description: '单机中等难度通关胜利奖励脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.solo_hard',   value: '10', label: '单机困难通关', description: '单机困难难度通关胜利奖励脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.solo_expert', value: '18', label: '单机专家通关', description: '单机专家难度通关胜利奖励脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.solo_master', value: '25', label: '单机大师通关', description: '单机大师难度通关胜利奖励脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.solo_defeat', value: '0',  label: '单机闯关失败', description: '单机模式挑战失败奖励脑力币 (通常为 0)', unit: '🪙', category: 'reward' },
  { key: 'coins.pk_win',      value: '5',  label: '真人 PK 获胜', description: '真人实时对战/排位获胜奖励基础脑力币', unit: '🪙', category: 'reward' },
  { key: 'coins.pk_defeat',   value: '0',  label: '真人 PK 失败', description: '真人实时对战/排位失败奖励基础脑力币 (通常为 0)', unit: '🪙', category: 'reward' },
  { key: 'coins.cost_hint',   value: '20', label: '免广告提示单价', description: '单机解题免看广告秒出提示消耗', unit: '🪙', category: 'cost' },
  { key: 'coins.cost_revive', value: '50', label: '免广告复活单价', description: '单机失误免看广告当局复活消耗', unit: '🪙', category: 'cost' },
  { key: 'coins.cost_freeze',    value: '100', label: '连胜冷冻卡单价', description: '商城购买防断签/连胜冷冻保护卡消耗', unit: '🪙', category: 'cost' },
  { key: 'coins.daily_cap',      value: '80',  label: '单机每日代币上限', description: '单人单机每日获取总币数上限 (防脚本刷币)', unit: '🪙', category: 'rule' },
  { key: 'coins.register_bonus', value: '0',   label: '新注册赠送脑力币', description: '新用户注册时赠送代币 (设为 0 即不送，通过游戏闯关赚取)', unit: '🪙', category: 'rule' },
];

const DEFAULT_XP_SETTINGS: ConfigItem[] = [
  { key: 'xp.single_win',    value: '5',  label: '单机通关胜利', description: '单机模式通关胜利时奖励的经验值', unit: 'XP' },
  { key: 'xp.single_defeat', value: '0',  label: '单机闯关失败', description: '单机模式挑战失败时获得的经验值 (设为 0 则不奖励经验)', unit: 'XP' },
  { key: 'xp.pk_win',        value: '15', label: '真人 PK 获胜',  description: '真人实时对战/排位挑战获胜时奖励的经验值', unit: 'XP' },
  { key: 'xp.pk_defeat',     value: '0',  label: '真人 PK 失败',  description: '真人实时对战/排位挑战失败时获得的经验值 (设为 0 则不奖励经验)', unit: 'XP' },
  { key: 'xp.daily_complete',value: '30', label: '每日挑战奖励', description: '每日挑战完成时奖励的经验值', unit: 'XP' },
  { key: 'xp.streak_day1',   value: '3',  label: '连续登录第 1 天', description: '连续登录签到奖励 — 第 1 天', unit: 'XP' },
  { key: 'xp.streak_day3',   value: '5',  label: '连续登录第 3 天', description: '连续登录签到奖励 — 第 3 天', unit: 'XP' },
  { key: 'xp.streak_day7',   value: '10', label: '连续登录第 7 天', description: '连续登录签到奖励 — 第 7 天', unit: 'XP' },
  { key: 'xp.streak_day14',  value: '20', label: '连续登录第 14 天', description: '连续登录签到奖励 — 第 14 天', unit: 'XP' },
  { key: 'xp.streak_day30',  value: '50', label: '连续登录 30+ 天', description: '连续登录签到奖励 — 第 30+ 天', unit: 'XP' },
];

@Component({
  selector: 'app-admin-xp-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-[var(--color-text-main)] flex items-center gap-2">
            <span>⚙️</span>
            <span>{{ i18n.t('admin.economy.page_title')() }}</span>
          </h1>
          <p class="text-xs text-[var(--color-text-muted)] mt-1">
            {{ i18n.t('admin.economy.page_subtitle')() }}
          </p>
        </div>

        <button (click)="saveAll()" [disabled]="isSaving()"
                class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-black text-sm shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
          @if (isSaving()) {
            <span class="animate-spin text-sm">⏳</span>
            <span>{{ i18n.t('admin.xp.saving')() }}</span>
          } @else {
            <span>💾</span>
            <span>{{ i18n.t('admin.xp.save_all')() }}</span>
          }
        </button>
      </div>

      <!-- Success Notification Alert -->
      @if (savedMsg()) {
        <div class="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-sm shadow-sm animate-fade-in">
          <span>✓</span>
          <span>{{ i18n.t('admin.xp.save_success')() }}</span>
        </div>
      }

      <!-- Navigation Tabs -->
      <div class="flex gap-2 p-1.5 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] w-fit">
        <button (click)="currentTab.set('coins')"
                class="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
                [class.bg-[var(--color-bg-main)]]="currentTab() === 'coins'"
                [class.text-amber-400]="currentTab() === 'coins'"
                [class.shadow-sm]="currentTab() === 'coins'"
                [class.text-[var(--color-text-muted)]]="currentTab() !== 'coins'">
          <span>{{ i18n.t('admin.economy.tab_coins')() }}</span>
        </button>
        <button (click)="currentTab.set('xp')"
                class="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
                [class.bg-[var(--color-bg-main)]]="currentTab() === 'xp'"
                [class.text-emerald-400]="currentTab() === 'xp'"
                [class.shadow-sm]="currentTab() === 'xp'"
                [class.text-[var(--color-text-muted)]]="currentTab() !== 'xp'">
          <span>{{ i18n.t('admin.economy.tab_xp')() }}</span>
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-16">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
        </div>
      } @else {
        @if (currentTab() === 'coins') {
          <!-- Brain Coins Section -->
          <div class="space-y-6">
            <!-- Info Callout -->
            <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-sm">
              <div class="flex items-start gap-3">
                <span class="text-2xl">💡</span>
                <div>
                  <h3 class="font-black text-sm text-[var(--color-text-main)]">实时配置驱动机制 (Live Config-driven)</h3>
                  <p class="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    所有数值修改保存后即刻持久化到数据库 <code>system_settings</code>。包括单机/PK通关与失败时的脑力币发放、道具单价及规则，前后台均自动联动生效。
                  </p>
                </div>
              </div>
            </div>

            <!-- Group 1: Rewards -->
            <div>
              <h2 class="text-sm font-black uppercase tracking-wider text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                <span>📈</span>
                <span>{{ i18n.t('admin.economy.rewards_title')() }}</span>
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                @for (s of coinRewards(); track s.key) {
                  <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-amber-500/40 transition-colors">
                    <div>
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-[var(--color-text-main)]">{{ getLabel(s) }}</span>
                        <span class="text-[10px] font-mono text-[var(--color-text-muted)]">{{ s.key }}</span>
                      </div>
                      <p class="text-xs text-[var(--color-text-muted)] mt-1">{{ getDesc(s) }}</p>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-card)]/50">
                      <input [(ngModel)]="s.value" type="number" min="0" max="9999"
                             class="w-24 px-3 py-1.5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-right font-mono font-black text-amber-400 text-sm focus:outline-none focus:border-amber-500" />
                      <span class="text-xs font-black text-amber-500">{{ s.unit }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Group 2: Costs & Rules -->
            <div>
              <h2 class="text-sm font-black uppercase tracking-wider text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                <span>⚡</span>
                <span>{{ i18n.t('admin.economy.costs_title')() }}</span>
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                @for (s of coinCostsAndRules(); track s.key) {
                  <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-amber-500/40 transition-colors">
                    <div>
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-[var(--color-text-main)]">{{ getLabel(s) }}</span>
                        <span class="text-[10px] font-mono text-[var(--color-text-muted)]">{{ s.key }}</span>
                      </div>
                      <p class="text-xs text-[var(--color-text-muted)] mt-1">{{ getDesc(s) }}</p>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-card)]/50">
                      <input [(ngModel)]="s.value" type="number" min="0" max="9999"
                             class="w-24 px-3 py-1.5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-right font-mono font-black text-amber-400 text-sm focus:outline-none focus:border-amber-500" />
                      <span class="text-xs font-black text-amber-500">{{ s.unit }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        } @else {
          <!-- XP Tab Section -->
          <div class="space-y-6">
            <!-- XP Formula Info Card -->
            <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-sm">
              <h2 class="font-black text-sm text-[var(--color-text-main)] mb-3">{{ i18n.t('admin.xp.formula_label')() }}</h2>
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
                <div class="flex-1 font-mono bg-[var(--color-bg-main)] rounded-xl px-4 py-3 border border-[var(--color-border-card)] text-xs sm:text-sm">
                  level = floor(sqrt(xp / 100)) + 1
                </div>
                <div class="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                  <span class="px-2.5 py-1 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">Lv.1: 0 XP</span>
                  <span class="px-2.5 py-1 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">Lv.5: 1600 XP</span>
                  <span class="px-2.5 py-1 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">Lv.10: 8100 XP</span>
                  <span class="px-2.5 py-1 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">Lv.20: 36100 XP</span>
                </div>
              </div>
            </div>

            <!-- XP Settings Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (s of xpSettings(); track s.key) {
                <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 flex items-center gap-4 shadow-sm">
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm text-[var(--color-text-main)]">{{ getLabel(s) }}</p>
                    <p class="text-xs text-[var(--color-text-muted)] mt-0.5">{{ getDesc(s) }}</p>
                    <p class="text-[10px] font-mono text-[var(--color-text-muted)] mt-1">{{ s.key }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <input [(ngModel)]="s.value" type="number" min="0" max="9999"
                           class="w-20 px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-right font-mono font-bold text-[var(--color-accent-to)] text-sm focus:outline-none focus:border-[var(--color-accent-to)]" />
                    <span class="text-xs font-bold text-[var(--color-text-muted)]">XP</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `
})
export class AdminXpConfigComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private settingsService = inject(SettingsService);
  private apiUrl = environment.apiUrl;

  currentTab = signal<'coins' | 'xp'>('coins');
  isLoading = signal(true);
  isSaving = signal(false);
  savedMsg = signal(false);

  coinSettings = signal<ConfigItem[]>([]);
  xpSettings = signal<ConfigItem[]>([]);

  coinRewards = () => this.coinSettings().filter(s => s.category === 'reward');
  coinCostsAndRules = () => this.coinSettings().filter(s => s.category !== 'reward');

  getLabel(s: ConfigItem): string {
    const key = 'admin.config.' + s.key.replace('.', '_') + '.label';
    const t = this.i18n.t(key)();
    return t && t !== key ? t : s.label;
  }

  getDesc(s: ConfigItem): string {
    const key = 'admin.config.' + s.key.replace('.', '_') + '.desc';
    const t = this.i18n.t(key)();
    return t && t !== key ? t : s.description;
  }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/admin/settings`).subscribe({
      next: r => {
        const serverMap = new Map<string, string>(
          (r.settings ?? []).map((s: any) => [s.key, s.value])
        );

        this.coinSettings.set(DEFAULT_COIN_SETTINGS.map(d => ({
          ...d,
          value: serverMap.get(d.key) ?? d.value,
        })));

        this.xpSettings.set(DEFAULT_XP_SETTINGS.map(d => ({
          ...d,
          value: serverMap.get(d.key) ?? d.value,
        })));

        this.isLoading.set(false);
      },
      error: () => {
        this.coinSettings.set([...DEFAULT_COIN_SETTINGS]);
        this.xpSettings.set([...DEFAULT_XP_SETTINGS]);
        this.isLoading.set(false);
      },
    });
  }

  saveAll(): void {
    this.isSaving.set(true);
    const allSettings = [
      ...this.coinSettings(),
      ...this.xpSettings()
    ].map(s => ({ key: s.key, value: String(s.value) }));

    this.http.put(`${this.apiUrl}/admin/settings/bulk`, { settings: allSettings }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.savedMsg.set(true);
        // Refresh local cache in SettingsService so front-end instantly aligns
        this.settingsService.loadSettings().subscribe();
        setTimeout(() => this.savedMsg.set(false), 3000);
      },
      error: () => this.isSaving.set(false),
    });
  }
}
