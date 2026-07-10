import re

with open("/home/zd/x-game/docs/CHANGELOG.md", "r") as f:
    content = f.read()

# insert at the top under # Changelog
new_entry = """
## [2026-07-10] - 🎨 视觉反馈与震动增强 (Juiciness Enhancement)

### ✨ 新功能与视觉增强 (Features & UI Enhancements)
- **全局 Haptic 震动引擎**：新增 `HapticService` 并通过统一接口接入各大游戏。推箱子、数独、数字华容道、Math24等游戏在消除、碰撞、错误时增加了不同力度的震动反馈。
- **动态屏幕抖动 (Screen Shake)**：为多款游戏引入基于 TailwindCSS 的 `.animate-shake` 特效。现在在数独填入冲突数字、推箱子撞墙、Math24算错时，整个棋盘会产生真实的震动反馈。
- **浮动加分特效 (Floating Text)**：新建全局 `FloatingTextService` 及遮罩组件，为俄罗斯方块、Drop2048 等游戏集成华丽的 COMBO 浮动文字特效，为成语连对引入 "🔥 连对 ×N!" 的震撼视觉反馈。
- **结算撒花升级 (Enhanced Confetti)**：重构了 `game-result-overlay` 的撒花逻辑，新增“打破记录 (New Record)”时的专属金色大爆炸特效。
- **修复 Lightsout 棋盘偏移**：修复了关灯游戏 (Lightsout) 棋盘在大屏设备下未水平居中偏左的问题，为其增加了 `mx-auto` 智能居中约束。
"""

content = re.sub(r'# Changelog\n', '# Changelog\n' + new_entry, content)

with open("/home/zd/x-game/docs/CHANGELOG.md", "w") as f:
    f.write(content)
