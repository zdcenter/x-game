import re

filepath = "/home/zd/x-game/frontend/src/app/features/leaderboard/leaderboard.component.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update title/subtitle logic
content = content.replace("selectedGame()?.titleKey ? i18n.t(selectedGame()!.titleKey)() : ''", "selectedGameId() === 'global' ? i18n.t('leaderboard.global_desc')() : (selectedGame()?.titleKey ? i18n.t(selectedGame()!.titleKey)() : '')")

# 2. Add 'global' to the game selector
game_selector_target = """<select class="w-full px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                    (change)="onGameChange($event)">"""
game_selector_replacement = """<select class="w-full px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                    (change)="onGameChange($event)">
                <option value="global" [selected]="selectedGameId() === 'global'">
                  🌍 {{ i18n.t('leaderboard.global')() }}
                </option>"""
content = content.replace(game_selector_target, game_selector_replacement)

# 3. Hide filters if 'global'
filters_target = """<!-- Mode selector -->
          <select class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                  (change)="onModeChange($event)">"""
filters_replacement = """<!-- Mode selector -->
          @if (selectedGameId() !== 'global') {
            <select class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                    (change)="onModeChange($event)">"""
content = content.replace(filters_target, filters_replacement)

period_target = """{{ i18n.t('leaderboard.weekly')() }}
            </button>
          </div>
        </div>"""
period_replacement = """{{ i18n.t('leaderboard.weekly')() }}
            </button>
          </div>
          }
        </div>"""
content = content.replace(period_target, period_replacement)

# 4. Update table headers
header_target = """<div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-card)]">
              <div class="col-span-1 text-center">#</div>
              <div class="col-span-5">{{ i18n.t('leaderboard.player')() }}</div>
              <div class="col-span-3 text-right">{{ isTimeType() ? i18n.t('leaderboard.best_time')() : i18n.t('leaderboard.best_score')() }}</div>
              <div class="col-span-3 text-right">{{ i18n.t('leaderboard.plays')() }}</div>
            </div>"""
header_replacement = """<div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-card)]">
              <div class="col-span-1 text-center">#</div>
              <div class="col-span-5">{{ i18n.t('leaderboard.player')() }}</div>
              @if (selectedGameId() === 'global') {
                <div class="col-span-3 text-right">{{ i18n.t('leaderboard.level')() }}</div>
                <div class="col-span-3 text-right">{{ i18n.t('leaderboard.xp')() }}</div>
              } @else {
                <div class="col-span-3 text-right">{{ isTimeType() ? i18n.t('leaderboard.best_time')() : i18n.t('leaderboard.best_score')() }}</div>
                <div class="col-span-3 text-right">{{ i18n.t('leaderboard.plays')() }}</div>
              }
            </div>"""
content = content.replace(header_target, header_replacement)

# 5. Update table rows
row_target = """<!-- Score/Time -->
                <div class="col-span-3 text-right font-mono font-bold text-[var(--color-accent-to)]">
                  @if (isTimeType()) {
                    {{ formatTime(entry.best_time) }}
                  } @else {
                    {{ entry.best_score | number }}
                  }
                </div>
                <!-- Plays -->
                <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                  {{ entry.play_count }}
                </div>"""
row_replacement = """<!-- Score/Time / Level/XP -->
                @if (selectedGameId() === 'global') {
                  <div class="col-span-3 text-right font-mono font-bold text-[var(--color-accent-from)]">
                    Lv.{{ entry.level }}
                  </div>
                  <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                    {{ entry.xp | number }} XP
                  </div>
                } @else {
                  <div class="col-span-3 text-right font-mono font-bold text-[var(--color-accent-to)]">
                    @if (isTimeType()) {
                      {{ formatTime(entry.best_time) }}
                    } @else {
                      {{ entry.best_score | number }}
                    }
                  </div>
                  <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                    {{ entry.play_count }}
                  </div>
                }"""
content = content.replace(row_target, row_replacement)

# 6. Change default selectedGameId
content = content.replace("selectedGameId = signal<string>(GAME_DEFINITIONS[0]?.id ?? 'minesweeper');", "selectedGameId = signal<string>('global');")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated leaderboard.component.ts")
