const fs = require('fs');
const path = require('path');

// 1. Define game.hexa.seo_desc for all 8 languages (Layer 1: Quick rules, <kbd> table, scoring, assistant)
const seoDescMap = {
  zh: `<h2>六边形消除核心规则与三向消除目标</h2><p>六边形消除（Hexa Puzzle）是一款突破传统方块消除维度的经典几何逻辑解谜游戏。与俄罗斯方块等传统四方格不同，游戏在一个由 <strong>61 个正六边形小格</strong>组成的巨大蜂窝棋盘（半径 $R=4$）中展开。由于六边形独特的空间各向同性，棋盘拥有史无前例的 <strong>3 个维度的消除方向</strong>（水平方向、左斜 60° 方向、右斜 120° 方向），共有 27 条潜在消除轨道。您的目标是将下方候选积木巧妙嵌入蜂窝，实现多维消除并冲击最高分：</p><ul><li><strong>蜂窝全景棋盘</strong>：半径为 4 的正六角形结构，中心格具有最高的连通度与三轴交叉权重。</li><li><strong>候选积木机制</strong>：系统每次在下方生成 3 个由六边形组合而成的异形积木，积木<strong>无法旋转</strong>，极为考验宏观预判能力。</li><li><strong>填满即消</strong>：棋盘上任意一条线（包含 5 至 9 个六边形）被完全填满时，整条线上的方块瞬间碎裂消除并释放空间。</li><li><strong>终局判定</strong>：当棋盘上的剩余空间无法容纳下方现存的任意一个积木时，对局立即结束。</li></ul><h2>全平台操作方式与快捷键指南</h2><p>为了让您在桌面键鼠或手机触屏上均能享受丝滑拼嵌手感，Puzzle PK 提供全端响应式操作支持：</p><table><thead><tr><th>操作方式</th><th>快捷键 / 手势</th><th>功能说明</th></tr></thead><tbody><tr><td><strong>积木拖拽放置</strong></td><td>鼠标左键按住拖拽 / 触屏单指按压拖拽</td><td>将下方 3 个候选积木拖移至蜂窝网格上空释放即可完成拼嵌</td></tr><tr><td><strong>智能虚影吸附</strong></td><td>拖拽悬停于合法位置</td><td>棋盘自动显现半透明高亮吸附虚影，辅助精准对齐，绝不误放</td></tr><tr><td><strong>触屏防遮挡视差</strong></td><td>移动端单指轻触拖拽</td><td>专享指尖上方视觉偏移算法，保证手指在滑动时不会遮挡落点</td></tr><tr><td><strong>快速重新开局</strong></td><td>键盘 <kbd>R</kbd> 键</td><td>单机练习模式下立即重新开局，一键重置蜂窝残局</td></tr></tbody></table><h2>计分系统与超级连击指数</h2><p>掌握指数级多线消除与连击机制是突破万分大关的核心密码：</p><ul><li><strong>基础放置积分</strong>：每成功将一个积木放置到棋盘上，每个六边形小方块均可获得 <strong>+5 分</strong>。</li><li><strong>多线同消爆炸暴击</strong>：同时消除多条直线可触发指数级乘数加成：
  <ul>
    <li>单线消除（1 Line）：获得 <strong>100 分</strong></li>
    <li>双线同消（2 Lines）：获得 <strong>350 分</strong>（3.5倍加成）</li>
    <li>三线同消（3 Lines）：获得 <strong>900 分</strong>（9倍超绝暴击）</li>
    <li>四线同消（4 Lines）：获得 <strong>2,000 分</strong>（20倍巅峰暴击）</li>
    <li>五线同消（5+ Lines）：获得 <strong>3,500+ 分</strong></li>
  </ul>
</li><li><strong>连击倍率乘数（Combo Multiplier）</strong>：连续每次落子均达成消除时，连击数逐次递增，每次额外获得 <strong>+0.5× 乘数</strong>（第1次 1.0×，第2次 1.5×，第3次 2.0×，第4次 2.5×，5连击以上高达 3.0×+）。</li><li><strong>全盘清空完美奖（All Clear）</strong>：若一次消除将整张棋盘完全清空为零方块，额外狂揽 <strong>+1,500 分</strong> 终极奖励！</li></ul><h2>多人实时对决 (PK) 模式</h2><p>告别单机单调刷分，进入在线竞技大厅开启手速与大局观的巅峰较量：</p><ul><li><strong>同构绝对公平竞技</strong>：所有房间内选手面临<strong>完全相同的初始随机种子与积木生成序列</strong>。</li><li><strong>实时积分与连击看板</strong>：顶部 PK 仪表盘毫秒级同步对手的实时得分与连击状态，压迫感十足。</li><li><strong>极限生存积分赛</strong>：在相同险峻的积木掉落面前，比拼谁能活得更久、打出更高阶的多线同消与连击，最终积分最高者荣获胜局。</li></ul><h2>高频新手疑问解答 (FAQ)</h2><h3>为什么游戏中的积木不能旋转？</h3><p>积木无法旋转是六边形消除最精妙的核心规则所在。固定的朝向要求玩家在面对 3 条消除轴时，必须依靠全局宏观视角去寻找最契合的拼插位置，这一规则设计正是消除游戏策略深度的基石。</p><h3>为什么到了后期总是猝不及防 Game Over？</h3><p>绝大部分新手在崩盘前都犯了“忽视大体积积木”和“堵塞中心区域”的致命失误。时刻保持中心十字地带的通透度，并在每一步前观察下方全部 3 个候选积木，是持久生存的关键。</p>`,

  en: `<h2>Objective & 3-Axis Mechanics of Hexa Puzzle</h2><p>Hexa Puzzle is an innovative spatial logic puzzle game that breaks free from traditional 2D orthogonal block matching. Played on an expansive honeycomb board of <strong>61 hexagonal cells</strong> (radius $R=4$), it introduces an unprecedented <strong>3 elimination axes</strong> (horizontal, left-diagonal 60°, right-diagonal 120°) encompassing 27 potential clear paths. Your objective is to place randomized hexagonal pieces onto the board, complete full lines across any of the three directions, and achieve astronomical high scores:</p><ul><li><strong>Hexagonal Geometry</strong>: A radius-4 regular hexagon grid where the central cells carry the highest connectivity and triple-axis clearance impact.</li><li><strong>Piece Staging</strong>: The system generates 3 randomized multi-hex blocks at a time. Blocks <strong>cannot be rotated</strong>, requiring tactical spatial planning and forward foresight.</li><li><strong>Line Elimination</strong>: Completely filling any line from edge to edge (5 to 9 hexes in length) triggers instant destruction and frees up vital board space.</li><li><strong>Game Over Condition</strong>: When no remaining space on the board can accommodate any of the currently available pieces, the game concludes.</li></ul><h2>Complete Controls & Keyboard Shortcuts Guide</h2><p>Engineered for seamless handling on desktop mice and mobile touchscreens alike, Puzzle PK provides zero-latency responsive controls:</p><table><thead><tr><th>Action</th><th>Key / Gesture</th><th>Description</th></tr></thead><tbody><tr><td><strong>Drag & Place Piece</strong></td><td>Left-click drag / Touch drag</td><td>Drag any of the 3 staging pieces onto the honeycomb board to place it</td></tr><tr><td><strong>Smart Ghost Snap</strong></td><td>Hover over valid cells</td><td>Displays a translucent snapping silhouette to preview placement alignment</td></tr><tr><td><strong>Touch Parallax Offset</strong></td><td>Single-finger mobile drag</td><td>Lifts the piece above your fingertip to ensure clear line-of-sight during touch play</td></tr><tr><td><strong>Quick Restart</strong></td><td>Keyboard <kbd>R</kbd> Key</td><td>Instantly re-generates and resets the board in single-player practice mode</td></tr></tbody></table><h2>Scoring Mechanics & Exponential Combo Scaling</h2><p>Understanding exponential multiline points and continuous combo streaks is the secret to smashing high score leaderboards:</p><ul><li><strong>Base Placement Score</strong>: Placing any piece awards <strong>+5 points</strong> per individual hexagonal unit tile.</li><li><strong>Multiline Clearance Multipliers</strong>: Clearing multiple lines in a single placement triggers exponential score boosts:
  <ul>
    <li>1 Line Clear: <strong>100 pts</strong></li>
    <li>2 Lines Clear: <strong>350 pts</strong> (3.5× bonus)</li>
    <li>3 Lines Clear: <strong>900 pts</strong> (9× massive burst)</li>
    <li>4 Lines Clear: <strong>2,000 pts</strong> (20× epic combo)</li>
    <li>5+ Lines Clear: <strong>3,500+ pts</strong></li>
  </ul>
</li><li><strong>Consecutive Combo Multiplier</strong>: Clearing lines on consecutive turns increments your combo counter, adding <strong>+0.5× multiplier per streak</strong> (1st: 1.0×, 2nd: 1.5×, 3rd: 2.0×, 4th: 2.5×, 5+: 3.0×+).</li><li><strong>All Clear Perfect Bonus</strong>: Wiping the entire board clean of all placed tiles awards an instant <strong>+1,500 points</strong> bonus!</li></ul><h2>Real-Time Multiplayer PK Mode</h2><p>Elevate your puzzle gaming into competitive eSports within our real-time PvP arena:</p><ul><li><strong>Identical Random Seed</strong>: All competitors in the room receive the <strong>exact same sequence of staged pieces</strong> for 100% fair competition.</li><li><strong>Live Score & Combo HUD</strong>: Real-time opponent synchronization tracks rival scores, combo streaks, and board density.</li><li><strong>Survival Score Duel</strong>: Navigate the same treacherous piece sequences, pull off devastating multiline combos, and survive the longest to claim victory!</li></ul><h2>Frequently Asked Questions (FAQ)</h2><h3>Why are pieces fixed and unable to rotate?</h3><p>Fixed orientation is the deliberate mathematical soul of Hexa Puzzle. With three elimination axes, rotation would trivialize spatial puzzle-solving; fixed orientation challenges players to balance horizontal and diagonal clearances with genuine strategic depth.</p><h3>Why do boards suddenly become unplayable late in the game?</h3><p>Sudden lockouts almost always stem from congesting the central hexagonal zone or ignoring large triangle/diamond pieces in the staging tray. Maintaining a clear central hub and always reserving parking pockets for 4-tile shapes ensures long-term survival.</p>`,

  es: `<h2>Objetivo y Mecánicas de Hexa Puzzle (Eliminación Hexagonal)</h2><p>Hexa Puzzle es un juego de lógica geométrica espacial con un tablero de <strong>61 casillas hexagonales</strong> (radio $R=4$). A diferencia de los bloques clásicos, ofrece <strong>3 ejes de eliminación</strong> (horizontal y dos diagonales a 60° y 120°), totalizando 27 líneas de despeje. Su objetivo es colocar las piezas proporcionadas, completar líneas enteras y conseguir la máxima puntuación antes de quedarse sin espacio.</p><h2>Guía de Controles y Atajos</h2><table><thead><tr><th>Acción</th><th>Control / Tecla</th><th>Descripción</th></tr></thead><tbody><tr><td><strong>Arrastrar Ficha</strong></td><td>Clic izquierdo o toque táctil</td><td>Arrastra cualquiera de las 3 piezas al tablero hexagonal</td></tr><tr><td><strong>Previsualización</strong></td><td>Puntero sobre posición válida</td><td>Muestra la silueta traslúcida exacta donde encajarán los hexágonos</td></tr><tr><td><strong>Desfase Táctil</strong></td><td>Arrastre con dedo en móviles</td><td>Eleva la pieza por encima del dedo para evitar tapar la vista</td></tr><tr><td><strong>Reinicio Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Reinicia instantáneamente la partida en solitario</td></tr></tbody></table><h2>Sistema de Puntos y Multiplicadores de Combo</h2><ul><li><strong>Puntos de Colocación</strong>: +5 puntos por cada hexágono colocado.</li><li><strong>Líneas Múltiples Simultáneas</strong>: 1 línea = 100 pts, 2 líneas = 350 pts (3.5x), 3 líneas = 900 pts (9x), 4 líneas = 2000 pts (20x).</li><li><strong>Multiplicador de Combo</strong>: Eliminar líneas consecutivamente añade +0.5x al multiplicador (1.0x, 1.5x, 2.0x...).</li><li><strong>All Clear (Tablero Vacío)</strong>: Bonificación de +1,500 puntos por limpiar el tablero por completo.</li></ul>`,

  ja: `<h2>六角形パズル（Hexa Puzzle）のルールと3方向消去の仕組み</h2><p>六角形パズル（Hexa Puzzle）は、ハニカム構造のボード（半径 $R=4$、計61マス）を舞台にした革新的なブロック消去パズルです。従来の四角形パズルとは異なり、<strong>水平方向、左斜め60°方向、右斜め120°方向の3つの軸</strong>（全27ライン）でブロックを並べて消去します。提供されるピースは<strong>回転不可</strong>であるため、高度な空間計画力と先読みが求められます。</p><h2>全プラットフォーム操作ガイド＆ショートカット</h2><table><thead><tr><th>操作</th><th>キー / 操作方法</th><th>機能説明</th></tr></thead><tbody><tr><td><strong>ピース配置</strong></td><td>ドラッグ＆ドロップ（マウス/タッチ）</td><td>下の3つのピースをボード上の空きマスにドラッグして配置</td></tr><tr><td><strong>ゴーストプレビュー</strong></td><td>配置可能位置にホバー</td><td>配置可能なマスが半透明でハイライトされ、正確な配置を補助</td></tr><tr><td><strong>視差オフセット</strong></td><td>スマホ・タブレット操作時</td><td>指先で視界が遮られないよう、ピースが少し上に浮いて追従</td></tr><tr><td><strong>クイックリスタート</strong></td><td>キーボード <kbd>R</kbd></td><td>ソロモードで盤面を瞬時に再スタート</td></tr></tbody></table><h2>得点システムと超連鎖コンボ</h2><ul><li><strong>基本配置点</strong>：配置した六角形セル1つにつき <strong>+5点</strong>。</li><li><strong>複数ライン同時消去ボーナス</strong>：1ライン=100点、2ライン=350点（3.5倍）、3ライン=900点（9倍）、4ライン=2,000点（20倍）。</li><li><strong>コンボ倍率</strong>：手番ごとに連続消去を達成するたび、倍率が +0.5x ずつ増加（1.0x、1.5x、2.0x...）。</li><li><strong>オールクリア（全消し）</strong>：盤面上の全ブロックを完全に消去すると <strong>+1,500点</strong> の特大ボーナス！</li></ul>`,

  ko: `<h2>헥사 퍼즐 (Hexa Puzzle) 규칙과 3방향 제거 메커니즘</h2><p>헥사 퍼즐은 61개의 육각형 셀(반지름 $R=4$)로 구성된 벌집 모양 보드에서 펼쳐지는 기하학적 블록 퍼즐입니다. 일반 사각 블록과 달리 <strong>수평, 좌측 대각선, 우측 대각선 등 총 3가지 방향(27개 라인)</strong>으로 줄을 완성해 터뜨릴 수 있습니다. 주어지는 블록은 <strong>회전이 불가능</strong>하므로 전략적인 배치와 공간 관리가 필수입니다.</p><h2>전체 조작법 및 단축키 안내</h2><table><thead><tr><th>조작</th><th>단축키 / 제스처</th><th>기능 설명</th></tr></thead><tbody><tr><td><strong>블록 드래그</strong></td><td>마우스 좌클릭 드래그 / 터치 드래그</td><td>하단 3개의 블록을 보드의 빈 셀로 끌어다 놓아 배치</td></tr><tr><td><strong>고스트 미리보기</strong></td><td>올바른 위치에 호버</td><td>반투명 가이드 실루엣으로 정확한 안착 위치 표시</td></tr><tr><td><strong>터치 오프셋</strong></td><td>모바일 단일 손가락 조작</td><td>손가락이 블록을 가리지 않도록 핑거 오프셋 자동 적용</td></tr><tr><td><strong>빠른 재시작</strong></td><td>키보드 <kbd>R</kbd> 키</td><td>싱글 플레이 연습 시 즉시 판을 초기화하고 재시작</td></tr></tbody></table><h2>점수 체계 및 콤보 보너스</h2><ul><li><strong>배치 점수</strong>: 블록 내 육각형 타일 1개당 <strong>+5점</strong> 획득.</li><li><strong>다중 라인 동시 클리어</strong>: 1줄 100점, 2줄 동시 350점(3.5배), 3줄 동시 900점(9배), 4줄 동시 2,000점(20배).</li><li><strong>연속 콤보 배율</strong>: 매 턴 연속 제거 시마다 <strong>+0.5배율</strong> 추가 누적 (1.0배, 1.5배, 2.0배...).</li><li><strong>올 클리어 (All Clear)</strong>: 보드의 모든 블록을 완전히 비우면 <strong>+1,500점</strong> 보너스 획득!</li></ul>`,

  pt: `<h2>Objetivo e Mecânicas do Hexa Puzzle</h2><p>Hexa Puzzle é um desafio de raciocínio geométrico jogado em uma grade colmeia de <strong>61 células hexagonais</strong> (raio $R=4$). Com <strong>3 eixos de eliminação</strong> (horizontal e duas diagonais a 60° e 120°), oferece 27 linhas possíveis para limpar. As peças <strong>não podem ser rotacionadas</strong>, exigindo excelente visão espacial.</p><h2>Guia de Controles e Atalhos</h2><table><thead><tr><th>Ação</th><th>Controle / Tecla</th><th>Descrição</th></tr></thead><tbody><tr><td><strong>Arrastar Peça</strong></td><td>Clique ou toque e arraste</td><td>Posiciona uma das 3 peças na colmeia</td></tr><tr><td><strong>Sombra Fantasma</strong></td><td>Pairar sobre posição válida</td><td>Exibe silhueta translúcida para alinhamento perfeito</td></tr><tr><td><strong>Offset Touch</strong></td><td>Arrasto no celular</td><td>Eleva a peça para que o dedo não bloqueie a visualização</td></tr><tr><td><strong>Reinício Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Reinicia o tabuleiro solo instantaneamente</td></tr></tbody></table><h2>Pontuação e Combos</h2><ul><li><strong>Pontos por Peça</strong>: +5 pontos por hexágono posicionado.</li><li><strong>Linhas Simultâneas</strong>: 1 linha = 100 pts, 2 linhas = 350 pts (3.5x), 3 linhas = 900 pts (9x), 4 linhas = 2000 pts (20x).</li><li><strong>Multiplicador de Combo</strong>: Cada rodada consecutiva com eliminação soma +0.5x ao multiplicador.</li><li><strong>All Clear</strong>: Limpeza total do tabuleiro concede +1.500 pontos de bônus!</li></ul>`,

  fr: `<h2>Objectif et Règles de Hexa Puzzle</h2><p>Hexa Puzzle est un jeu de réflexion géométrique sur une grille en nid d'abeille de <strong>61 hexagones</strong> (rayon $R=4$). Doté de <strong>3 axes d'élimination</strong> (horizontal et diagonales à 60° et 120°), il propose 27 lignes destructibles. Les pièces sont <strong>non orientables</strong>, ce qui exige une vision stratégique à long terme.</p><h2>Guide des Contrôles et Raccourcis</h2><table><thead><tr><th>Action</th><th>Contrôle / Touche</th><th>Description</th></tr></thead><tbody><tr><td><strong>Glisser la Pièce</strong></td><td>Clic gauche ou toucher tactile</td><td>Déplace l'une des 3 pièces vers le plateau</td></tr><tr><td><strong>Aperçu Fantôme</strong></td><td>Survol d'un emplacement valide</td><td>Affiche la silhouette en surbrillance pour viser précisément</td></tr><tr><td><strong>Offset Tactile</strong></td><td>Glissement sur mobile</td><td>Décalage vers le haut pour ne pas masquer la pièce avec le doigt</td></tr><tr><td><strong>Recommencer</strong></td><td>Touche <kbd>R</kbd></td><td>Relance instantanément le plateau en mode solo</td></tr></tbody></table><h2>Système de Score et Combos</h2><ul><li><strong>Placement</strong> : +5 points par hexagone placé.</li><li><strong>Lignes Multiples</strong> : 1 ligne = 100 pts, 2 lignes = 350 pts (3.5x), 3 lignes = 900 pts (9x), 4 lignes = 2000 pts (20x).</li><li><strong>Multiplicateur de Combo</strong> : Chaque tour consécutif avec destruction ajoute +0.5x.</li><li><strong>All Clear</strong> : Vider entièrement le plateau rapporte +1 500 points de bonus !</li></ul>`,

  de: `<h2>Ziel und Grundregeln von Hexa Puzzle</h2><p>Hexa Puzzle ist ein innovatives Block-Puzzle auf einem Waben-Spielfeld mit <strong>61 sechseckigen Feldern</strong> (Radius $R=4$). Mit <strong>3 Abbau-Achsen</strong> (horizontal sowie zwei Diagonalen im 60°- und 120°-Winkel) verfügt das Spiel über 27 Abräum-Linien. Die Teile können <strong>nicht rotiert</strong> werden, was exzellente räumliche Vorausplanung erfordert.</p><h2>Steuerung und Tastatur-Leitfaden</h2><table><thead><tr><th>Aktion</th><th>Steuerung / Taste</th><th>Beschreibung</th></tr></thead><tbody><tr><td><strong>Teil platzieren</strong></td><td>Klicken oder Wischen & Ziehen</td><td>Zieht eines der 3 Teile auf das Wabenfeld</td></tr><tr><td><strong>Geister-Vorschau</strong></td><td>Über gültigem Feld halten</td><td>Zeigt halbtransparente Ausrichtungshilfe</td></tr><tr><td><strong>Finger-Offset</strong></td><td>Touch-Steuerung auf Smartphones</td><td>Versetzt das Teil leicht nach oben, um den Fingerblick freizuhalten</td></tr><tr><td><strong>Schnell-Neustart</strong></td><td>Taste <kbd>R</kbd></td><td>Startet das Solo-Spielbrett sofort neu</td></tr></tbody></table><h2>Punktesystem & Combo-Multiplikatoren</h2><ul><li><strong>Platzierungspunkte</strong>: +5 Punkte pro platziertem Hexagon.</li><li><strong>Mehrfach-Linien</strong>: 1 Linie = 100 Pkt, 2 Linien = 350 Pkt (3.5x), 3 Linien = 900 Pkt (9x), 4 Linien = 2000 Pkt (20x).</li><li><strong>Combo-Multiplikator</strong>: Jede aufeinanderfolgende Runde mit Linienabbau erhöht den Faktor um +0.5x.</li><li><strong>All Clear</strong>: Vollständiges Leeren des gesamten Bretts bringt +1.500 Punkte Bonus!</li></ul>`
};

// 2. Define deep 7-chapter guides for games-docs.json for all 8 languages (Layer 2)
const hexaDocsRules = {
  zh: `# 六边形消除 (Hexa Puzzle) 终极通关宝典与蜂窝几何消除全书

欢迎来到 Puzzle PK 官方深度解谜与高阶战术指南。六边形消除（Hexa Puzzle）是一款将经典方块消除理念与非欧几何蜂窝平铺（Hexagonal Tiling）融为一体的现代益智游戏。与传统的二维笛卡尔四方格（如俄罗斯方块、1010）不同，正六边形具有各向同性对称性与高达 3 个独立消除维度。本教程将从底层蜂窝几何拓扑出发，深入解析三维立方体坐标系、不可旋转积木拓扑、空间管理四大公理、多线同消交织引爆点，以及多人实时竞技生存模式（PvP Survival Duel）下的顶尖控盘战术。

---

## 第一章：蜂窝几何学基础与三维立方体坐标系

### 1.1 正六边形平铺的数学优越性
在几何学中，能实现二维平面无缝正镶嵌（Regular Tiling）的凸正多边形仅有三种：正三角形 $\\{3, 6\\}$、正方形 $\\{4, 4\\}$ 与正六边形 $\\{6, 3\\}$。在这三者中，正六边形具有**最高的周长面积比与各向同性（Isotropic）对称性**——每一个正六边形与周围恰好 6 个相邻单元格共享整条边，不存在四方格中“顶角相接但边不相接”的奇异邻域。

### 1.2 三维立方体坐标系（Cube Coordinates）
为了精确描述与计算蜂窝棋盘，计算机图形学与算法领域采用优雅的立方体坐标系 $(q, r, s)$：
$$q + r + s = 0$$
每一个六边形单元格的唯一位置均由满足上式的三个整数决定。
- 棋盘半径设为 $R = 4$（从中心格向外延伸 4 层）。
- 全盘单元格总数计算公式为：
  $$N(R) = 1 + 3R(R + 1) = 1 + 3 \\times 4 \\times 5 = 61 \\text{ 个六边形单元格}$$

### 1.3 三大消除轴线的代数方程与 27 条消除轨道
正是这套立方体坐标系赋予了游戏史无前例的 3 轴全景消除机制：
1. **$q$ 轴方向（左斜下 60°）**：满足 $q = c$ 的单元格连线，共有 $2R + 1 = 9$ 条直线。
2. **$r$ 轴方向（右斜下 120°）**：满足 $r = c$ 的单元格连线，共有 9 条直线。
3. **$s$ 轴方向（水平横向 0°）**：满足 $s = c$ 的单元格连线，共有 9 条直线。
- **轨道长度分布**：最外侧边界轨道长度为 5 格，向中心逐层递增，穿过中心 $(0, 0, 0)$ 的三条最长中轴线长度达到 9 格。
- **中心极值定理**：中心单元格 $(0, 0, 0)$ 是全盘唯一同时属于三条 9 格最长轴线的核心锚点。它的存亡直接决定了整个棋盘的连通度。

---

## 第二章：候选积木形态拓扑与不可旋转约束

### 2.1 为什么“不可旋转”是六边形消除的灵魂？
初学者常常疑惑：为什么游戏不提供旋转按钮？
- **数学本质**：一旦允许自由旋转，玩家遇到卡手积木时只需将其无脑旋转至单方向即可化解危机，三轴几何约束的博弈深度将瞬间坍塌 80% 以上。
- **不可旋转的设计目标**：强迫玩家接受“形态各向异性（Anisotropy）”，在脑海中建立全局拓扑映射，寻找与当前棋盘空隙完美啮合的拼插角度。

### 2.2 核心积木分类与威胁度评级（Tier List）
1. **S 级（万能救火型）**：
   - **单核单格（Single Hex）**：全场最宝贵的战略积木，可以无视任何障碍填补任何狭小孔洞或触发临门一脚的消除。
   - **双联体（Double Hex）**：极具灵活度，无论在水平或斜向轨道均有充沛容差。
2. **A 级（长轴突击型）**：
   - **3 连条与 4 连条（Lines）**：定向冲刺轴线的强力武器，能在瞬间填满半条甚至整条轨道，但当对应方向缺乏纵深时易造成卡死。
3. **B 级（转角骨架型）**：
   - **钝角与锐角折线（V-Shapes / Angles）**：同时跨越两个不同轴向，通常用于构建外边缘的咬合结构。
4. **C 级（致命威胁型 - 高危卡手积木）**：
   - **大三角形（Large Triangle，3格或6格）**与**密集菱形（Rhombus）**：面积庞大、占地密集。一旦棋盘中央缺乏连续的开阔平底，大三角形将瞬间无法放入，直接导致猝不及防的 Game Over！

---

## 第三章：空间管理四大公理（The Four Axioms of Hexa Space Management）

### 3.1 公理 1：中央圣地法则（The Sacred Center Rule）
**棋盘正中心的 7 颗核心六边形，永远优先保持通透！**
- 许多新手习惯将大块积木直接拍在棋盘正中央，认为这样“最稳”。这是最致命的直觉陷阱！
- 将大积木置于中心，会同时切断横向、左斜、右斜三条跨越全盘的核心 9 格轨道，棋盘瞬间被肢解为互相孤立的外围碎角。
- 正确策略：中心区域只允许作为多线同时引爆的“发射台”，一旦完成消除必须立即重新腾空。

### 3.2 公理 2：边缘贴靠与凹槽填充法则（Edge Anchoring）
- **顺边贴放**：所有体积较大的 3 连块、折角块和大三角形，必须尽可能顺着棋盘的 6 条外边缘靠拢放置。
- **平滑边缘**：利用外边界自然的平角吸收不规则凸起，避免在棋盘内部人为制造出“深度为 1 且四周被包围”的“盲孔（Blind Pockets）”。

### 3.3 公理 3：三块统筹法则（The Three-Piece Lookahead Principle）
**严禁“看到第一块就立刻丢下去”的单步思维！**
- 系统每次发放 3 个候选积木。在落子前，必须花 2 秒钟通盘审视这 3 个形状的组合：
  1. 哪个是最大、最难放下的“威胁块”？
  2. 棋盘上目前是否存在能够容纳该威胁块的唯一合法坑位？
  3. 如果有，必须先确保该坑位不被其他两块意外破坏；或者先用小块引发一次消除，为该威胁块开辟新空间！

### 3.4 公理 4：留白弹性与危险阈值（Space Buffer Axiom）
- 棋盘总容量为 61 格。当棋盘已占用格数达到 **42 格以上（填充率超过 70%）** 时，系统进入“红色预警状态”。
- 此时必须立刻中止一切“憋大招（追求多线同消）”的贪心战术，切换为“有单线就立刻消”的求生避险模式，直至已占格子降回 30 格以内。

---

## 第四章：多线同消（Multi-Line Clears）与交织引爆点

### 4.1 超线性计分收益率解析
为什么顶级高手的得分动辄数万，而普通玩家只能在几千分徘徊？
Puzzle PK 的计分引擎采用了**超线性指数级阶梯**：
- 消除 1 条线：基础分 100
- 消除 2 条线：基础分 350（单线收益的 3.5 倍）
- 消除 3 条线：基础分 900（单线收益的 9.0 倍）
- 消除 4 条线：基础分 2,000（单线收益的 20.0 倍！）
**结论：达成一次 4 线同消获得的积分，相当于辛辛苦苦单线消除 20 次的总和！**

### 4.2 构造三向交织引爆点（Triple-Axis Crossroads）
想要打出 3 线乃至 4 线同消，核心在于寻找并经营**交叉引爆点**：
1. **选定枢纽格 $(q_0, r_0, s_0)$**：例如中心格 $(0, 0, 0)$ 或次中心环格。
2. **铺设引信轨道**：
   - 在水平轴向留出该格作为唯一缺口，将该水平线其他格子全部填满；
   - 在左斜轴向同样将其他格子填满，唯独留下该交点格；
   - 在右斜轴向重复同样操作。
3. **一子落盘，三线轰塌**：
   - 当单颗六边形或恰好包含该交点的积木放入时，三个不同方向的判定逻辑在同一帧全部达成满格！
   - 伴随着清脆的爆炸音效，3 条线瞬间灰飞烟灭，狂揽 900 分基础分与连击乘数！

---

## 第五章：连续连击（Combo Chains）的运营艺术

### 5.1 连击倍率计算公式
连续落子触发消除时，连击计数器 $K$ 持续递增，并附加极其恐怖的乘数：
$$\\text{Multiplier}(K) = 1 + (K - 1) \\times 0.5$$
- 1 连击：$1.0\\times$
- 2 连击：$1.5\\times$
- 3 连击：$2.0\\times$
- 4 连击：$2.5\\times$
- 5 连击及以上：$3.0\\times \\sim 5.0\\times$！
若在 4 连击状态下触发一次双线消除，得分直接飙升为 $350 \\times 2.5 = 875$ 分！

### 5.2 “小火慢炖”蓄水池控盘法
- 高手绝不在第一回合就急忙把所有线条全部清空。
- 懂得控盘的玩家会故意让多条轨道维持在“差一格即满”的蓄水池状态。
- 下方给出的 3 个积木，分别负责“完成一条消除”、“继续蓄力下一条”、“再次触发消除”，将 Combo 链条稳定维持在 6 连击以上。

---

## 第六章：多人实时 PK 竞技生存策略 (PvP Survival Duel)

### 6.1 同构种子与绝对实力博弈
在 Puzzle PK 在线对战大厅中，所有选手在开局时共享**完全相同的随机乱序种子**。这意味着所有人面对的初始棋盘空位、前 50 手掉落的积木形态与先后顺序分毫不差。没有任何运气成分，胜负完全建立在空间管理与做局技巧上。

### 6.2 比赛节奏把控与心理博弈
1. **前期抢攻开局**：前 15 步棋盘空旷时，尽可能以最快手速布局并完成 2 次以上的双线/三线消除，将积分迅速拉开至 2000 分以上，对对手施加心理压迫。
2. **中后期盯防与节奏放缓**：
   - 顶部 PK HUD 会实时显示对手的得分与连击状态。
   - 当发现对手分数逼近时，切忌盲目乱放；当棋盘饱和时，生存优先于分数，谁能多苟活两轮积木，谁就能直接锁定胜局！

---

## 第七章：高频疑难解答与大师进阶诊断 (FAQ)

### Q1: 移动端单指拖拽时，总是感觉看不清手指正下方的位置怎么办？
答：Puzzle PK 专门研发了**智能视差偏移（Touch Parallax Offset）算法**。在触屏设备上按住积木拖拽时，积木在视觉上会自动向上悬浮偏移约 30px 到 50px，避开指尖遮挡区域。请以屏幕上方的半透明高亮虚影作为吸附落点基准，松手即可精准入格。

### Q2: 为什么我某条线明明看着填满了，系统却没有消除？
答：六边形消除要求**从棋盘的一端边界到另一端边界必须全线贯通**。例如中心横向线全长共有 9 个六边形，如果其中有一格漏填（或者该行实际上属于倾斜轨道的边缘截断），将无法触发判定。请观察虚线延伸方向，确保整条几何跨度 100% 满格。

### Q3: 全盘清空（All Clear）真的能达成吗？
答：完全可以！在开局前 10 步或残局经过精巧的多线同消设计时，经常能实现全盘清零。系统内置了特殊的 **All Clear 判定**，一旦棋盘所有 61 个单元格全部恢复为空白，系统将一次性赠送 **+1,500 分** 的超级成就积分！

### Q4: 怎样稳定突破 15,000 分高手大关？
答：
- 养成“中心必须空、大块靠边贴、看三步走一步”的肌肉记忆；
- 杜绝一切单线散装消除，尽量以双线同消起步；
- 维持 4 连击以上的稳定 Combo 节奏。按照此法则练习 3 局以上，万分大关唾手可得。`,

  en: `# The Definitive Guide to Hexa Puzzle: Honeycomb Geometry & Multidimensional Line Clearing

Welcome to the official, authoritative master strategy guide for **Hexa Puzzle** on Puzzle PK. Beyond its surface reputation as a casual, stress-relieving brain teaser, Hexa Puzzle represents one of the most intellectually satisfying intersections of discrete mathematics, non-Euclidean regular tiling, and dynamic spatial resource management.

Unlike orthogonal square-grid games (such as Tetris, 1010, or Block Puzzle), a regular hexagonal lattice possesses isotropic symmetry with **three distinct elimination axes**. This masterclass provides an exhaustive curriculum—spanning cube coordinate geometry, unrotatable polyhex topology, the Four Axioms of Space Management, multi-line intersection traps, and competitive PvP survival dynamics.

---

## Chapter 1: Honeycomb Geometry & Cube Coordinate Mechanics

### 1.1 The Mathematical Elegance of Hexagonal Tiling
In Euclidean plane geometry, exactly three regular polygons can form a monohedral regular tiling: equilateral triangles $\\{3, 6\\}$, squares $\\{4, 4\\}$, and regular hexagons $\\{6, 3\\}$. Among these, the regular hexagon achieves the **optimal perimeter-to-area ratio (isoperimetric quotient)** and perfect isotropic edge-sharing: every single cell shares an identical boundary with exactly 6 immediate neighbors, completely eliminating the corner-point singularities found in square grids.

### 1.2 Cube Coordinates $(q, r, s)$ on a Radius-4 Grid
To rigorously govern piece placement, line scanning, and collision detection, the Hexa engine utilizes three-dimensional **Cube Coordinates**:
$$q + r + s = 0$$
Every cell on the board corresponds to a unique integer triplet satisfying this constraint.
- For our standard board with radius $R = 4$, the total number of cells is derived via the hexagonal centered triangular number formula:
  $$N(R) = 1 + 3R(R + 1) = 1 + 3(4)(5) = 61 \\text{ cells}$$

### 1.3 The 3 Elimination Axes and 27 Traversal Tracks
Cube coordinates naturally generate the three independent linear axes of elimination:
1. **The $q$-Axis (60° Left-Diagonal)**: Lines defined by $q = c$, providing $2R + 1 = 9$ discrete clearing tracks.
2. **The $r$-Axis (120° Right-Diagonal)**: Lines defined by $r = c$, providing 9 discrete tracks.
3. **The $s$-Axis (0° Horizontal)**: Lines defined by $s = c$, providing 9 discrete tracks.
- **Track Length Dynamics**: Outer perimeter lines span 5 cells, while the three diametric lines passing through the origin $(0, 0, 0)$ span 9 cells each.
- **The Center Extremum Theorem**: The central cell $(0, 0, 0)$ is the sole coordinate shared simultaneously by all three 9-cell diametric axes. Securing or congesting the center directly governs the global health of the entire playfield.

---

## Chapter 2: Polyhex Staging Topology & The Rotation-Lock Constraint

### 2.1 The Purpose of Fixed Piece Orientation
Beginners often ask: *Why doesn't the game permit piece rotation?*
- In orthogonal games, rotation is necessary because 2-axis grids offer limited matching angles.
- In a 3-axis hexagonal lattice, allowing rotation trivializes spatial constraints: players could effortlessly align awkward shapes to whichever axis is most convenient, destroying 80% of tactical depth.
- **Fixed orientation** demands true macro planning: players must adapt their board topography to the rigid orientations of incoming polyhexes.

### 2.2 Polyhex Piece Taxonomy & Hazard Rating (Tier List)
1. **Tier S (Universal Fluidity & Rescue)**:
   - **Monochex (Single Cell)**: The supreme tactical asset. Can bridge any isolated gap or trigger crucial last-gasp line clears without space overhead.
   - **Di-hex (2-Cell Bar)**: High flexibility across both horizontal and diagonal planes.
2. **Tier A (Axis Clearing Penetrators)**:
   - **3-Bars & 4-Bars**: Precision weapons capable of completing an entire track in a single placement. High reward, but dangerous if the board lacks longitudinal runway.
3. **Tier B (Boundary Brackets)**:
   - **V-Shapes & Obtuse Angle Braces**: Straddle two intersecting axes; best anchored along exterior perimeters.
4. **Tier C (The Board Killers - High Threat)**:
   - **Triangles (3-cell or 6-cell clusters)** and **Dense Rhombuses**: Enormous footprint and zero concavity. If the center of the board lacks continuous open terrain, these pieces will instantly precipitate Game Over.

---

## Chapter 3: The Four Axioms of Hexa Space Management

### 3.1 Axiom 1: The Sacred Center Rule
**The central 7-cell cluster must remain permanently fluid and breathable.**
- Novice players intuitively place large pieces directly in the center of the board because it feels "safe." This is the single most destructive mistake in Hexa.
- Parking a massive shape in the center fractures all three 9-cell diameter tracks simultaneously, reducing the board into fragmented, disconnected outer pockets.
- The center should only be populated when it serves as the instantaneous catalyst for an immediate multiline clear.

### 3.2 Axiom 2: Perimeter Anchoring & Pocket Prevention
- **Edge Alignment**: Always gravitate awkward triangles, angles, and long bars toward the 6 outer perimeter walls.
- **Convex Integrity**: Match shapes flush against existing walls to prevent creating single-cell blind pockets surrounded on five sides.

### 3.3 Axiom 3: The Three-Piece Lookahead Principle
**Never evaluate a piece in isolation!**
- Before committing your first piece, inspect all 3 staged pieces in the lower tray:
  1. Identify the largest, most unwieldy shape (the "Threat Shape").
  2. Locate an existing pocket capable of holding that Threat Shape.
  3. Ensure your first two placements do not inadvertently disrupt that pocket!

### 3.4 Axiom 4: The Space Buffer Threshold
- When total occupied cells exceed **42 cells (70% capacity)**, enter emergency mode.
- Abandon all ambitions of staging fancy 3-line or 4-line combos; clear single lines immediately until capacity drops below 30 cells.

---

## Chapter 4: Multi-Line Clears & The Architecture of Crossroads

### 4.1 Super-Linear Scoring Dynamics
The scoring engine in Puzzle PK utilizes super-linear exponential scaling:
- 1 Line Clear: 100 points
- 2 Lines Clear: 350 points (3.5× base value)
- 3 Lines Clear: 900 points (9.0× base value)
- 4 Lines Clear: 2,000 points (20.0× base value!)
- 5+ Lines Clear: 3,500+ points
**A single 4-line simultaneous clear awards more raw points than twenty individual 1-line clears combined.**

### 4.2 Engineering the Triple-Axis Crossroads
To execute devastating multiline clears, master players systematically cultivate **Intersection Crossroads**:
1. Select a convergence node $(q_0, r_0, s_0)$, such as the center $(0, 0, 0)$.
2. Fill the horizontal track ($s$-axis) until only the node remains empty.
3. Simultaneously fill the left-diagonal ($q$-axis) and right-diagonal ($r$-axis) up to the threshold.
4. Drop a single piece into the intersection: all three axes clear simultaneously in a glorious 900-point explosion!

---

## Chapter 5: Combo Chains & Flow Momentum

### 5.1 Combo Multiplier Formula
Maintaining consecutive clears across sequential placements activates the Combo Multiplier:
$$\\text{Multiplier}(K) = 1 + (K - 1) \\times 0.5$$
- Combo 1: $1.0\\times$
- Combo 2: $1.5\\times$
- Combo 3: $2.0\\times$
- Combo 4: $2.5\\times$
- Combo 5+: $3.0\\times \\sim 5.0\\times$!
Executing a 2-line clear on Combo 4 yields $350 \\times 2.5 = 875$ points on a single move.

### 5.2 The Staggered Reservoir Method
- Do not clear every ready line at once.
- Stagger your lines so that each placement in your 3-piece turn resolves exactly one line, chaining your combo across multiple turns while keeping the board spacious.

---

## Chapter 6: Multiplayer Real-Time PvP Survival Tactics

### 6.1 Deterministic RNG & Symmetrical Fair Play
In Puzzle PK's competitive arena, all matched players receive the **exact same pseudo-random piece sequence**. There is zero RNG bias: both competitors face identical challenges.

### 6.2 Match Tempo & Tactical Composure
1. **Early Blitz**: Open with aggressive double/triple clears in the first 20 moves to establish a commanding 3,000-point lead.
2. **Endgame Endurance**: When the board inevitably tightens, shift focus from high-risk combo engineering to pure survival. The player who survives one round longer takes the match win.

---

## Chapter 7: Frequently Asked Questions & Master Tips (FAQ)

### Q1: How does the touchscreen offset work?
Puzzle PK implements a custom **Touch Parallax Offset algorithm**. When dragging on mobile devices, the piece renders elevated 35px above your finger contact point so your thumb never obstructs the destination cells. Align via the translucent ghost outline and release.

### Q2: Why didn't my line clear when it looked full?
A line must extend **100% from one outer edge of the board to the opposing outer edge** (between 5 and 9 contiguous hexes). If a single corner or edge hex is empty, the axis is incomplete.

### Q3: Is an "All Clear" achievable?
Yes! Wiping all 61 cells completely clean triggers an **All Clear** achievement, awarding an immediate **+1,500 points** bonus.

### Q4: How do I break the 15,000-point threshold?
- Keep the center 7 cells clear at all costs.
- Never place pieces blindly; plan the destination of all 3 tray pieces before moving the first.
- Prioritize double-line clears over single lines and sustain 4+ combo chains.`,

  es: `# Guía Definitiva de Hexa Puzzle: Geometría de Panal y Estrategia Maestra

Bienvenido a la guía oficial de **Hexa Puzzle (Eliminación Hexagonal)** en Puzzle PK. Este juego trasciende los rompecabezas clásicos al incorporar la geometría isotrópica del panal de abejas y **3 ejes de eliminación simultáneos**.

## Capítulo 1: Geometría Hexagonal y Coordenadas Cúbicas
- **El Tablero de 61 Casillas**: Construido con radio $R=4$, posee exactamente 61 hexágonos ($1 + 3R(R+1)$).
- **Tres Ejes de Eliminación**: A diferencia de los 2 ejes ortogonales clásicos, aquí disponemos de 27 líneas en 3 direcciones (horizontal, diagonal izquierda 60° y diagonal derecha 120°).
- **El Centro Sagrado**: La casilla central $(0,0,0)$ pertenece a las 3 líneas más largas (9 casillas). Mantenerla despejada es vital.

## Capítulo 2: Las Cuatro Reglas de Oro del Espacio
1. **El Centro Sagrado**: Nunca coloque bloques masivos en el centro; romperán los 3 ejes simultáneamente.
2. **Anclaje Perimetral**: Empuje triángulos grandes y piezas en L hacia los 6 bordes exteriores.
3. **Visión de Tres Piezas**: Examine siempre las 3 piezas disponibles antes de mover la primera.
4. **Umbral de Alerta**: Cuando el tablero supere el 70% de ocupación, abandone los combos y limpie líneas individuales para sobrevivir.

## Capítulo 3: Puntuación Exponencial y Duelos PK
- **Líneas Múltiples**: 1 línea = 100 pts, 2 líneas = 350 pts, 3 líneas = 900 pts, 4 líneas = 2.000 pts.
- **Multiplicadores de Combo**: +0.5x por cada eliminación consecutiva.
- **Fair Play en Duelos**: Ambos rivales reciben exactamente la misma secuencia de fichas.`,

  ja: `# 六角形パズル（Hexa Puzzle）完全攻略ガイド：ハニカム幾何学と多次元ライン消去マスタークラス

Puzzle PKがお届けする**六角形パズル（Hexa Puzzle）**の公式マスターガイドです。四角形グリッドの限界を突破したハニカム格子（正六角形タイリング）における**3軸同時消去**の極意を徹底解説します。

## 第1章：ハニカム幾何学と3次元立方体座標系
- **全61マスの正六角形ボード**：半径 $R=4$ の構造で、総マス数は $1 + 3 \\times 4 \\times 5 = 61$ 個。
- **3つの消去軸（全27ライン）**：水平軸、左斜め60°軸、右斜め120°軸が交差します。
- **中央マス $(0, 0, 0)$ の重要性**：全ボード中で唯一、最も長い9マスライン3本が交わる最重要ハブです。

## 第2章：空間管理の4大公理
1. **中央聖域の法則**：中央の7マスには決して巨大ブロックを置かず、常に風通しを良く保つこと。
2. **外周密着の法則**：大きな三角ピースや折れ線ピースは6つの外周に寄せて配置し、内側に孤立した窪みを作らない。
3. **3ピース先読みの法則**：最初の1手を置く前に、必ず手持ちの3ピースすべてを確認し、最大のピースの置き場を確保する。
4. **危険域バッファ**：盤面が70%以上埋まったらコンボ狙いを即座に中止し、単ライン消去で生存を最優先する。

## 第3章：指数関数的スコアとリアルタイムPK対戦
- **多ライン同時消去**：1ライン=100点、2ライン=350点、3ライン=900点、4ライン=2,000点。
- **完全共通シード対戦**：PKアリーナでは対戦相手と全く同じピース順序が供給される完全実力勝負です。`,

  ko: `# 헥사 퍼즐 (Hexa Puzzle) 궁극의 공략: 벌집 기하학 및 3축 다차원 클리어 가이드

Puzzle PK의 **헥사 퍼즐 (Hexa Puzzle)** 공식 마스터 가이드입니다. 2차원 사각 격자를 벗어나 정육각형 타일링의 등방성 대칭과 **3방향 동시 제거 축**의 심오한 수학적 전략을 분석합니다.

## 제1장: 벌집 기하학과 3축 제거 좌표계
- **61셀의 정육각형 보드**: 반지름 $R=4$ 기준, 총 $1 + 3(4)(5) = 61$개의 육각 셀로 구성됩니다.
- **3대 제거 축 (총 27개 라인)**: 수평(0°), 좌측 대각(60°), 우측 대각(120°) 축으로 구성됩니다.
- **중앙 핵심점의 원리**: 정중앙 $(0,0,0)$ 셀은 가장 긴 9셀짜리 3개 축이 모두 교차하는 핵심 관문입니다.

## 제2장: 공간 관리의 4대 공리
1. **중앙 보호의 법칙**: 중앙에 큰 블록을 두면 3개 축이 동시에 마비됩니다. 중앙은 항상 개방해 두어야 합니다.
2. **외곽 밀착의 법칙**: 거대한 삼각형 및 꺾인 블록은 보드의 6개 외곽 모서리에 맞춰 채워 넣습니다.
3. **3개 블록 전체 예측**: 첫 블록을 놓기 전, 주어지는 3개 블록 중 가장 거대한 블록의 안착 위치를 먼저 계산합니다.
4. **생존 버퍼 한계선**: 보드가 70% 이상 차오르면 콤보 욕심을 버리고 즉시 1줄씩 제거해 공간을 확보합니다.

## 제3장: 폭발적인 점수 획득과 실시간 PK 생존전
- **다중 라인 동시 클리어 점수**: 1줄 100점, 2줄 동시 350점, 3줄 동시 900점, 4줄 동시 2,000점!
- **연속 콤보 배율**: 매 턴 연속 제거 시마다 배율 +0.5x씩 폭증 (최대 5.0x).
- **공정 경쟁 PK**: 방 안의 모든 플레이어가 동일한 난수 시드로 완전히 동일한 블록 시퀀스를 플레이합니다.`,

  pt: `# Guia Definitivo do Hexa Puzzle: Geometria em Colmeia e Estratégia de 3 Eixos

Descubra o guia mestre oficial do **Hexa Puzzle** no Puzzle PK. Domine a geometria de 61 hexágonos com 3 eixos simultâneos de eliminação.

## Capítulo 1: Geometria do Tabuleiro e Eixos
- Tabuleiro de 61 células ($R=4$) com 27 linhas possíveis em 3 direções (horizontal e duas diagonais a 60°/120°).
- O centro $(0,0,0)$ é o nó mais valioso do jogo e deve ser preservado.

## Capítulo 2: As 4 Regras de Ouro
1. **Preserve o Centro**: Nunca coloque triângulos gigantes no coração do tabuleiro.
2. **Ancoragem nas Bordas**: Alinhe peças grandes ao longo das 6 paredes externas.
3. **Previsão das 3 Peças**: Planeje a posição da peça mais difícil antes de mover a primeira.
4. **Limite de Sobrevivência**: Se o tabuleiro estiver 70% ocupado, limpe linhas simples imediatamente.

## Capítulo 3: Pontuação e Duelos PK
- Eliminações Múltiplas: 1 linha = 100 pts, 2 linhas = 350 pts, 3 linhas = 900 pts, 4 linhas = 2000 pts.
- Combos sucessivos multiplicam sua pontuação (+0.5x por rodada).
- No modo PK multiplayer, todos recebem as mesmas peças sob o mesmo gerador randômico.`,

  fr: `# Guide Ultime de Hexa Puzzle : Géométrie en Nid d'Abeille et Élimination Tri-Axiale

Bienvenue sur le guide expert officiel de **Hexa Puzzle** sur Puzzle PK. Apprenez à dominer le plateau de 61 cases à travers ses 3 axes d'élimination géométriques.

## Chapitre 1 : Géométrie et Coordonnées Cubiques
- Plateau de 61 hexagones ($R=4$) proposant 27 lignes de destruction sur 3 axes (0°, 60°, 120°).
- Le centre $(0,0,0)$ est l'intersection majeure des trois axes de 9 cases : il doit rester dégagé.

## Chapitre 2 : Les 4 Axiomes de Survie
1. **Sanctuaire Central** : Ne placez jamais de gros triangles au centre sous peine de bloquer tout le plateau.
2. **Ancrage Périphérique** : Alignez les grandes pièces contre les 6 bordures extérieures.
3. **Anticipation des 3 Pièces** : Trouvez toujours l'emplacement de la pièce la plus imposante avant de jouer la première.
4. **Seuil de Danger** : Au-delà de 70 % de remplissage, éliminez sans attendre la moindre ligne disponible.

## Chapitre 3 : Score Exponentiel et Duels PK
- Lignes simultanées : 1 ligne = 100 pts, 2 lignes = 350 pts, 3 lignes = 900 pts, 4 lignes = 2000 pts.
- Système de combo consécutif (+0.5x par coup gagnant).
- Compétition PK équitable avec graine aléatoire identique pour tous les joueurs.`,

  de: `# Ultimativer Leitfaden für Hexa Puzzle: Wabengeometrie & 3-Achsen-Abbau

Willkommen zum offiziellen Meisterleitfaden für **Hexa Puzzle** auf Puzzle PK. Meistern Sie das 61-Felder-Wabenbrett mit seinen 3 gleichberechtigten Abbau-Achsen.

## Kapitel 1: Wabengeometrie und Koordinaten
- Wabenbrett mit 61 Feldern ($R=4$) und 27 Abbau-Linien in 3 Dimensionen (horizontal, 60° und 120°).
- Das Zentrum $(0,0,0)$ verbindet alle drei 9er-Hauptachsen und muss stets flexibel bleiben.

## Kapitel 2: Die 4 Axiome des Raummanagements
1. **Das unantastbare Zentrum**: Platzieren Sie niemals klobige Blöcke mitten im Feld.
2. **Kanten-Verankerung**: Schieben Sie sperrige Dreiecke an die 6 Außenkanten.
3. **Drei-Teile-Vorausschau**: Bestimmen Sie den Platz für das schwierigste Teil, bevor Sie das erste ablegen.
4. **Gefahrenschwelle**: Brechen Sie bei über 70 % Füllung Kombos ab und räumen Sie sofort Einzellinien ab.

## Kapitel 3: Exponentielle Punkte & Mehrspieler-PK
- Mehrfach-Linien: 1 Linie = 100 Pkt, 2 Linien = 350 Pkt, 3 Linien = 900 Pkt, 4 Linien = 2000 Pkt.
- Fortlaufende Combo-Multiplikatoren (+0.5x pro Zug).
- Absolut faire PK-Duelle durch identische Zufallsfolgen für alle Spieler.`
};

// 3. Execution function
function run() {
  const root = path.resolve(__dirname, '../..');
  
  // Update i18n JSON files
  for (const [lang, seoDesc] of Object.entries(seoDescMap)) {
    const filePath = path.join(root, `frontend/src/assets/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      json['game.hexa.seo_desc'] = seoDesc;
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`Updated game.hexa.seo_desc in ${lang}.json`);
    }
  }

  // Update public/assets/games-docs.json
  const docsPath = path.join(root, 'frontend/public/assets/games-docs.json');
  if (fs.existsSync(docsPath)) {
    const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    const hexaDoc = docs.find(d => d.id === 'hexa');
    if (hexaDoc) {
      hexaDoc.rules = JSON.stringify(hexaDocsRules);
      fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2) + '\n', 'utf8');
      console.log(`Updated hexa.rules in games-docs.json`);
    } else {
      console.error('Could not find hexa in games-docs.json');
    }
  }
}

run();
