# Changelog

## [Unreleased]
- Added Tetris (俄罗斯方块异盘乱斗), with Single Player and PK Attack mode
- Included SVG icons for tetris board
- Updated i18n
- Fixed Tetris main board layout height collapsing bug by wrapping it in a relative absolute container chain
- **统一所有游戏 PK 模式的"再来一局"与"解散房间"功能**：
  - 修复扫雷 PK 模式"再来一局"按钮无效的 Bug（协议字段 `action` 应为 `type`）
  - 为所有游戏 Store（扫雷、俄罗斯方块、六边形、数字华容道、数独）统一添加 `dismissRoom()` 方法
  - 所有组件的 `dismissRoom()` 确认弹窗统一改用 i18n 多语言翻译，消灭硬编码英文
  - 添加 `game.restart` 和 `game.dismiss_room` 翻译键（中/英双语）
  - 大厅房间列表的"解散"按钮现在仅对房主可见
