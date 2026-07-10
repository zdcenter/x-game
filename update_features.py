import re

with open("/home/zd/x-game/docs/FEATURES.md", "r") as f:
    content = f.read()

# Insert under "## 🎨 界面与用户体验 (UI/UX)"
new_feature = """
- **极致动效与震动反馈 (Juiciness)**：
  - 接入 Web Haptic API，在消除、撞墙、算错时提供基于力度的物理震动反馈。
  - 基于 TailwindCSS 的 `animate-shake` 全局棋盘震动效果。
  - 全局 `FloatingTextService` 提供华丽的 COMBO 飘字与连对爆击视觉反馈。
  - 结算界面支持动态撒花 (Confetti) 和打破记录时的专属金色粒子大爆炸特效。
"""

content = re.sub(r'(## 🎨 界面与用户体验 \(UI/UX\)\n)', r'\1' + new_feature, content)

with open("/home/zd/x-game/docs/FEATURES.md", "w") as f:
    f.write(content)
