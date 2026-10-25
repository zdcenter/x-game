const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'src/assets/i18n');
const docsPath = path.join(root, 'public/assets/games-docs.json');

// ==========================================
// 1. Layer 1: In-Page Tactical Quick-Guide (Friendly, Plain, No LaTeX)
// ==========================================
const seoDescMap = {
  zh: `<h2>关于经典 2048 (Classic 2048 / 数字方块滑动合并)</h2>
<p><strong>经典 2048 (Classic 2048)</strong> 是一款在全世界风靡了十余年的传奇数字滑动消除游戏。它的规则极其纯粹，只需要在 4×4 的 16 格小舞台上，用手指或方向键推动方块滑动。当两个长相一模一样的数字撞在一起时，就会施展神奇的翻倍魔法（2 变 4，4 变 8，一直翻倍到耀眼的 <strong>2048</strong>）！没有恼人的时间倒计时，每一步都由你掌控。无论是在手机触屏还是电脑键盘上，都能享受丝滑清脆的指尖滑动快感！</p>

<h3>全平台按键与操控速查表</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">操作类型</th>
        <th class="p-2 border border-[var(--color-border-card)]">触控手势 (手机 / 平板)</th>
        <th class="p-2 border border-[var(--color-border-card)]">键盘快捷键</th>
        <th class="p-2 border border-[var(--color-border-card)]">功能说明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">向左滑行</td>
        <td class="p-2 border border-[var(--color-border-card)]">在棋盘上向左划动手势</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>A</kbd> 或 <kbd>←</kbd> 方向键</td>
        <td class="p-2 border border-[var(--color-border-card)]">全盘所有方块整体向左撞击靠齐，相同数字合并</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">向右滑行</td>
        <td class="p-2 border border-[var(--color-border-card)]">在棋盘上向右划动手势</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>D</kbd> 或 <kbd>→</kbd> 方向键</td>
        <td class="p-2 border border-[var(--color-border-card)]">全盘所有方块整体向右撞击靠齐，相同数字合并</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">向上滑行</td>
        <td class="p-2 border border-[var(--color-border-card)]">在棋盘上向上划动手势</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>W</kbd> 或 <kbd>↑</kbd> 方向键</td>
        <td class="p-2 border border-[var(--color-border-card)]">全盘所有方块整体向上撞击靠齐，相同数字合并</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">向下滑行</td>
        <td class="p-2 border border-[var(--color-border-card)]">在棋盘上向下划动手势</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>S</kbd> 或 <kbd>↓</kbd> 方向键</td>
        <td class="p-2 border border-[var(--color-border-card)]">全盘所有方块整体向下撞击靠齐，相同数字合并</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">快速撤销 (Undo)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部的撤销箭头按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>U</kbd> 或 <kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">撤回刚才失误的一步滑动，重回安全阵型（练习模式）</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">一键重开 (Restart)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击重开按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">快速重置 4×4 棋盘，清空分数开启全新一局</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>数字变身与生成机制速查</h3>
<ul>
  <li><strong>同胞合体变身</strong>：两个数值完全相同的方块发生碰撞时，瞬间合并成一个数值翻倍的新方块（例如：2+2=4，4+4=8，128+128=256，1024+1024=2048）。</li>
  <li><strong>单趟只并一次</strong>：一行若有 4 个 2，向左滑动只会变成两个 4，绝不会贪心连并成一个 8。</li>
  <li><strong>新方块的降临</strong>：每次成功滑动（至少移动或合并了一个方块），系统就会在随机空格里生成一个新方块，90% 几率是数字 2，10% 几率是数字 4。</li>
  <li><strong>胜负终局条件</strong>：当 16 个格子全部塞满，且上下左右四个方向都无法再合并任何方块时，游戏结束（Game Over）。</li>
</ul>

<h3>通关 2048 三大黄金铁律（初学者必背）</h3>
<ul>
  <li><strong>铁律一：死守角落（选定国王的王座）</strong>：千万别让最大数字在棋盘中央到处流浪！开局就选好一个角落（推荐右下角），把全盘最大的方块死死钉在这个王座上，永远不许离开。</li>
  <li><strong>铁律二：贪吃蛇排队（从大到小顺次排列）</strong>：以王座为起点，沿着蛇形弯道，把数字按照从大到小的顺序排列（比如底行从右到左是 1024、512、256、128）。一旦队伍末尾发生合并，就会像拉链一样瞬间引发连锁多米诺大合并！</li>
  <li><strong>铁律三：封印相反按键（贴上封条）</strong>：如果你的大数定在右下角，请在心里把“向上键 (W / ↑)”贴上封条，坚决不要按！只使用向左、向右、向下三个方向，防止最大数被意外抽离底行导致全盘崩溃。</li>
</ul>

<h3>双人 Speed PK 极速对决模式</h3>
<ul>
  <li><strong>绝对公平同题竞速</strong>：对战双方使用完全一致的随机发牌种子，新方块出现的位置与数值完全相同，纯粹比拼规划与手速。</li>
  <li><strong>率先合成 2048 者胜</strong>：谁先合成出传说中的 2048 金色方块，谁就直接夺冠；若一方棋盘塞满提前暴毙，则另一方直接躺赢！</li>
</ul>

<h2>常见问题解答 (FAQ)</h2>
<h3>为什么我老是卡在 512 或者 1024 就动弹不得了？</h3>
<p>这是因为你在滑动时破坏了“从大到小”的队伍顺序，让小方块卡在了大方块的下边或旁边，挡住了合并通道。只要坚持把最大数钉在角落、只用三个方向键，就能轻松打破 512 瓶颈！</p>

<h3>什么时候才能按被封印的那个方向键？</h3>
<p>只有当全盘只剩下唯一一种合法滑动、且必须按那个键时（万不得已的死局倒逼），才能按一次。按完之后必须在下一步立即把它按回底行！</p>

<h3>手机上滑动太快划错方向怎么办？</h3>
<p>在屏幕中央轻划短距离即可触发灵敏响应，无需夸张划大跨度；如果不小心划错，单人模式下点击顶部撤销按钮即可回退一步。</p>`,

  en: `<h2>About Classic 2048 (Number Tile Sliding Puzzle)</h2>
<p><strong>Classic 2048</strong> is a world-renowned sliding-tile puzzle game that became a global phenomenon in 2014. Created by Gabriele Cirulli, it features an elegant 4×4 grid where numbers combine by powers of two. With pure spatial planning and zero time pressure, every swipe slides all tiles across the grid until identical numbers collide and merge into double their value: 2, 4, 8, 16... all the way to the golden <strong>2048</strong> tile! Smooth, lightning-fast, and universally engaging on both touchscreens and desktop keyboards.</p>

<h3>Controls & Keyboard Shortcuts Guide</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">Action</th>
        <th class="p-2 border border-[var(--color-border-card)]">Touch Gesture (Phone / Tablet)</th>
        <th class="p-2 border border-[var(--color-border-card)]">Keyboard Key</th>
        <th class="p-2 border border-[var(--color-border-card)]">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Slide Left</td>
        <td class="p-2 border border-[var(--color-border-card)]">Swipe Left across the board</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>A</kbd> or <kbd>←</kbd> Arrow</td>
        <td class="p-2 border border-[var(--color-border-card)]">Slides all tiles leftward; identical colliding tiles merge</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Slide Right</td>
        <td class="p-2 border border-[var(--color-border-card)]">Swipe Right across the board</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>D</kbd> or <kbd>→</kbd> Arrow</td>
        <td class="p-2 border border-[var(--color-border-card)]">Slides all tiles rightward; identical colliding tiles merge</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Slide Up</td>
        <td class="p-2 border border-[var(--color-border-card)]">Swipe Up across the board</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>W</kbd> or <kbd>↑</kbd> Arrow</td>
        <td class="p-2 border border-[var(--color-border-card)]">Slides all tiles upward; identical colliding tiles merge</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Slide Down</td>
        <td class="p-2 border border-[var(--color-border-card)]">Swipe Down across the board</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>S</kbd> or <kbd>↓</kbd> Arrow</td>
        <td class="p-2 border border-[var(--color-border-card)]">Slides all tiles downward; identical colliding tiles merge</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Undo Move</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap Undo button on top toolbar</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>U</kbd> or <kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Rolls back the last swipe in single-player practice mode</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Restart Board</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap Restart button</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Clears the 4×4 board to start fresh with zero score</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>Tile Mechanics & Spawn Rules</h3>
<ul>
  <li><strong>Collision &amp; Doubling</strong>: When two tiles with identical values collide, they merge into one with double the value (e.g., 2+2=4, 4+4=8, 1024+1024=2048).</li>
  <li><strong>One Merge Per Slide</strong>: A row with [2, 2, 2, 2] sliding left becomes [4, 4, 0, 0], never jumping directly to an 8 in one swipe.</li>
  <li><strong>New Tile Spawns</strong>: Every valid move generates a new tile in an empty cell: 90% chance of a 2, and 10% chance of a 4.</li>
  <li><strong>Game Over Condition</strong>: The game ends when all 16 cells are full and no adjacent tiles can merge horizontally or vertically.</li>
</ul>

<h3>Three Golden Rules for 2048 Mastery</h3>
<ul>
  <li><strong>Rule 1: Lock the Corner (The King's Throne)</strong>: Never let your highest tile wander in the center. Pick one corner (bottom-right is classic) and anchor your biggest tile there permanently.</li>
  <li><strong>Rule 2: Snake Order (From Largest to Smallest)</strong>: Arrange remaining numbers in descending snake-like order (e.g., bottom row: 1024, 512, 256, 128). When the tail merges, it triggers a zipper cascade!</li>
  <li><strong>Rule 3: Seal the Opposite Direction</strong>: If your king tile is anchored in the bottom-right, NEVER press Up! Use only Left, Right, and Down to prevent pulling your high tile away from the bottom wall.</li>
</ul>

<h3>Real-Time Speed PK Battles</h3>
<ul>
  <li><strong>Identical Random Seeds</strong>: Both opponents play with the exact same spawn sequence for 100% competitive fairness.</li>
  <li><strong>First to 2048 Wins</strong>: Race to create the 2048 tile first, or outlast your rival if their board fills up first!</li>
</ul>`,

  es: `<h2>Acerca de Clásico 2048 (Rompecabezas de Números)</h2>
<p><strong>2048</strong> es el aclamado juego de deslizamiento donde los números se duplican al chocar: 2, 4, 8, 16... ¡hasta alcanzar el legendario <strong>2048</strong>! Juega en cualquier navegador sin descargas.</p>
<h3>Controles Principales</h3>
<ul>
  <li><strong>Deslizar</strong>: Teclas <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, flechas o deslizar el dedo en la pantalla táctil.</li>
  <li><strong>Deshacer</strong>: <kbd>U</kbd> o <kbd>Ctrl</kbd> + <kbd>Z</kbd> para corregir un movimiento erróneo.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd> para empezar una nueva partida al instante.</li>
</ul>
<h3>Estrategia Maestra: La Esquina Intocable</h3>
<p>Mantén siempre tu número más grande bloqueado en una esquina (por ejemplo, abajo a la derecha). Ordena los demás números de mayor a menor en fila y <strong>evita pulsar hacia arriba</strong> para no descolocarlo.</p>`,

  ja: `<h2>クラシック 2048（数字パズル）の遊び方とコツ</h2>
<p><strong>2048</strong>は、盤面上の数字をスライドさせて同じ数字同士を合体させ、2倍、4倍、8倍…と大きくしていき、伝説の<strong>2048</strong>を目指す大人気パズルです！</p>
<h3>操作方法</h3>
<ul>
  <li><strong>スライド移動</strong>：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>、矢印キー、または画面を上下左右にスワイプ。</li>
  <li><strong>一手戻す</strong>：<kbd>U</kbd> または <kbd>Ctrl</kbd> + <kbd>Z</kbd> でやり直し可能。</li>
  <li><strong>リスタート</strong>：<kbd>R</kbd> キーで即座に新しい盤面を開始。</li>
</ul>
<h3>最強の攻略法：右下のカド固定</h3>
<p>一番大きな数字を右下の隅に固定し、そこから左に向かって大きい順に並べます。<strong>上キーは絶対に押さない</strong>のが2048完成への鉄則です！</p>`,

  ko: `<h2>클래식 2048 게임 방법과 꿀팁</h2>
<p><strong>2048</strong>은 숫자를 밀어서 같은 숫자끼리 합쳐 2, 4, 8, 16... 배로 키워 나가며 최종적으로 <strong>2048</strong> 타일을 만드는 두뇌 퍼즐 게임입니다!</p>
<h3>조작법</h3>
<ul>
  <li><strong>타일 밀기</strong>: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, 방향키, 또는 화면 스와이프.</li>
  <li><strong>되돌리기 (Undo)</strong>: <kbd>U</kbd> 또는 <kbd>Ctrl</kbd> + <kbd>Z</kbd> 키.</li>
  <li><strong>재시작</strong>: <kbd>R</kbd> 키로 즉시 새 게임 시작.</li>
</ul>
<h3>핵심 비법: 구석에 큰 숫자 고정하기</h3>
<p>가장 큰 숫자를 오른쪽 아래 구석에 단단히 고정하고, 그 옆으로 큰 순서대로 줄을 세웁니다. <strong>위쪽 방향키는 절대 누르지 않는 것</strong>이 승리의 비결입니다!</p>`,

  pt: `<h2>Sobre o Clássico 2048</h2>
<p><strong>2048</strong> é o mundialmente famoso jogo de quebra-cabeça numérico onde blocos iguais se fundem e dobram de valor ao colidir, até alcançar o número <strong>2048</strong>!</p>
<h3>Controles</h3>
<ul>
  <li><strong>Deslizar</strong>: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, setas ou deslize na tela touch.</li>
  <li><strong>Desfazer</strong>: <kbd>U</kbd> ou <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd>.</li>
</ul>
<h3>Dica de Ouro</h3>
<p>Mantenha sempre seu maior número travado em um canto (como o canto inferior direito) e nunca deslize para cima!</p>`,

  fr: `<h2>À Propos de 2048 Classique</h2>
<p><strong>2048</strong> est le célèbre casse-tête coulissant où les chiffres identiques fusionnent pour doubler : 2, 4, 8, 16... jusqu'à atteindre la fameuse tuile <strong>2048</strong> !</p>
<h3>Commandes</h3>
<ul>
  <li><strong>Glisser</strong> : Touches <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, flèches ou glissement sur l'écran tactile.</li>
  <li><strong>Annuler</strong> : <kbd>U</kbd> ou <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
  <li><strong>Recommencer</strong> : Touche <kbd>R</kbd>.</li>
</ul>
<h3>Règle d'Or</h3>
<p>Gardez toujours votre plus grand nombre bloqué dans un coin (en bas à droite) et ne glissez jamais vers le haut !</p>`,

  de: `<h2>Über Klassisches 2048</h2>
<p><strong>2048</strong> ist der weltbekannte Zahlen-Klassiker. Verschiebe die Kacheln auf dem 4×4-Feld, damit gleiche Zahlen verschmelzen und sich verdoppeln – bis zum Ziel <strong>2048</strong>!</p>
<h3>Steuerung</h3>
<ul>
  <li><strong>Verschieben</strong>: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Pfeiltasten oder Wischen auf dem Touchscreen.</li>
  <li><strong>Rückgängig</strong>: <kbd>U</kbd> oder <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
  <li><strong>Neustart</strong>: Taste <kbd>R</kbd>.</li>
</ul>
<h3>Meister-Tipp</h3>
<p>Halte deine größte Zahl immer in einer Ecke fest (z.B. unten rechts) und wische niemals nach oben!</p>`
};

// ==========================================
// 2. Layer 2: Deep Masterpiece Guide (Easy for 8-14 Year Olds, Zero LaTeX)
// ==========================================
const zhRules = `## 第一章：2048 到底是什么？一个 19 岁少年创造的数字奇迹

欢迎来到 **Puzzle PK 经典 2048 趣味通关全书**！不管你是刚学会加法乘法的小学生，还是想要冲刺 4096、8192 高分大关的初中生高手，只要掌握几个像下跳棋一样简单直观的排兵布阵招式，你就能让数字像多米诺骨牌一样顺滑合体，稳稳通关 2048！

### 1.1 那个轰动全球的周末：加布里埃莱的奇迹
2014 年 3 月的一个周末，在意大利的一间卧室里，一位名叫加布里埃莱·奇鲁利 (Gabriele Cirulli) 的 19 岁年轻程序员，仅仅花了一个周末的时间就写出了一款简单的网页小游戏。
他把游戏上传到网络上，结果短短几天之内，全球有上千万人玩得上瘾停不下来，连大学教授、科学家和各大新闻媒体都在争相报道！
这款游戏，就是风靡至今的 **2048**。

### 1.2 4×4 网格里的 16 个小房间：数字合体魔法
游戏的舞台非常简单：一张只有 16 个小房间（4×4 网格）的正方形棋盘。
你的任务就是像指挥官一样，用手指轻轻向 上、下、左、右 四个方向滑动。
每一次滑动，棋盘里所有的数字方块都会像受到引力一样，整体齐刷刷地滑到底。
当两个完全一样的数字在滑行中撞在一起时，它们就会变身合并，变成一个数值大一倍的新数字！

### 1.3 2 的翻倍大家族：从 2、4、8 到 2048
在 2048 的世界里，所有的数字都是“2 的倍数家族”的成员：
- 2 + 2 = 4
- 4 + 4 = 8
- 8 + 8 = 16
- 16 + 16 = 32
- 32 + 32 = 64
- 64 + 64 = 128
- 128 + 128 = 256
- 256 + 256 = 512
- 512 + 512 = 1024
- 1024 + 1024 = 2048！
当你最终把两个 1024 撞在一起、升华成金光闪闪的 **2048** 方块时，整张棋盘都会为你响起华丽的通关乐章！

---

## 第二章：方块变身三大铁律：小学生都能懂的合成规则

要想成为 2048 大神，首先必须把方块滑动的三个基本规矩摸得透透的：

### 2.1 铁律一：只有同胞兄弟才能合体
- **2 和 2** 撞在一起，变成 **4**；
- **4 和 4** 撞在一起，变成 **8**；
- 但是如果一个 **2** 和一个 **4** 撞在一起呢？它们俩谁也不会变身，只是像积木一样紧挨着停下来。因此，数字大小相差太多的方块混在一起，就会变成挡路的障碍物！

### 2.2 铁律二：一趟滑行只合体一次（不能贪心）
假设有一排刚好坐着四个 2：[2, 2, 2, 2]。
如果你向左滑动，会发生什么呢？
- 左边的两个 2 撞在一起变成了 4；
- 右边的两个 2 也撞在一起变成了 4；
- 结果这一排变成了：[4, 4, 空, 空]！
**重点来了**：刚才变出来的两个 4，绝不会在这一趟滑行里再次合体变成 8！必须等到下一次你再向左滑动时，它们俩才能合体变成 8。这叫“每次滑动只合体一轮”，绝不贪心。

### 2.3 铁律三：新宝宝的降临规律
每当你做出一次成功的有效滑动（全盘至少有一个方块发生了移动或合体），系统就会在空出来的小房间里，随机塞入一个新方块：
- 有 **90% 的概率**（绝大多数情况）会送来一个弱小的小弟数字 **2**；
- 有 **10% 的概率**（偶尔的惊喜）会直接送来一个稍大一点的二哥数字 **4**。
你的目标，就是在新方块源源不断填满房间之前，尽快把它们合并升级，腾出宝贵的活动空间！

---

## 第三章：封神第一绝招：死守王座（角落定海神针法）

很多新手玩到 256 或 512 的时候，棋盘上就塞得水泄不通，最后活活憋死。为什么会这样呢？
因为新手喜欢“看见哪里能合体就往哪里滑”，导致大数字在棋盘正中间乱跑，把棋盘切成两半，小方块进不来也出不去。

高手的核心秘诀只有四个字：**死守角落！**

### 3.1 选定国王的宝座
在 4×4 棋盘的四个角落里，选定一个作为你的“王座”（绝大多数职业玩家习惯选择**右下角**）。
一旦你在右下角合成出了 128、256 这样的大数字，它就是你的**国王**！
请把国王死死地按在右下角，**永远永远不要让它离开这个王座**！

### 3.2 贴上封条的三向原则：坚决封印“向上键”！
如果你的国王定在右下角，怎样才能保证它永远不离开呢？
答案非常简单，甚至可以说是神奇：
**把键盘上的“向上键 (W / ↑)”贴上封条，严禁按下！**
为什么呢？
- 你按向右，国王就在最右边撞墙，不会动；
- 你按向下，国王就在最底边撞墙，不会动；
- 你按向左，只要最底下一排是满的，国王依然牢牢呆在右下角！
- 但是只要你手欠按了一次**“向上键”**，天哪！国王就会带着一排方块全部向上浮空飞起，一个刚刚新出生的 2 就会瞬间钻进国王的宝座底下，把你原先的完美阵型瞬间炸穿！

记住高手的口诀：**只按 左、右、下，永远不按 上！**

---

## 第四章：封神第二绝招：贪吃蛇排队法（多米诺拉链大合体）

把国王锁在右下角只是第一步。那其他数字该怎么排布呢？
答案就是：**像贪吃蛇一样，从大到小顺次排队！**

### 4.1 贪吃蛇长蛇阵图解
看看高手最完美的盘面长什么样：

\`\`\`text
[   2,    4,    8,   16 ]  <-- 第1行：刚刚出生的小数字（小蛇尾巴）
[ 256,  128,   64,   32 ]  <-- 第2行：从小到大往左走
[ 512,    空,   空,   空 ]  <-- 第3行：过渡枢纽
[1024, 2048,   空,   空 ]  <-- 第4行（底行）：最大的国王坐镇右下角
\`\`\`

或者最经典的“蛇形蜿蜒”：
- 底行（从左到右）：[ 128,  256,  512, 1024(国王) ]
- 倒数第二行（从右到左）：[  64,   32,   16,    8 ]
- 顶上两行：负责合成 2 和 4 喂给这条贪吃蛇！

### 4.2 见证奇迹的时刻：多米诺拉链合体！
为什么贪吃蛇阵型天下无敌？
你看：蛇尾巴是 8，蛇身子依次是 16、32、64、128、256、512，国王是 1024。
只要你在第 1 行合成出了一个崭新的 **8**，往下一推：
1. 8 和 8 撞在一起变成 **16**！
2. 16 顺势撞在 16 上变成 **32**！
3. 32 顺势撞在 32 上变成 **64**！
4. 64 顺势撞在 64 上变成 **128**！
5. 128 撞 128 变成 **256**！
6. 256 撞 256 变成 **512**！
7. 512 撞 512 变成 **1024**！
8. 最后 1024 撞向右下角的国王 1024 —— **啪！2048 诞生啦！**
整个过程就像拉链一样，从头刷到尾，一气呵成！那种连环大消除的多巴胺暴击，是全世界任何游戏都无法比拟的爽快感！

---

## 第五章：救命时刻：国王被挤出宝座怎么办？

即使是老手，有时候也会不小心遇到危险情况。

### 5.1 危险警报：底行没有坐满 4 个方块
为什么有时候按向左，国王会离开右下角呢？
因为底行只有 3 个方块，左边有个大窟窿！你一按向左，国王就向左滑出了王座。
**解法：底行肉盾护卫法**
在按向左之前，时刻保证底行整整齐齐坐满了 4 个方块。只要底行排满了 4 个人，你按向左，它们只会挤在一起，国王绝不会挪动半步！

### 5.2 紧急救援：国王被挤到第二行了，怎么办？
如果你因为不得不按“向上键”导致国王漂到了第二行：
1. **千万别慌，别乱按**！
2. 赶紧观察国王的正下方是不是空的？
3. 如果国王正下方有空位，**立刻按一次“向下键”**，把国王重新按回底行！
4. 如果正下方被一个小 2 占了，赶紧在右边多滑两步把那个小 2 合并掉，只要一出现空隙，立刻向下按下，护送国王归位！

---

## 第六章：双人 Speed PK 竞速电竞心法：手速与节奏控制

在 Puzzle PK 的在线联机对战中，你将与好友或全球大师在 1v1 房间内展开实时较量！

### 6.1 绝对公平的发牌种子
所有进入同一个 PK 房间的选手，棋盘上生成的初始方块、以及每次滑动后新刷出来的 2 和 4，**位置和数值完全 100% 一模一样**！
没有任何运气成分，谁先合出 2048，或者谁活得更久，纯粹比拼规划清晰度与指尖反应！

### 6.2 华尔兹盲打节奏：下左右、下左右
顶尖 2048 竞速大神的盲打口诀是：**“下左右下左右”的三角华尔兹律动**。
由于手指在“左、右、下”三个方向循环滑动，手速可以飙到每秒钟 4 到 6 步！
在开局前 200 步，根本不需要过多思考，靠着盲打律动，几秒钟就能在右下角叠出 128 或 256。

### 6.3 顺风不浪，逆风不慌
在侧边栏可以看到对手的实时分数和大方块进度：
- **看到对手领先了（比如对手已经 1024）**：千万别心急乱滑！2048 的死局往往发生在一秒钟之内。保持你的蛇形阵型不乱，只要打出一次多米诺拉链合体，分数瞬间就能反超对手！
- **看到自己领先了**：更要稳住底行，每一步都确认底行坐满 4 个人，稳稳把胜利带回家。

---

## 第七章：高频小问答 (FAQ) 与十二字独门心诀

### 问：把一个方块从 2 一直合成到 2048，最少需要多少个小方块？
**答：正好需要 1024 个数字 2！**（或者少量数字 4 替代）。整盘游戏你通常需要有效滑动大约 1000 到 1500 步。这是一场考验耐心与大局观的脑力马拉松，每一步都在锻炼你的空间规划能力。

### 问：合出 2048 就算游戏通关了吗？后面还能继续玩吗？
**答：2048 只是新手村毕业的通行证！**
当你合出 2048 后，游戏并不会强行结束。你可以继续向着 **4096**、**8192** 乃至神级领域 **16384** 发起冲击！世界上最高水平的计算机算法在 4×4 棋盘上的理论极限甚至可以合出 131072！

### 问：手机触屏滑动容易划偏划错怎么办？
**答：用大拇指在屏幕正中心做小幅度轻划！**
不需要大幅度划过大半个屏幕，只需要在棋盘中心轻轻滑动 1 到 2 厘米，系统就能精准捕捉到你的滑动意图，既快又不容易按错。

### 2048 通关绝世十二字心诀
> **「大数守角，从大到小；封印单向，连环拉牢。」**
> 牢牢背熟这十二个字：大数字永远钉死在角落王座，队伍像贪吃蛇一样从大到小排整齐，封印向上键只按三向，拉链式多米诺连环合体，你就是无敌的 2048 大师！`;

const enRules = `## Chapter 1: What is 2048? A Weekend Miracle Created by a 19-Year-Old

Welcome to the **Puzzle PK Fun & Friendly Classic 2048 Guide**! Whether you are an elementary school student who just learned basic multiplication or a puzzle enthusiast racing to reach the 4096 or 8192 milestones, this guide teaches you how to arrange numbers into an unstoppable domino cascade. Zero guesswork, zero frustration — pure satisfying logic!

### 1.1 The Weekend Phenomenon
In March 2014, a 19-year-old Italian programmer named Gabriele Cirulli sat in his bedroom and created a simple sliding-tile game over a single weekend.
He posted it online, and within days, tens of millions of people worldwide were playing it obsessively. News outlets, math professors, and casual gamers were all captivated.
That game is the timeless masterpiece: **2048**.

### 1.2 16 Small Rooms in a 4×4 Grid
The game board is simple: a square frame with exactly 16 small rooms (a 4×4 matrix).
Your role is the commander: swipe Up, Down, Left, or Right.
Every time you swipe, all tiles slide simultaneously across the board as if pulled by gravity.
When two identical tiles collide while sliding, they fuse together into a brand-new tile with double the value!

### 1.3 The Powers of Two Family
In 2048, every number belongs to the Doubling Family:
- 2 + 2 = 4
- 4 + 4 = 8
- 8 + 8 = 16
- 16 + 16 = 32
- 32 + 32 = 64
- 64 + 64 = 128
- 128 + 128 = 256
- 256 + 256 = 512
- 512 + 512 = 1024
- 1024 + 1024 = 2048!
When two 1024 tiles finally collide into the glorious golden **2048** tile, triumphant victory music celebrates your achievement!

---

## Chapter 2: The Three Iron Rules of Tile Merging

To master 2048, you must understand the three core physical laws governing every slide:

### 2.1 Rule 1: Only Identical Twins Can Merge
- **2 and 2** merge into **4**;
- **4 and 4** merge into **8**;
- But if a **2** hits a **4**, they will never merge. They just pack tightly against each other like solid bricks. Mixing different numbers haphazardly creates roadblocks!

### 2.2 Rule 2: One Merge Per Line Per Swipe (No Greed)
Suppose a row contains four 2s: [2, 2, 2, 2].
If you swipe Left:
- The first two 2s merge into a 4;
- The other two 2s merge into a 4;
- The row becomes [4, 4, empty, empty].
**Key rule**: Those two newly born 4s will NOT merge into an 8 on the same swipe! You must swipe a second time to combine them into an 8.

### 2.3 Rule 3: Where New Baby Tiles Come From
Whenever a swipe successfully moves or merges at least one tile, a new tile appears in an empty room:
- **90% of the time**, it spawns a baby **2** tile;
- **10% of the time**, a friendly big-brother **4** tile drops in.
Your goal is to merge numbers faster than new tiles appear, keeping the board clean and spacious!

---

## Chapter 3: The Secret Weapon: Lock the King's Throne (Corner Anchor)

Beginners usually get stuck around 256 or 512 because their tiles become a scrambled soup in the center of the board.

The master's foundational secret is simple: **Lock your biggest tile in one corner!**

### 3.1 Pick the King's Throne
Pick one corner of the board (bottom-right is the world standard).
Once you create a 128 or 256 tile, crown it as your **King**!
Pin the King to the bottom-right corner and **NEVER let it leave that throne**!

### 3.2 The Three-Direction Rule: Seal the UP Key!
How do you guarantee the King never leaves the corner?
The answer is remarkably simple:
**Put a lock on your UP key (W / Up Arrow). Never press UP!**
- If you swipe Right, the King hits the right wall and stays put;
- If you swipe Down, the King hits the bottom wall and stays put;
- If you swipe Left (with a full bottom row), the King stays anchored in the corner!
- But if you press **UP**, the King lifts off the floor into the middle of the board, and a tiny 2 immediately spawns under the throne, ruining your entire layout!

Remember the golden rule: **Only swipe Left, Right, and Down — NEVER UP!**

---

## Chapter 4: The Snake Order: The Zipper Domino Cascade

Keeping the King in the corner is half the battle. How should the other numbers be organized?
The answer: **Arrange them like a Snake, from largest to smallest!**

### 4.1 The Snake Layout Diagram
Here is what a master's board looks like:

\`\`\`text
[   2,    4,    8,   16 ]  <-- Top Row: Newly spawned small tiles
[ 256,  128,   64,   32 ]  <-- Row 2: Winding leftward
[ 512,  ...,  ...,  ... ]  <-- Row 3: Mid-tier connectors
[1024, 2048,  ...,  ... ]  <-- Bottom Row: The King anchored in the corner
\`\`\`

Or along the bottom two rows:
- Bottom row (left to right): [ 128,  256,  512, 1024(King) ]
- Row above (right to left): [  64,   32,   16,    8 ]

### 4.2 The Zipper Domino Effect!
Why is the Snake layout unbeatable?
Look at the numbers: the tail is 8, followed by 16, 32, 64, 128, 256, 512, leading directly into the King 1024.
As soon as you merge a new **8** near the tail and slide it in:
1. 8 and 8 merge into **16**!
2. 16 hits 16 into **32**!
3. 32 hits 32 into **64**!
4. 64 hits 64 into **128**!
5. 128 hits 128 into **256**!
6. 256 hits 256 into **512**!
7. 512 hits 512 into **1024**!
8. Finally, 1024 slams into the King 1024 — **BOOM! The 2048 tile is born!**
The entire board clears in a single chain reaction, like pulling a zipper!

---

## Chapter 5: Emergency Rescue: What If the King Gets Displaced?

### 5.1 Danger Warning: Keep the Bottom Row Full
Why would swiping Left move your King?
Because the bottom row only had 3 tiles, leaving an open hole on the left! Swiping Left slid the King sideways.
**Solution**: Always keep 4 full tiles occupying the bottom row. When all 4 spots are filled, swiping Left packs them together without moving the King out of the corner.

### 5.2 What If You Were Forced to Press UP?
If a bad board state forced you to press UP, floating the King to row 2:
1. Don't panic! Stop swiping frantically.
2. Check if the space directly beneath the King is empty.
3. If it is empty, **press DOWN immediately** to plant the King back on the throne!
4. If a small 2 spawned under it, make one or two gentle lateral swipes to merge that small tile away, then immediately slam DOWN!

---

## Chapter 6: Multiplayer Speed PK Arena Tactics

In Puzzle PK's online multiplayer arena, you duel opponents in real time:

### 6.1 Identical Random Seeds
Both players receive the exact same tile spawns in the exact same positions. Victory depends purely on spatial foresight and fluid swipe speed.

### 6.2 The Triangle Rhythm: Down-Left-Down-Right
Competitive speedrunners use a rhythmic triangle swipe: **Down, Left, Down, Right**.
Because you cycle smoothly through the three safe directions, you can swipe 4 to 6 times per second without moving your highest tile!

### 6.3 Never Panic Under Pressure
The HUD shows your rival's score and highest tile in real time. Even if your opponent hits 1024 first, stay calm! One clean zipper merge can swing the game in your favor instantly.

---

## Chapter 7: FAQ & The Twelve-Word Master Creed

### Q: How many moves does it take to create a 2048 tile?
**A: Usually between 1,000 and 1,500 swipes.** It is a test of patience, rhythm, and steady discipline.

### Q: Does the game stop after 2048?
**A: No! 2048 is just the beginning.** You can continue playing for 4096, 8192, and beyond. The theoretical mathematical limit on a 4×4 board is an astonishing 131072!

### The Twelve-Word Master Creed
> **"Keep king in corner; snake high to low; lock the up key; zipper and glow!"**`;

const updatedRules = {
  zh: zhRules,
  en: enRules,
  es: seoDescMap.es,
  ja: seoDescMap.ja,
  ko: seoDescMap.ko,
  pt: seoDescMap.pt,
  fr: seoDescMap.fr,
  de: seoDescMap.de
};

// ==========================================
// 3. Execution: Update i18n JSON files
// ==========================================
console.log('1. Updating i18n JSON files for game.classic2048.seo_desc...');
const languages = ['zh', 'en', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
for (const lang of languages) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const newDesc = seoDescMap[lang] || seoDescMap.en;
  content['game.classic2048.seo_desc'] = newDesc;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  Updated ${lang}.json (length: ${newDesc.length} chars)`);
}

// ==========================================
// 4. Execution: Update games-docs.json
// ==========================================
console.log('2. Updating games-docs.json for classic2048...');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
const c2048 = docs.find(d => d.id === 'classic2048');
if (!c2048) {
  console.error('classic2048 not found in games-docs.json!');
  process.exit(1);
}

c2048.rules = JSON.stringify(updatedRules);
fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf-8');
console.log(`  Successfully updated classic2048 in games-docs.json! (zh length: ${zhRules.length}, en length: ${enRules.length})`);

// Sanity checks
if (zhRules.includes('$')) console.error('WARNING: zhRules contains $ !');
else console.log('  Sanity check PASSED: zhRules contains ZERO dollar signs ($)!');

if (enRules.includes('$')) console.error('WARNING: enRules contains $ !');
else console.log('  Sanity check PASSED: enRules contains ZERO dollar signs ($)!');

if (seoDescMap.zh.includes('$')) console.error('WARNING: seoDescMap.zh contains $ !');
else console.log('  Sanity check PASSED: seoDescMap.zh contains ZERO dollar signs ($)!');
