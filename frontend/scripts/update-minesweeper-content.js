const fs = require('fs');
const path = require('path');

// 1. Define game.minesweeper.seo_desc for all 8 languages (Layer 1: Quick rules, <kbd> table, patterns, PK modes)
const seoDescMap = {
  zh: `<h2>经典扫雷核心规则与通关目标</h2><p>扫雷（Minesweeper）是一款伴随图形操作系统普及而享誉全球的硬核逻辑解谜游戏。棋盘下方随机潜伏着高密度的致命地雷。您的终极目标是依靠严密的数学逻辑，<strong>找出并点开网格中所有非雷安全格</strong>，同时标记出所有隐藏的地雷。游戏对数字推理、空间局部穷举与冷静决断力具有极高要求：</p><ul><li><strong>数字提示法则</strong>：揭开方块所显示的数字（1 至 8），精确代表以该格为中心的 <strong>3×3 九宫格内所包含的地雷总数</strong>。</li><li><strong>空白泛洪展开（Flood Fill）</strong>：若翻开的格子周围无雷（0），棋盘会自动向四周递归波浪式揭开所有相连的安全方块。</li><li><strong>首击防雷保护（First-Click Safe）</strong>：Puzzle PK 引擎保证开局第一击绝对 100% 安全，杜绝开门暴毙的挫败感。</li><li><strong>终局判定</strong>：点开所有非雷方块即获大胜；误点任意一颗地雷则全盘引爆（Game Over）。</li></ul><h2>全平台操作方式与快捷键指南</h2><p>为了让您在桌面键盘鼠标或移动触屏设备上均能实现行云流水般的盲打排雷，Puzzle PK 提供全端响应式操作支持：</p><table><thead><tr><th>操作方式</th><th>快捷键 / 手势</th><th>功能说明</th></tr></thead><tbody><tr><td><strong>挖开方块</strong></td><td>鼠标左键点击 / 触屏轻击</td><td>揭开指定未翻开格子，若为地雷则判定失败</td></tr><tr><td><strong>插旗标记</strong></td><td>鼠标右键点击 / 触屏长按</td><td>在判定为地雷的方块上插上安全红旗（🚩），防误触点击</td></tr><tr><td><strong>双击/双键齐按 (Chording)</strong></td><td>点击周围已满足旗数的数字</td><td>瞬间自动扫除周围未插旗的所有剩余相邻格，手速提升 3 倍的核心杀招！</td></tr><tr><td><strong>快速重新开局</strong></td><td>键盘 <kbd>R</kbd> 键</td><td>单机练习模式下立即重开当前难度的全新随机残局</td></tr><tr><td><strong>切换行动模式</strong></td><td>键盘 <kbd>Space 空格</kbd> 或 <kbd>F</kbd> 键 / 工具栏模式切换按钮</td><td>在触屏设备上快速切换【⛏️ 挖开】与【🚩 插旗】两种触控操作模式</td></tr><tr><td><strong>防幽灵触控</strong></td><td>移动端自适应防抖</td><td>智能阻断长按插旗放手瞬间的浏览器合成误点击，绝不误伤安全格</td></tr></tbody></table><h2>经典必修排雷定式速查 (Essential Patterns)</h2><ul><li><strong>1-1 定式（平齐边界）</strong>：在平直边界上遇到两个相邻的 1 时，由减法原理可知，第二个 1 外侧延伸出的相邻未知格必定绝对安全！</li><li><strong>1-2-1 定式（经典对称）</strong>：当直线边界上出现 1-2-1 阵列时，中间 2 的正前方为安全格，两颗地雷必然严格对称分布在两个 1 的正前方。</li><li><strong>1-2-2-1 定式（双雷夹心）</strong>：当直线边界出现 1-2-2-1 时，两个 2 的正前方必然各自潜伏一颗地雷，两端 1 的外侧完全安全。</li></ul><h2>多人联机实时竞技 (PK) 模式</h2><p>告别单机孤独排雷，在竞技大厅开启肾上腺素狂飙的多人对抗：</p><ul><li><strong>竞速模式 (Speed PK)</strong>：所有房间内选手面对<strong>完全相同的一张随机雷区</strong>。比拼纯粹的定式眼动速度与双击 Chording 效率，最先清盘者胜出！</li><li><strong>抢雷夺分模式 (Steal PK)</strong>：全场玩家空降在<strong>同一张巨型公共雷盘</strong>上争夺战功！抢先插中地雷夺取积分并占领领地；若误插假旗将遭受严厉的罚秒冷冻惩罚。极具博弈心理对抗！</li></ul><h2>高频常见疑问解答 (FAQ)</h2><h3>遇到必须“二选一”的死局猜雷该怎么办？</h3><p>扫雷属于数学上的 NP-完全问题，某些残局从信息论角度不存在必然逻辑，必须面临概率选择。此时切记高手的<strong>尽早猜雷原则（Early Guessing）</strong>：如果在开局或中盘发现一个完全孤立的 50/50 死角，必须优先猜掉它！如果猜错立即重开，避免耗费数分钟扫完整盘后再猜错暴毙。</p><h3>初学者怎样从 9×9 晋级到 30×16 专家级？</h3><p>从初级（10雷）过度到高级（99雷），关键在于戒掉“盲目全图到处瞎点”的坏习惯，学会利用“双击 Chording”加速已解区域的扩散，并熟练背诵 1-2-1 和 1-1 定式。</p>`,

  en: `<h2>Objective & Core Rules of Classic Minesweeper</h2><p>Minesweeper is the quintessential PC logic deduction masterpiece celebrated worldwide. Deep beneath the covered grid lies a hazardous density of hidden explosives. Your objective is to use pure mathematical deduction to <strong>uncover all safe cells without triggering a single mine</strong> while planting flags to neutralize all threats. The game demands relentless numerical analysis, localized exhaustion, and decisive courage:</p><ul><li><strong>Numerical Clue Axiom</strong>: Any revealed safe cell displays a digit (1 through 8) explicitly representing the <strong>exact count of mines concealed within its 3×3 surrounding perimeter</strong>.</li><li><strong>Flood Fill Clearance</strong>: Uncovering a zero-mine cell (blank) automatically triggers a cascading wave expansion, instantly opening all contiguous safe cells.</li><li><strong>First-Click Safe Guarantee</strong>: Puzzle PK's engine guarantees that your opening move will never hit a mine, eliminating early unfair deaths.</li><li><strong>Victory Condition</strong>: Successfully reveal all non-mine cells to claim victory; triggering any concealed mine causes an immediate Game Over explosion.</li></ul><h2>Complete Controls & Keyboard Shortcuts Guide</h2><p>Engineered for razor-sharp dexterity on desktop keyboards, mice, and mobile touchscreens alike, Puzzle PK provides comprehensive controls:</p><table><thead><tr><th>Action</th><th>Key / Gesture</th><th>Description</th></tr></thead><tbody><tr><td><strong>Reveal Cell</strong></td><td>Left-click / Tap</td><td>Uncover an unrevealed square; striking a hidden mine triggers defeat</td></tr><tr><td><strong>Flag Mine</strong></td><td>Right-click / Long-press</td><td>Plant or remove a safety flag (🚩) on suspected mines to guard against misclicks</td></tr><tr><td><strong>Chording (Double-Click)</strong></td><td>Click revealed number with satisfied flags</td><td>Instantly uncovers all remaining unflagged neighbors at once—the 3× speed multiplier!</td></tr><tr><td><strong>Quick Restart</strong></td><td>Keyboard <kbd>R</kbd> Key</td><td>Instantly restarts and generates a fresh minefield at the current difficulty</td></tr><tr><td><strong>Toggle Action Mode</strong></td><td>Keyboard <kbd>Space</kbd> or <kbd>F</kbd> / Toolbar Button</td><td>Instantly toggles mobile touch interaction between 【⛏️ Reveal】 and 【🚩 Flag】</td></tr><tr><td><strong>Ghost Click Armor</strong></td><td>Mobile adaptive debouncing</td><td>Eliminates synthetic browser ghost clicks when releasing long-press flags on touchscreens</td></tr></tbody></table><h2>Essential Solving Patterns Quick Reference</h2><ul><li><strong>1-1 Pattern (Flat Wall)</strong>: When two adjacent 1s share a straight border, subset subtraction dictates that the cell adjacent to the second 1's outward reach is guaranteed 100% safe!</li><li><strong>1-2-1 Pattern (Symmetric Lock)</strong>: In a linear 1-2-1 sequence, mines are strictly located directly in front of the two 1s, leaving the space in front of the 2 entirely safe.</li><li><strong>1-2-2-1 Pattern (Double-Mine Sandwich)</strong>: In a 1-2-2-1 boundary formation, the two 2s directly face two hidden mines, while the outer cells facing the 1s are safe.</li></ul><h2>Multiplayer Real-Time PK Battle Modes</h2><p>Step beyond lonely solo play and enter our competitive arena for adrenaline-pumping duels:</p><ul><li><strong>Speed Mode (Speed PK)</strong>: Every competitor faces the <strong>exact same randomized minefield layout</strong>. Compete purely on pattern recognition and chording efficiency—first to clear wins!</li><li><strong>Steal Mode (Steal PK)</strong>: All players parachute onto a <strong>single giant shared battlefield</strong>! Compete to plant flags on real mines for points; incorrect flags incur severe freeze penalties.</li></ul><h2>Frequently Asked Questions (FAQ)</h2><h3>What should I do when forced into a 50/50 guess?</h3><p>Minesweeper is mathematically proven to be NP-complete; certain endgames cannot be solved with logic alone. Master speedcubers employ the <strong>Early Guessing Principle</strong>: if an isolated 50/50 dead-end appears that cannot gain clues from elsewhere, guess it immediately! If you fail, restart instantly rather than investing 3 minutes only to lose at the finish line.</p><h3>How do I break the 60-second Expert barrier?</h3><p>Transitioning from Casual to Master requires mastering Chording (clicking satisfied numbers) and internalizing the 1-2-1 and 1-1 subtraction templates to bypass conscious calculation.</p>`,

  es: `<h2>Objetivo y Reglas de Buscaminas Clásico (Minesweeper)</h2><p>El Buscaminas es el juego de deducción lógica más emblemático de la informática. Su objetivo es <strong>despejar todas las casillas seguras sin detonar ninguna mina</strong>, marcando con banderas rojas las casillas peligrosas.</p><h2>Guía Completa de Controles y Atajos</h2><table><thead><tr><th>Acción</th><th>Control / Tecla</th><th>Descripción</th></tr></thead><tbody><tr><td><strong>Despejar Casilla</strong></td><td>Clic izquierdo o toque rápido</td><td>Revela la casilla; si es una mina, la partida termina</td></tr><tr><td><strong>Marcar Bandera</strong></td><td>Clic derecho o pulsación larga</td><td>Coloca una bandera (🚩) para proteger la casilla</td></tr><tr><td><strong>Chording (Doble Clic)</strong></td><td>Clic en número con banderas completas</td><td>Revela instantáneamente todas las casillas seguras adyacentes</td></tr><tr><td><strong>Reinicio Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Genera un nuevo tablero en la misma dificultad de inmediato</td></tr><tr><td><strong>Cambiar Modo</strong></td><td>Tecla <kbd>Espacio</kbd> o <kbd>F</kbd></td><td>Alterna entre modo cavar (⛏️) y modo bandera (🚩) en móviles</td></tr></tbody></table><h2>Patrones Clásicos Esenciales</h2><ul><li><strong>Patrón 1-1</strong>: Permite deducir zonas seguras en bordes rectos mediante resta de conjuntos.</li><li><strong>Patrón 1-2-1</strong>: Las minas se encuentran exactamente frente a los 1s; la casilla frente al 2 es segura.</li><li><strong>Patrón 1-2-2-1</strong>: Dos minas directas frente a los dos 2s.</li></ul>`,

  ja: `<h2>マインスイーパー（Minesweeper）の基本ルールと勝利目標</h2><p>マインスイーパーは、論理的思考と確率推論を極限まで楽しむ世界的人気パズルです。盤面に隠された地雷を避け、<strong>地雷以外のすべての安全マスを開放すること</strong>が目標です。</p><h2>全プラットフォーム操作ガイド＆キーボードショートカット</h2><table><thead><tr><th>操作</th><th>キー / 操作方法</th><th>機能説明</th></tr></thead><tbody><tr><td><strong>マスを開く</strong></td><td>左クリック / タップ</td><td>安全マスを開放。地雷を踏むと即座にゲームオーバー</td></tr><tr><td><strong>旗（フラグ）を立てる</strong></td><td>右クリック / 長押し</td><td>地雷と推測したマスに旗（🚩）を立てて誤爆を防止</td></tr><tr><td><strong>コード（Chording・一括開放）</strong></td><td>旗が揃った数字をクリック</td><td>周囲の安全マスを一瞬で全開放する最速テクニック！</td></tr><tr><td><strong>クイックリスタート</strong></td><td>キーボード <kbd>R</kbd></td><td>同難易度で瞬時に新しい盤面を生成して再開</td></tr><tr><td><strong>モード切替</strong></td><td><kbd>Space</kbd> または <kbd>F</kbd> キー</td><td>スマホ操作時に【掘る⛏️】と【旗🚩】モードを即座にトグル</td></tr></tbody></table><h2>必須の基本定石（Patterns）</h2><ul><li><strong>1-1定石</strong>：直線の壁沿いにある隣接した1-1から、外側の安全マスを確定。</li><li><strong>1-2-1定石</strong>：両端の1の前に地雷が存在し、中央の2の前は100%安全。</li><li><strong>1-2-2-1定石</strong>：2つの2の前にそれぞれ地雷が潜む典型パターン。</li></ul>`,

  ko: `<h2>지뢰찾기 (Minesweeper) 기본 규칙과 목표</h2><p>지뢰찾기는 논리적 연역과 확률 판단의 정수를 보여주는 클래식 게임입니다. 지뢰를 건드리지 않고 <strong>모든 안전한 사각형을 열어내고 지뢰 위치를 깃발로 표시하는 것</strong>이 목표입니다.</p><h2>전체 조작법 및 단축키 안내</h2><table><thead><tr><th>조작</th><th>단축키 / 제스처</th><th>기능 설명</th></tr></thead><tbody><tr><td><strong>블록 열기</strong></td><td>마우스 좌클릭 / 터치</td><td>안전 블록 열기 (지뢰 클릭 시 패배)</td></tr><tr><td><strong>깃발 꽂기</strong></td><td>마우스 우클릭 / 롱프레스</td><td>지뢰 예상 위치에 안전 깃발(🚩) 표시</td></tr><tr><td><strong>코드 (Chording)</strong></td><td>깃발이 채워진 숫자 클릭</td><td>인접한 모든 안전 블록을 한 번에 열어내는 3배속 기술</td></tr><tr><td><strong>빠른 재시작</strong></td><td>키보드 <kbd>R</kbd> 키</td><td>현재 난이도로 즉시 새 게임 생성</td></tr><tr><td><strong>모드 전환</strong></td><td><kbd>Space</kbd> 또는 <kbd>F</kbd> 키</td><td>터치 환경에서 [열기 ⛏️]와 [깃발 🚩] 모드 전환</td></tr></tbody></table><h2>필수 핵심 정석</h2><ul><li><strong>1-1 정석</strong>: 직선 경계에서 뺄셈 원리로 외부 안전 구역 확보.</li><li><strong>1-2-1 정석</strong>: 양쪽 1 앞이 지뢰이며 가운데 2 앞은 100% 안전.</li><li><strong>1-2-2-1 정석</strong>: 가운데 두 개의 2 앞에 각각 지뢰가 배치됨.</li></ul>`,

  pt: `<h2>Objetivo e Regras do Campo Minado (Minesweeper)</h2><p>Campo Minado é o mais clássico jogo de raciocínio dedutivo. O objetivo é <strong>abrir todas as casas seguras sem detonar nenhuma mina</strong>, sinalizando as posições perigosas com bandeiras vermelhas.</p><h2>Guia de Controles e Atalhos</h2><table><thead><tr><th>Ação</th><th>Controle / Tecla</th><th>Descrição</th></tr></thead><tbody><tr><td><strong>Revelar Célula</strong></td><td>Clique esquerdo ou toque rápido</td><td>Abre a célula; se for mina, fim de jogo</td></tr><tr><td><strong>Bandeira (Flag)</strong></td><td>Clique direito ou toque longo</td><td>Marca a mina com uma bandeira (🚩)</td></tr><tr><td><strong>Chording (Duplo Clique)</strong></td><td>Clique no número com bandeiras prontas</td><td>Abre todas as células seguras vizinhas simultaneamente</td></tr><tr><td><strong>Reinício Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Gera um novo campo minado na mesma dificuldade instantaneamente</td></tr><tr><td><strong>Alternar Modo</strong></td><td>Tecla <kbd>Espaço</kbd> ou <kbd>F</kbd></td><td>Alterna entre modo cavar (⛏️) e marcar bandeira (🚩) no touch</td></tr></tbody></table>`,

  fr: `<h2>Objectif et Règles du Démineur (Minesweeper)</h2><p>Le Démineur est le plus grand classique des jeux de déduction logique sur ordinateur. Votre but est de <strong>découvrir toutes les cases sûres sans faire exploser aucune mine</strong>, tout en marquant les emplacements dangereux à l'aide de drapeaux.</p><h2>Guide des Contrôles et Raccourcis Clavier</h2><table><thead><tr><th>Action</th><th>Contrôle / Touche</th><th>Description</th></tr></thead><tbody><tr><td><strong>Révéler la Case</strong></td><td>Clic gauche ou toucher bref</td><td>Dévoile la case ; toucher une mine entraîne la défaite</td></tr><tr><td><strong>Poser un Drapeau</strong></td><td>Clic droit ou appui long</td><td>Place un drapeau (🚩) protecteur sur une mine</td></tr><tr><td><strong>Chording (Double-Clic)</strong></td><td>Clic sur un chiffre aux drapeaux complets</td><td>Révèle instantanément toutes les cases sûres adjacentes</td></tr><tr><td><strong>Recommencer</strong></td><td>Touche <kbd>R</kbd></td><td>Relance immédiatement une nouvelle grille à la même difficulté</td></tr><tr><td><strong>Changer de Mode</strong></td><td>Touche <kbd>Espace</kbd> ou <kbd>F</kbd></td><td>Bascule entre mode creuser (⛏️) et drapeau (🚩) sur mobile</td></tr></tbody></table>`,

  de: `<h2>Ziel und Grundregeln von Minesweeper</h2><p>Minesweeper ist das legendäre logische Denkrätsel. Das Ziel besteht darin, <strong>alle sicheren Felder aufzudecken, ohne auf eine einzige Mine zu treten</strong>, und vermutete Minen mit Fahnen abzusichern.</p><h2>Steuerung und Tastatur-Leitfaden</h2><table><thead><tr><th>Aktion</th><th>Steuerung / Taste</th><th>Beschreibung</th></tr></thead><tbody><tr><td><strong>Feld aufdecken</strong></td><td>Linksklick oder Antippen</td><td>Deckt das Feld auf; Mine führt zur Niederlage</td></tr><tr><td><strong>Fahne setzen</strong></td><td>Rechtsklick oder langes Drücken</td><td>Sichert vermutete Minen mit einer Fahne (🚩) ab</td></tr><tr><td><strong>Chording (Schnellräumen)</strong></td><td>Klick auf Zahl mit gesetzten Fahnen</td><td>Deckt blitzschnell alle verbleibenden Nachbarfelder auf</td></tr><tr><td><strong>Schnell-Neustart</strong></td><td>Taste <kbd>R</kbd></td><td>Startet sofort ein neues Minenfeld der gleichen Stufe</td></tr><tr><td><strong>Modus wechseln</strong></td><td>Taste <kbd>Leertaste</kbd> oder <kbd>F</kbd></td><td>Wechselt auf Touchscreens zwischen Aufdecken und Fahne</td></tr></tbody></table>`
};

// 2. Define deep 7-chapter guides for games-docs.json for all 8 languages (Layer 2)
const minesweeperDocsRules = {
  zh: `# 经典扫雷 (Minesweeper) 终极通关宝典与离散逻辑全书

欢迎来到 Puzzle PK 官方深度解谜与高阶排雷指南。扫雷（Minesweeper）绝非凭运气的盲猜消遣，而是一门集离散数学、布尔可满足性（SAT）、集合论减法原理与概率论决策树于一身的精密逻辑科学。本教程将从底层的 NP-完全性数学定理出发，深入剖析定式代数推导、双击扫除（Chording）与 3BV 效率学、非确定性残局的最优概率博弈决策，以及多人实时竞技（Speed PK & Steal PK）下的职业级控盘战术。

---

## 第一章：扫雷数学模型与布尔可满足性（NP-Completeness 定理）

### 1.1 历史背景与经典诞生
扫雷的最早雏形可追溯至 20 世纪 60 年代大型机上的《Cube》，1990 年由罗伯特·唐纳（Robert Donner）与柯特·约翰逊（Curt Johnson）重写并正式内置于 Windows 3.0 系统，自此成为全球普及度最高的智力解谜游戏之一。

### 1.2 局部线性代数方程组模型
设扫雷棋盘上的每个未揭开格子 $i$ 均为一个离散布尔变量 $x_i \\in \\{0, 1\\}$，其中 $x_i = 1$ 表示存在地雷，$x_i = 0$ 表示安全。
对于任意一个已知数字为 $k$ 的已揭开格子 $c$，其有效 8 邻域集合记为 $\\mathcal{N}_c$。则该局部区域构成一个严格的齐次线性约束方程：
$$\\sum_{j \\in \\mathcal{N}_c} x_j = k$$
当多个数字格子在边缘重叠时，扫雷的本质就是**在多项式变量约束下求解该超定二元一次方程组的确定解**。

### 1.3 凯伊（Richard Kaye）定理：扫雷的 NP-完全性（2000年）
2000 年，数学家理查德·凯伊（Richard Kaye）在《The Mathematical Intelligencer》上发表了划时代的学术证明：**扫雷一致性问题（Minesweeper Consistency Problem）属于 NP-完全（NP-Complete）问题**。
- 凯伊通过构建精巧的方块逻辑阵列，在扫雷棋盘上成功模拟了**与门（AND）、或门（OR）、非门（NOT）以及信号交叉线（Wire Crossings）**，从而证明了扫雷能够在有限多项式时间内归约到布尔可满足性问题（SAT）。
- **重大推论**：不存在任何多项式时间复杂度的经典确定性算法能保证 100% 解开任意尺寸的通用扫雷棋盘；在复杂残局中，某些局部信息是不可判定的。
> **Puzzle PK 机制保障**：本系统所有单机练习与多人对战均搭载“首击防雷保护算法（First-Click Safe）”，首步点击绝对安全并优先触发大面积泛洪展开（Flood Fill），保证对局拥有良好的逻辑起手空间。

---

## 第二章：经典基础定式矩阵与代数减法原理

### 2.1 集合论减法原理（The Subtraction Principle）
所有扫雷定式的终极本质都是**集合包含与差集运算**。
设相邻两个数字格 $A$ 和 $B$ 的未知邻域分别为集合 $S_A$ 和 $S_B$，它们对应标注的未满足雷数分别为 $k_A$ 和 $k_B$。
若存在交集 $S_A \\cap S_B \\neq \\emptyset$，则：
$$k_A - k_B = \\sum_{x \\in S_A \\setminus S_B} x - \\sum_{y \\in S_B \\setminus S_A} y$$
当差值等于外侧未重叠格数时，未知格状态立即可直接判定！

### 2.2 核心定式全解析
1. **1-1 定式（平齐边界减法）**：
   - 场景：在平直边界上并排两个 1，左侧 1 的邻域 $S_A$ 包含 2 个未知格，右侧 1 的邻域 $S_B$ 包含 3 个未知格，且 $S_A \\subset S_B$。
   - 证明：由于 $S_A$ 内必须恰有 1 颗雷，而这 1 颗雷必然落在 $S_A \\cap S_B$ 的交集之中。因此右侧 1 属于 $S_B \\setminus S_A$ 的第 3 个独特外侧格**必然为 0（绝对安全）**！
2. **1-2-1 定式（经典对称夹心）**：
   - 场景：一条直线上出现 1-2-1，且每个数字前方各有且仅有对应的未知格。
   - 结论：**两端 1 的正前方必然是雷，中间 2 的正前方必然是安全格**！
   - 数学推导：中间的 2 要求前方提供 2 颗雷。两端的 1 各自最多提供 1 颗雷。要同时满足两端的 1 不超标，且中间的 2 达到 2 颗雷，唯一的整数解只能是雷落在左右两侧，中间格必空。
3. **1-2-2-1 定式（双雷并排）**：
   - 场景：直线边界排列 1-2-2-1。
   - 结论：**两个 2 的正前方全部是雷，两端 1 的外侧延伸格全部是安全格**。
4. **拐角定式（Corner 1 & Corner 2）**：
   - 当 1 位于凸出拐角时，其仅有 3 个相邻未知格；若其内部相邻数字也是 1，利用拐角约束可直接向内侧穿透推导出 2 到 3 个绝对安全格。

---

## 第三章：进阶非平凡推演：孤岛排除与空穴计数法

### 3.1 链式阶梯推进（Chained Stepping Patterns）
在实际中级和高级棋盘中，数字往往不是单层平齐的，而是呈现波浪状阶梯。通过由外向内的“1-2-3-2-1”链式迭代代入，前一个方程的解会直接化简后一个方程的自由变量数，形成类似高斯消元法的多米诺骨牌式连环解锁。

### 3.2 全局剩余雷数反推法（Mine Counting）
当游戏推进到终局，外围大部分区域已经清理干净，只剩下中央一片互不相通的狭小孤岛时，局部的“数字方程”往往可能出现欠定状态（未知数多于方程数）。
- **破局钥匙**：左上角仪表盘显示的**剩余总雷数 $M_{\\text{remain}}$**。
- 统计所有孤岛已知数字所必需的“最低地雷消耗量”。如果所有局部最低需求相加恰好等于 $M_{\\text{remain}}$，则意味着：**所有不属于任何数字约束区的多余空白孤立格，全部为绝对安全格**！反之若差值大于 0，则能精准反推出隐藏雷的唯一合法落点。

---

## 第四章：双键齐按（Chording）与 3BV 效率学

### 4.1 什么是 3BV？（Bechtel's Board Benchmark Value）
3BV 是扫雷国际竞技界公认的黄金标准指标，由斯蒂芬·贝希特尔（Stephan Bechtel）提出：
- **定义**：在不插任何旗帜（Non-Flagging）的前提下，完全解开一个扫雷棋盘所必需的**理论最少有效左键点击次数**。
- **3BV/s（每秒 3BV 速率）**：衡量扫雷选手纯操作手速与逻辑吞吐能力的硬指标。顶级职业选手通常能够达到 $3 \\sim 5 \\text{ 3BV/s}$。

### 4.2 双击扫除（Chording）的魔力与时机权衡
在 Puzzle PK 中，当一个数字周围已被正确标记了相应数量的旗帜时，直接左键点击该数字即可瞬间触发 **Chording（双击扫除）**，一帧之内揭开周围所有未标记方块。
- **插旗排雷流 (Flagging)** vs **纯左键不插旗流 (Non-Flagging)**：
  - 纯点左键（NF）：省去右键插旗的物理动作，减少总点击次数，但在密集复杂的狭窄区域容易误触；
  - 双键齐按（Chording）：在大型空旷区域，插上一面确定的旗帜后连续 Chording 四周数字，能在 0.5 秒内引发壮观的多米诺连环爆破，**综合耗时比逐格点击缩短 60% 以上**！

---

## 第五章：非确定性残局：概率博弈与最优猜雷决策树

### 5.1 必然死局（50/50 Deadlocks）的数学本质
由于扫雷的布尔变量属于局部投影，边界拐角常会出现对称欠定系统：例如 2 个未知格对应 1 颗雷，无论从哪个方向看两者的先验概率完全相等（严格等于 50%）。

### 5.2 黄金法则：尽早猜雷原则（The Early Guessing Principle）
绝大多数新手在遇到 50/50 死角时，习惯性选择“绕道走”，把全盘其他所有雷全部排完，把这个死角留到整局游戏的最后一步才来猜。
**这是竞技心理学与时间效率学上的最蠢策略！**
- **逻辑代价**：如果这个死角从信息论上无法从外部获取任何新信息，你无论什么时候猜，胜率都严格是 50%。
- **若最后猜**：你消耗了 3 分钟极度专注地扫完了 99% 的雷区，最后一步猜错，3 分钟心血瞬间付之一炬，挫败感极强。
- **若尽早猜**：在发现该孤立死角的第 1 秒立即盲猜一步！猜中了顺风顺水继续扫；猜错了用时不到 5 秒立刻按 <kbd>R</kbd> 重新开局。单位时间内的有效通关期望值提升十倍以上！

---

## 第六章：多人实时竞技（Speed PK & Steal PK）职业级战术

### 6.1 竞速模式 (Speed PK)：极速开局与眼动控制
- **同构种子绝对公正**：房间内全员获得完全一致的雷区布局。
- **开局第一秒大视野扫视**：首击触发的大面积空白波浪展开后，视线切忌死盯一个局部，应顺着大空白边缘寻找拥有多个“1-1”与“1-2-1”的连续平直外壁，双手键盘 <kbd>Space</kbd> 与鼠标配合，以 Chording 驱动大部队突进。

### 6.2 抢雷模式 (Steal PK)：公共巨盘抢夺博弈
- **大盘混战机制**：所有玩家在一张巨大的公共雷盘上实时操作。
- **战术取舍**：
  - 点开安全格虽然能获得视野，但也给对手铺了路；
  - 真正的高手擅长“借刀杀人”：利用对手挖出的数字轮廓，在对手尚未反应过来前，以闪电手速在关键雷位精准抢插旗帜夺取积分！
  - **切勿盲目抢旗**：插错假旗将触发惩罚性冷冻锁屏，几秒内丧失行动能力，因此稳准狠是抢雷模式的制胜法宝。

---

## 第七章：高频疑难解答与大师进阶诊断 (FAQ)

### Q1: 移动端手机触屏上怎么实现双键齐按（Chording）？
答：在手机和平板上，只需在数字格周围已经插好足够旗帜后，**直接轻触该数字格本身**，系统引擎便会自动执行 Chording 展开，手感与桌面端双击毫无二致。

### Q2: 为什么有时候插满旗帜了，数字却没有变暗或无法 Chording？
答：请检查该数字周围标记的旗帜数量是否严格等于该数字本身。例如一个数字是 3，如果周围只插了 2 面旗帜，Chording 将被系统安全锁保护拒绝执行，防止误掀开隐藏的第三颗地雷。

### Q3: 正常完成各难度的速度基准是多少？
答：
- **初级 (9×9, 10雷)**：休闲合格 15~30秒；高手进阶 5~10秒；世界级顶尖 1~3秒；
- **中级 (16×16, 40雷)**：休闲合格 60~120秒；高手进阶 25~45秒；世界级顶尖 8~15秒；
- **高级 (30×16, 99雷)**：休闲合格 3~5分钟；高手进阶 60~100秒；世界级顶尖 28~40秒。`,

  en: `# The Definitive Guide to Minesweeper: Discrete Logic & Competitive Speedrunning Masterclass

Welcome to the official, authoritative master strategy guide for **Minesweeper** on Puzzle PK. Far from a game of blind hazard and luck, Minesweeper represents an exacting applied discipline combining discrete mathematics, Boolean satisfiability (SAT), set-theoretic subtraction, and probabilistic decision trees.

This guide provides an end-to-end curriculum—spanning the mathematical proof of NP-completeness, rigorous algebraic pattern derivations, 3BV efficiency theory, Chording mechanics, optimal guessing algorithms for unsolvable deadlocks, and elite PvP speed and steal duel strategies.

---

## Chapter 1: The Mathematical Foundations & The NP-Completeness Theorem

### 1.1 Historical Origins of the Digital Classic
The precursor to modern Minesweeper can be traced to mainframe games like *Cube* in the 1960s. In 1990, Robert Donner and Curt Johnson reprogrammed the game for Windows 3.0 Entertainment Pack, turning it into one of the most widely played intellectual logic deduction puzzles in computing history.

### 1.2 The System of Linear Boolean Equations
Consider every unrevealed cell on the grid as an independent Boolean binary variable $x_i \\in \\{0, 1\\}$, where $x_i = 1$ denotes a hidden mine and $x_i = 0$ denotes safe ground.
For any revealed cell $c$ bearing a number $k$, its set of valid 8-neighborhood unrevealed neighbors is denoted as $\\mathcal{N}_c$. This translates into a strict linear equality constraint:
$$\\sum_{j \\in \\mathcal{N}_c} x_j = k$$
When multiple numerical constraints overlap along perimeter boundaries, the gameplay of Minesweeper is mathematically equivalent to solving an **overdetermined system of linear Diophantine equations over Boolean domains**.

### 1.3 Richard Kaye's Landmark Theorem: Minesweeper is NP-Complete (2000)
In 2000, mathematician Richard Kaye published a historic proof in *The Mathematical Intelligencer*: **The Minesweeper Consistency Problem is NP-Complete**.
- Kaye demonstrated that by constructing precise grid configurations of unrevealed cells and numbers, one can simulate complete **logic gates (AND, OR, NOT) alongside signal wires and non-interfering wire crossings**.
- **Crucial Deduction**: There exists no universal polynomial-time algorithm that can guarantee 100% deterministic solution across arbitrary board dimensions. Certain local subgraphs in Minesweeper are undecidable without probabilistic branching.

> **Puzzle PK Fair-Play Guarantee**: All single-player and multiplayer matches on Puzzle PK are built with **First-Click Safe Permutations**. Your opening click is 100% guaranteed safe, prioritizing opening expansive flood-fill openings for an immediate, logical start.

---

## Chapter 2: The Pattern Matrix & Set-Theoretic Subtraction

### 2.1 The Subtraction Principle
Every classical pattern in Minesweeper is a direct corollary of **set theory and symmetric difference**:
Let two adjacent numbers $A$ and $B$ have unrevealed neighbor sets $S_A$ and $S_B$, with remaining unsatisfied mine quotas $k_A$ and $k_B$.
If their footprints intersect ($S_A \\cap S_B \\neq \\emptyset$):
$$k_A - k_B = \\sum_{x \\in S_A \\setminus S_B} x - \\sum_{y \\in S_B \\setminus S_A} y$$
When the numerical difference matches the cardinality of the external unshared cells, all remaining cells resolve deterministically.

### 2.2 Canonical Pattern Encyclopedia
1. **The 1-1 Linear Wall Pattern**:
   - Scenario: Two 1s sit side-by-side along a flat boundary where the unrevealed footprint of the first ($S_A$) is a strict subset of the second ($S_B$).
   - Proof: Since $S_A$ must contain exactly 1 mine, that mine is trapped within the intersection $S_A \\cap S_B$. Therefore, the third unshared cell belonging uniquely to $S_B$ **must be 100% safe**!
2. **The 1-2-1 Symmetric Sandwich**:
   - Scenario: A 1-2-1 numerical formation along a straight frontier.
   - Deduction: **The cells directly facing the two 1s are both mines; the cell directly facing the central 2 is guaranteed safe!**
3. **The 1-2-2-1 Double Mine Lock**:
   - Scenario: A 1-2-2-1 array along a straight boundary.
   - Deduction: The two 2s directly face two hidden mines; the outer diagonal cells facing the 1s are guaranteed safe.
4. **Corner Formations (Corner 1 & Corner 2)**:
   - When a 1 sits in an exterior corner, its unrevealed space is constrained to 3 cells. Coupling it with an adjacent 1 safely unlocks interior cells.

---

## Chapter 3: Advanced Deduction: Mine Counting & Island Isolation

### 3.1 Chained Stepping Formations
In intermediate and expert boards, numbers form staggered staircases. By applying forward substitution down an echelon chain (e.g., 1-2-3-2-1), the solution of the outermost subproblem continuously collapses the degree of freedom in adjacent cells like a row-reduction algorithm.

### 3.2 Global Mine Counting in the Endgame
Late in an expert game, you will frequently encounter disjointed islands of unrevealed cells that cannot be deduced from local numbers alone.
- **The Decisive Key**: Consult the **Mine Counter** in the top HUD ($M_{\\text{remain}}$).
- Calculate the minimum mine requirement $\\sum k_{\\min}$ across all visible perimeter constraints.
- If the sum of all local minimum mine requirements equals the global remaining mine count exactly, **all isolated cells outside these perimeters are 100% safe**!

---

## Chapter 4: Chording Mechanics & The 3BV Speed Metric

### 4.1 What is 3BV? (Bechtel's Board Benchmark Value)
Formulated by Stephan Bechtel, 3BV is the universal international standard benchmark for Minesweeper efficiency:
- **Definition**: The theoretical minimum number of left-clicks required to solve a board without planting any flags (Non-Flagging).
- **3BV/s**: Represents your throughput velocity (3BV completed divided by elapsed seconds). Elite speedrunners consistently sustain **3.0 to 5.0 3BV/s**.

### 4.2 The Chording Multiplier (Flagging vs Non-Flagging)
When a revealed number's surrounding flags equal its value, clicking that number executes a **Chord**: uncovering all remaining unflagged adjacent squares simultaneously.
- While Non-Flagging (NF) eliminates the right-click action, **Chording allows one action to clear up to 7 safe cells at once**, cutting clearing time by over 60% across expansive boards.

---

## Chapter 5: Probabilistic Endgames & The Early Guessing Principle

### 5.1 The Mathematical Necessity of the 50/50 Deadlock
Because Minesweeper's constraints are localized, symmetric undecidable states inevitably arise in corner dead-ends where two candidate cells possess an identical 50% prior probability of holding a mine.

### 5.2 The Early Guessing Principle
Amateurs consistently make the psychological mistake of bypassing a 50/50 corner, meticulously clearing the rest of the 99% board, and leaving the coin flip as the very last move.
**This is the single most wasteful habit in competitive play.**
- **The Information Reality**: If an isolated pocket cannot receive informational clues from external cells, its survival probability is strictly 50%, regardless of whether you guess now or later.
- **The Cost**: If you spend 3 minutes clearing the board and guess wrong on move 200, you have wasted 3 minutes of mental stamina.
- **The Master Approach**: **Guess the 50/50 instantly the moment you identify it!** If you survive, continue with confidence; if you hit a mine, press <kbd>R</kbd> and restart within 5 seconds.

---

## Chapter 6: Multiplayer Speed PK & Steal Duel Tactics

### 6.1 Speed PK: Symmetrical Fair Play
In Speed PK mode, both combatants receive the **exact same board seed**. Victory is decided purely by pattern scanning velocity, zero redundant clicks, and rapid Chording cascades.

### 6.2 Steal PK: The Shared Battlefield
- All players drop onto a single shared giant board.
- Uncovering safe cells gives vision, but also hands information to rivals.
- Elite players monitor opponent activity and snipe critical mine flags the millisecond a pattern reveals itself, while avoiding false flags that trigger freezing penalties.

---

## Chapter 7: Frequently Asked Questions & Benchmarks (FAQ)

### Q1: How do I Chord on touchscreens?
Once the correct number of flags is placed around a digit, simply **tap the number itself** on your phone or tablet. The engine will instantly chord and unveil surrounding safe squares.

### Q2: What are the target speed benchmarks?
- **Beginner (9×9, 10 mines)**: Casual: 20–40s; Advanced: 5–10s; World Class: sub-3s;
- **Intermediate (16×16, 40 mines)**: Casual: 60–120s; Advanced: 25–45s; World Class: 8–15s;
- **Expert (30×16, 99 mines)**: Casual: 3–5 min; Advanced: 60–90s; World Class: sub-35s.`,

  es: `# Guía Definitiva de Buscaminas (Minesweeper): Lógica y Récords

Bienvenido a la guía oficial de **Buscaminas** en Puzzle PK. Basado en principios de lógica booleana y problemas NP-completos, este juego recompensa el cálculo exacto y la rapidez mental.

## Capítulo 1: Fundamentos Matemáticos y Demostración de Kaye
- **Modelo de Ecuaciones**: Cada casilla oculta es una variable binaria $x_i \\in \\{0, 1\\}$.
- **Problema NP-Completo**: En el año 2000, Richard Kaye demostró que determinar la coherencia de un tablero de Buscaminas equivale a resolver un problema SAT.

## Capítulo 2: Matriz de Patrones Fundamentales
1. **Patrón 1-1**: En bordes planos, la casilla más lejana al segundo 1 es siempre 100% segura.
2. **Patrón 1-2-1**: Las minas están exactamente frente a los 1s, el 2 tiene una casilla segura enfrente.
3. **Patrón 1-2-2-1**: Dos minas garantizadas frente a ambos 2s.

## Capítulo 3: Técnica de Chording y Métrica 3BV
- **Chording**: Al hacer clic en un número cuyas banderas ya están completas, se despejan automáticamente todas las casillas vecinas restantes.
- **3BV**: Cantidad mínima teórica de clics para resolver el tablero.

## Capítulo 4: Principio de la Adivinanza Temprana (Early Guessing)
Cuando surja un callejón sin salida del 50%, ¡adivine inmediatamente! No gaste minutos despejando el resto del tablero para luego perder al final.`,

  ja: `# マインスイーパー（Minesweeper）完全攻略ガイド：離散論理と高速化マスタークラス

Puzzle PK公式の**マインスイーパー（Minesweeper）**完全攻略ガイドです。単なる運任せのゲームではなく、ブール論理充足性（SAT）やNP完全性理論に裏打ちされた高度な数学的パズルです。

## 第1章：数学モデルとリチャード・ケイの定理（2000年）
- **論理方程式系**：各マスを $x_i \\in \\{0, 1\\}$ とおき、隣接数の連立一次方程式としてモデル化。
- **NP完全性の証明**：マインスイーパーの盤面で論理ゲート（AND/OR/NOT）を再現可能であることが証明されています。

## 第2章：基本定石（Patterns）大全
1. **1-1定石**：直線壁で重なる1-1は、引き算原理により外側のマスが安全確定。
2. **1-2-1定石**：両端の1の前に地雷、中央の2の前は安全。
3. **1-2-2-1定石**：中央の2つの2の前に2個の地雷が確定。

## 第3章：コード（Chording）と3BV効率学
- **Chording**：旗が揃った数字をクリックして周囲の安全マスを一瞬で開放。通常クリックと比べてクリアタイムを60%以上短縮。
- **早期推測の原則（Early Guessing）**：情報が不足した完全な50/50の2択に直面した場合、最後まで残さず最初に直感で開けるのが鉄則です。`,

  ko: `# 지뢰찾기 (Minesweeper) 궁극의 공략: 이산 논리와 스피드런 마스터클래스

Puzzle PK의 **지뢰찾기 (Minesweeper)** 공식 마스터 가이드입니다. 단순한 운이 아닌 부울 만족도(SAT)와 집합론적 연역에 기반한 수학적 해법을 제공합니다.

## 제1장: 수학적 모델과 NP-완전성 정리 (2000년)
- **불린 방정식계**: 각 미확인 셀을 $x_i \\in \\{0, 1\\}$의 변수로 치환하여 8방향 합을 방정식으로 연립합니다.
- **Richard Kaye의 증명**: 지뢰찾기 보드로 논리 회로를 구성할 수 있어 NP-완전(NP-Complete) 문제에 속함이 증명되었습니다.

## 제2장: 핵심 기본 정석
1. **1-1 정석**: 평평한 벽에서 1-1이 맞닿아 있을 때 차집합의 바깥쪽 셀은 100% 안전.
2. **1-2-1 정석**: 양쪽 1 앞이 지뢰이며, 가운데 2 앞은 안전.
3. **1-2-2-1 정석**: 두 개의 2 앞에 지뢰가 나란히 존재.

## 제3장: 코드(Chording)와 3BV 효율론
- **코드 (Chording)**: 깃발이 모두 세워진 숫자를 클릭하여 주변 안전 타일을 한 번에 개방.
- **조기 추측 원칙 (Early Guessing)**: 불가피한 50/50 막다른 길은 마지막까지 미루지 말고 발견 즉시 열어보아야 시간과 멘탈을 절약할 수 있습니다.`,

  pt: `# Guia Definitivo do Campo Minado (Minesweeper): Lógica e Speedrun

Bem-vindo ao guia oficial do **Campo Minado** no Puzzle PK. Domine a dedução lógica e os teoremas matemáticos por trás do jogo clássico.

## Capítulo 1: Fundamentos Matemáticos e Teorema de Kaye
- Modelagem de variáveis binárias $x_i \\in \\{0, 1\\}$.
- Em 2000, Richard Kaye provou que o Campo Minado pertence à classe NP-Completa.

## Capítulo 2: Matriz de Padrões Clássicos
1. **Padrão 1-1**: Elimina casas seguras através da subtração de conjuntos em paredes retas.
2. **Padrão 1-2-1**: Minas nas extremidades do 1; casa segura em frente ao 2.
3. **Padrão 1-2-2-1**: Duas minas garantidas em frente aos dois 2s.

## Capítulo 3: Chording e o Princípio da Adivinhação Rápida
- Use Chording clicando nos números com bandeiras completas para abrir todas as células vizinhas de uma só vez.
- Em situações de 50/50 inevitáveis, adivinhe imediatamente no início para não desperdiçar tempo.`,

  fr: `# Guide Ultime du Démineur (Minesweeper) : Mathématiques et Speedrun

Bienvenue sur le guide expert officiel du **Démineur** sur Puzzle PK. Apprenez les secrets d'un jeu réputé pour sa logique impitoyable et ses fondements mathématiques.

## Chapitre 1 : Modélisation et Problème NP-Complet
- Modélisation booléenne de chaque case par $x_i \\in \\{0, 1\\}$.
- Richard Kaye a démontré en 2000 que le Démineur est un problème NP-complet.

## Chapitre 2 : Les Motifs Fondamentaux
1. **Motif 1-1** : Déduction de cases sûres par soustraction d'ensembles.
2. **Motif 1-2-1** : Deux mines face aux 1, case sûre face au 2.
3. **Motif 1-2-2-1** : Deux mines situées devant les deux 2.

## Chapitre 3 : Chording et Règle du Choix Immédiat
- Utilisez le Chording pour ouvrir d'un seul clic les cases sûres autour d'un chiffre validé.
- Face à un dilemme 50/50 insoluble, choisissez tout de suite pour ne pas perdre votre temps en fin de partie.`,

  de: `# Ultimativer Leitfaden für Minesweeper: Diskrete Logik & Speedrun-Masterclass

Willkommen zum offiziellen Meisterleitfaden für **Minesweeper** auf Puzzle PK. Verstehen Sie die mathematischen Theoreme und bewährten Muster hinter dem zeitlosen Klassiker.

## Kapitel 1: Mathematisches Modell & NP-Vollständigkeit
- Jedes verdeckte Feld wird als binäre Variable $x_i \\in \\{0, 1\\}$ dargestellt.
- Richard Kaye bewies im Jahr 2000, dass Minesweeper NP-vollständig ist.

## Kapitel 2: Grundlegende Standardmuster
1. **1-1-Muster**: Subtraktionsprinzip an geraden Kanten schaltet äußere sichere Felder frei.
2. **1-2-1-Muster**: Minen liegen vor den Einsen, sicheres Feld vor der Zwei.
3. **1-2-2-1-Muster**: Minen liegen direkt vor beiden Zweien.

## Kapitel 3: Chording & Frühes Raten
- Chording öffnet alle umliegenden sicheren Felder blitzschnell auf einen Klick.
- Treffen Sie bei unlösbaren 50/50-Situationen die Entscheidung sofort zu Beginn, um keine Zeit zu verschwenden.`
};

// 3. Execution function
function run() {
  const root = path.resolve(__dirname, '../..');
  
  // Update i18n JSON files
  for (const [lang, seoDesc] of Object.entries(seoDescMap)) {
    const filePath = path.join(root, `frontend/src/assets/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      json['game.minesweeper.seo_desc'] = seoDesc;
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`Updated game.minesweeper.seo_desc in ${lang}.json`);
    }
  }

  // Update public/assets/games-docs.json
  const docsPath = path.join(root, 'frontend/public/assets/games-docs.json');
  if (fs.existsSync(docsPath)) {
    const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    const msDoc = docs.find(d => d.id === 'minesweeper');
    if (msDoc) {
      msDoc.rules = JSON.stringify(minesweeperDocsRules);
      fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2) + '\n', 'utf8');
      console.log(`Updated minesweeper.rules in games-docs.json`);
    } else {
      console.error('Could not find minesweeper in games-docs.json');
    }
  }

  // Update demo-configs.ts to remove 'minesweeper' from ALL_DEMO_CONFIGS
  const demoConfigsPath = path.join(root, 'frontend/src/app/features/docs/data/demo-configs.ts');
  if (fs.existsSync(demoConfigsPath)) {
    let dc = fs.readFileSync(demoConfigsPath, 'utf8');
    if (dc.includes("'minesweeper': minesweeperDemoConfig")) {
      dc = dc.replace(
        "'minesweeper': minesweeperDemoConfig",
        "// 'minesweeper' removed: the generic 5x5 board is outdated and mismatched with real 9x9/16x16/30x16 engines.\n  // The in-depth master guide document provides full professional step-by-step guidance."
      );
      fs.writeFileSync(demoConfigsPath, dc, 'utf8');
      console.log(`Removed minesweeper from ALL_DEMO_CONFIGS in demo-configs.ts`);
    }
  }
}

run();
