const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'src/assets/i18n');
const docsPath = path.join(root, 'public/assets/games-docs.json');

// ==========================================
// 1. Layer 1: In-Page Tactical Quick-Guide (Friendly, Plain, No LaTeX)
// ==========================================
const seoDescMap = {
  zh: `<h2>关于连线 (Connect Colors / 连点成线 / 水管工拼图)</h2>
<p><strong>连线 (Connect Colors)</strong> 是一款规则极简、却蕴含着奇妙空间规划美感的经典连线解谜游戏（在国际上常被称为 Numberlink 或 Flow Free）。你的任务就像一位神奇的城市水管工程师：在方格棋盘上，为每一对相同颜色和数字的双胞胎圆点铺设一条专属管道。<strong>所有的水管绝对不能交叉打架，而且最神奇的是——全镇的每一个小方格都必须被水管刚好填满（100% 满铺全覆盖）！</strong>支持手机触屏丝滑滑动和电脑键鼠操作，免安装即开即玩！</p>

<h3>全平台按键与操控速查表</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">操作类型</th>
        <th class="p-2 border border-[var(--color-border-card)]">鼠标交互</th>
        <th class="p-2 border border-[var(--color-border-card)]">触控手势 (手机 / 平板)</th>
        <th class="p-2 border border-[var(--color-border-card)]">键盘快捷键</th>
        <th class="p-2 border border-[var(--color-border-card)]">功能说明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">画线连通</td>
        <td class="p-2 border border-[var(--color-border-card)]">按住彩色圆点拖拽至目标圆点</td>
        <td class="p-2 border border-[var(--color-border-card)]">手指按住圆点拖拽至相同颜色圆点</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">在两点之间铺设彩色连线管道</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">回退 / 截断水管</td>
        <td class="p-2 border border-[var(--color-border-card)]">从水管任意中间格反向回拖</td>
        <td class="p-2 border border-[var(--color-border-card)]">手指沿原路回滑或点击断点</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">快速截断或擦除画错的多余管道路径</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">AI 智能提示</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部的灯泡 💡 提示按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触工具栏灯泡图标</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>H</kbd> 键</td>
        <td class="p-2 border border-[var(--color-border-card)]">单人模式下自动为你揭晓并连接一条正确的管道</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">一键重开 (Restart)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击重开按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触重置按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd> 键</td>
        <td class="p-2 border border-[var(--color-border-card)]">单人模式下一键清空所有已铺管道，重新开局</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>通关两大核心法则速查</h3>
<ul>
  <li><strong>同色两两连接，绝不可交叉</strong>：每一对相同颜色/相同数字的圆点之间必须用管道连通。<strong>水管之间绝对不能互相交叉或重叠</strong>！如果你强行从已有的管道上面穿过去，原本的旧管道就会立刻断裂，必须重新铺设。</li>
  <li><strong>100% 满盘覆盖铁律</strong>：这是最容易被新手忽略的规则！棋盘里的每一个格子都必须有水管经过，不能留下任何一个空白格。如果全部颜色都连好了但还有空格没填满，空格会闪烁金色小星星 ✦，提醒你水管需要绕弯占满！</li>
</ul>

<h3>四大破案连线定式（中小学生秒懂指南）</h3>
<ul>
  <li><strong>定式一：贴墙走外围（外圈优先法）</strong>：靠近棋盘四条边框或四个角落的圆点，往往只有一条唯一的出口。千万不要往中间挤，紧贴着最外层的墙壁把外围格子顺手填满，地基立刻就稳了！</li>
  <li><strong>定式二：小短腿先拉手（短距离优先）</strong>：离得很近、中间没有障碍的同色圆点，优先用最短最贴边的方式连好，把中间宽敞开阔的大马路留给需要远距离长途跋涉的大数字！</li>
  <li><strong>定式三：瓶颈窄道莫乱占</strong>：当两个区域之间只有一条一格宽的狭窄过道时，一定要三思而后行！想想谁必须通过这条独木桥，千万不要被别的线顺手霸占导致其他颜色进退两难。</li>
  <li><strong>定式四：贪吃蛇 S 形绕弯补漏</strong>：如果所有颜色都连上了，却发现旁边孤零零剩了两个空格？别慌！找到旁边的一条直线水管，把它拉长拐一个 S 形弯把空格踩满，100% 满铺通关就水到渠成了！</li>
</ul>

<h3>双人实时 Speed PK 竞速对决</h3>
<ul>
  <li><strong>完全一致的随机种子</strong>：对战双方获得完全相同的圆点分布与网格尺寸，100% 公平竞技。</li>
  <li><strong>毫秒级进度实时显示</strong>：顶部仪表盘实时展示你和对手的完成百分比（0% 直至 100%）。先将所有颜色正确连接并达成 100% 满铺者夺冠！</li>
</ul>

<h2>常见问题解答 (FAQ)</h2>
<h3>为什么我已经把所有颜色都连上了，游戏还是没有通关？</h3>
<p>请仔细看棋盘上是不是还有暗色的小方格没有水管经过？连线游戏要求必须 <strong>100% 填满所有格子</strong>！未填满的空格上会闪烁金色小星光 ✦，找一条临近的水管绕个弯把空格踩满即可通关！</p>

<h3>高级关卡里的灰色深色方块是什么？</h3>
<p>那是不可穿越的石头障碍物！水管无法穿过障碍物，只能像流水绕过石头一样从旁边绕行。</p>

<h3>遇到高难度大棋盘卡关了怎么办？</h3>
<p>在单人模式下随时可以按下键盘 <kbd>H</kbd> 键或者点击顶部 💡 提示按钮，AI 会贴心地为你揭晓一条关键管道，带你瞬间走出迷宫！</p>`,

  en: `<h2>About Connect Colors (Numberlink / Flow Puzzle)</h2>
<p><strong>Connect Colors</strong> (widely known internationally as Numberlink or Flow Free) is a beloved spatial logic puzzle. Your mission is simple yet delightfully challenging: connect matching pairs of colored and numbered dots by drawing continuous pipes between them. <strong>Pipes cannot cross or overlap, and every single square on the board must be fully covered (100% board coverage)!</strong> Smooth, intuitive touch drag and keyboard controls make it ideal for puzzle lovers of all ages.</p>

<h3>Controls & Keyboard Shortcuts Guide</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">Action</th>
        <th class="p-2 border border-[var(--color-border-card)]">Mouse Interaction</th>
        <th class="p-2 border border-[var(--color-border-card)]">Touch Gesture (Phone / Tablet)</th>
        <th class="p-2 border border-[var(--color-border-card)]">Keyboard Key</th>
        <th class="p-2 border border-[var(--color-border-card)]">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Draw Pipe</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click and drag from dot to dot</td>
        <td class="p-2 border border-[var(--color-border-card)]">Press dot and drag finger to target</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">Draws a colored pipe connecting matching dots</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Retract / Trim</td>
        <td class="p-2 border border-[var(--color-border-card)]">Drag backward along pipe path</td>
        <td class="p-2 border border-[var(--color-border-card)]">Slide finger backward along line</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">Shortens or clears an errant pipe segment</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">AI Hint</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click top lightbulb 💡 button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap hint lightbulb icon</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>H</kbd> Key</td>
        <td class="p-2 border border-[var(--color-border-card)]">Reveals and connects one correct pipe in solo mode</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Restart Board</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click restart button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap restart icon</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd> Key</td>
        <td class="p-2 border border-[var(--color-border-card)]">Clears all drawn pipes to start the board fresh</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>The Two Golden Rules of Connect Colors</h3>
<ul>
  <li><strong>Connect Pairs with No Crossings</strong>: Connect every pair of matching colored dots. Pipes cannot cross or overlap. If you drag a new pipe across an existing one, the old pipe breaks!</li>
  <li><strong>100% Full Board Coverage</strong>: Every single square on the grid must be covered by a pipe. If all pairs are connected but empty squares remain, pulsing stars ✦ will highlight the unfilled spots!</li>
</ul>

<h3>Four Essential Solving Tactics</h3>
<ul>
  <li><strong>Hug the Outer Border First</strong>: Dots near the outer walls and corners usually have only one viable path. Trace the boundary first to leave open space in the center.</li>
  <li><strong>Connect Short Distances Early</strong>: Pair up adjacent dots with tight paths so they don't block longer routes.</li>
  <li><strong>Respect Narrow Bottlenecks</strong>: When two zones are separated by a one-cell corridor, only the pipe that truly needs to cross should use it.</li>
  <li><strong>Snake Winding for 100% Coverage</strong>: If all dots are connected but a few empty squares remain, take a straight pipe nearby and wind it in an S-curve to fill the gaps!</li>
</ul>

<h3>Real-Time Speed PK Arena</h3>
<ul>
  <li><strong>Fair Identical Seed</strong>: Both players solve the exact same board setup simultaneously.</li>
  <li><strong>First to 100% Wins</strong>: Watch your rival's live progress percentage in the top HUD and race to complete all pipes!</li>
</ul>`,

  es: `<h2>Acerca de Conectar Colores (Numberlink / Flow)</h2>
<p><strong>Conectar Colores</strong> es un ingenioso juego de lógica visual. Une los puntos del mismo color mediante tuberías continuas. ¡Las líneas no pueden cruzarse y debes <strong>cubrir el 100% del tablero</strong> para ganar!</p>
<h3>Controles Clave</h3>
<ul>
  <li><strong>Trazar línea</strong>: Arrastra de un punto a su pareja del mismo color.</li>
  <li><strong>Pista AI</strong>: Pulsa la tecla <kbd>H</kbd> o el icono de bombilla 💡.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd> para reiniciar el nivel.</li>
</ul>
<h3>Estrategia Maestra</h3>
<p>Comienza conectando los puntos situados en los bordes y esquinas. Mantén las líneas cortas y compactas para no bloquear el centro.</p>`,

  ja: `<h2>コネクトカラーズ（ナンバーリンク / 線の接続パズル）</h2>
<p><strong>コネクトカラーズ</strong>は、同じ色や数字のドット同士をパイプで繋ぐ大人気ロジックパズルです。パイプ同士は交差できず、さらに<strong>すべてのマスを100%隙間なく埋め尽くす</strong>ことでステージクリアとなります！</p>
<h3>操作方法</h3>
<ul>
  <li><strong>線を引く</strong>：ドットをタップまたはドラッグして同じ色のドットへ繋ぐ。</li>
  <li><strong>ヒント</strong>：<kbd>H</kbd> キーまたは 💡 ボタンで正しいパイプを1本表示。</li>
  <li><strong>リスタート</strong>：<kbd>R</kbd> キーで盤面を初期化。</li>
</ul>
<h3>攻略のコツ：外枠から攻める！</h3>
<p>四隅や外壁沿いにあるドットから順に、壁に沿わせて繋げていくのが最も確実な解法です！</p>`,

  ko: `<h2>커넥트 컬러 (선 잇기 / 넘버링크 퍼즐)</h2>
<p><strong>커넥트 컬러</strong>는 같은 색깔과 숫자의 점들을 파이프로 연결하는 두뇌 퍼즐입니다. 선끼리는 절대 교차할 수 없으며, <strong>판의 모든 빈칸을 100% 채워야</strong> 완벽하게 클리어됩니다!</p>
<h3>조작법</h3>
<ul>
  <li><strong>선 연결</strong>: 원형 점을 드래그하여 같은 색의 점으로 잇기.</li>
  <li><strong>힌트</strong>: <kbd>H</kbd> 키 또는 💡 전구 아이콘.</li>
  <li><strong>다시 시작</strong>: <kbd>R</kbd> 키로 모든 선 초기화.</li>
</ul>
<h3>핵심 팁: 외곽 테두리부터 채우기</h3>
<p>가장자리와 모서리에 있는 점부터 벽을 따라 연결해 나가면 중앙 공간이 넓어져 쉽게 풀립니다!</p>`,

  pt: `<h2>Sobre Conectar Cores (Numberlink / Flow)</h2>
<p><strong>Conectar Cores</strong> é um relaxante desafio de lógica: ligue pares de pontos iguais sem cruzar linhas e cubra 100% das casas do tabuleiro!</p>
<h3>Controles</h3>
<ul>
  <li><strong>Desenhar Linha</strong>: Clique e arraste de um ponto ao seu par.</li>
  <li><strong>Dica AI</strong>: Tecla <kbd>H</kbd> ou ícone de lâmpada 💡.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd>.</li>
</ul>`,

  fr: `<h2>À Propos de Connect Colors (Numberlink)</h2>
<p><strong>Connect Colors</strong> est un jeu de réflexion visuelle : reliez les points de même couleur sans jamais croiser les tuyaux, en recouvrant 100% de la grille !</p>
<h3>Commandes</h3>
<ul>
  <li><strong>Tracer</strong> : Glissez entre deux points de même couleur.</li>
  <li><strong>Indice</strong> : Touche <kbd>H</kbd> ou icône ampoule 💡.</li>
  <li><strong>Recommencer</strong> : Touche <kbd>R</kbd>.</li>
</ul>`,

  de: `<h2>Über Connect Colors (Punkte Verbinden / Flow)</h2>
<p><strong>Connect Colors</strong> ist ein fesselndes Logikrätsel: Verbinde gleiche Farbpaare mit Röhren. Keine Röhre darf sich kreuzen und 100% aller Felder müssen belegt sein!</p>
<h3>Steuerung</h3>
<ul>
  <li><strong>Verbinden</strong>: Von Punkt zu Punkt ziehen.</li>
  <li><strong>Tipp</strong>: Taste <kbd>H</kbd> oder Glühbirnen-Symbol 💡.</li>
  <li><strong>Neustart</strong>: Taste <kbd>R</kbd>.</li>
</ul>`
};

// ==========================================
// 2. Layer 2: Deep Masterpiece Guide (Easy for 8-14 Year Olds, Zero LaTeX)
// ==========================================
const zhRules = `## 第一章：连线到底是什么？失散双胞胎的彩虹管道魔法

欢迎来到 **Puzzle PK 连线消消乐 (Connect Colors / Numberlink) 趣味通关全书**！不管你是小学刚接触连线涂色的小朋友，还是喜欢挑战 10×10、12×12 超大迷宫的初高中解谜达人，只要掌握几个像铺地砖一样简单有趣的技巧，你就能一口气把所有彩虹管道顺利铺好，绝不卡关！

### 1.1 那个源自日本的百年经典：Numberlink
连线游戏有着非常悠久的历史。早在 19 世纪末，日本的数学家和益智大师们就构思出了一种叫做 **Numberlink（数字连环）** 的纸笔逻辑游戏。
后来，智能手机风靡全球，人们把它做成了像水管工修水管一样的趣味游戏（也就是大家非常熟悉的《Flow Free》）。
无论叫它“连线”、“水管工”还是“彩虹管道”，它内在的数学空间美学都是完全一致的！

### 1.2 方格小镇与失散的彩色双胞胎
游戏的舞台是一个个方方正正的小网格（从简单的小 5×5，一直到大师级的 12×12）。
在网格的小房间里，住着几对相同颜色、相同数字的彩色双胞胎小水滴（比如两个红色 1、两个蓝色 2、两个黄色 3……）。
你的任务就是拿起画笔，在它们之间铺设一条条结实平整的彩色水管，把每一对失散的双胞胎紧紧连接在一起！

### 1.3 取得胜利的两大不可违背铁律
想要通关，必须同时满足两条要求，缺一不可：
1. **铁律一：每对双胞胎必须独占一条水管**：
   - 红色只能连红色，蓝色只能连蓝色，绝不能接错龙头；
2. **铁律二：全镇每一个格子都必须铺满（100% 满铺全覆盖）**：
   - 这条是最多初学者忽略的超级规则！
   - 你不仅要把所有颜色连好，而且**棋盘里的每一个小方格都必须刚好有一截水管走过**！不能留下任何一块空着的地砖！

---

## 第二章：水管铺设的三大物理铁律：严禁撞车与强行破管

在动笔画线之前，请牢牢记住这三个像物理定律一样的基础规则：

### 2.1 铁律一：水管不能搭立交桥（绝对禁止交叉）
在连线的世界里，所有管道都铺在同一层地面上，**没有地下室，也没有天桥**！
- 红色水管绝不能从蓝色水管上面“跨过去”；
- 如果你硬要从一条已经画好的水管上面穿过去，系统就会判定管道破裂——**原先那条旧水管就会立刻断开消失**，你必须回过头重新修！

### 2.2 铁律二：只能走十字步，严禁斜着抄近道
水管必须老老实实沿着方格的横向（左、右）或者纵向（上、下）直线铺设。
方块之间绝不能斜着穿过对角线。每走一步，就老老实实占领一个完整的方格。

### 2.3 铁律三：黑色大石头（无法穿透的巨石障碍物）
在部分高难度进阶关卡中，棋盘里会出现一些深灰色的石块方格。
这些大石块是小镇里坚硬的花岗岩，水管无法钻进去，也无法占领它。你必须像山间清泉绕开巨石一样，巧妙地从石块旁边绕道通行。

---

## 第三章：破案第一大绝招：贴着墙根走外围（外圈优先法）

拿到一张全新的大棋盘，面对密密麻麻的圆点，第一条线应该从哪里画起呢？
答案就是：**专找外围，贴着墙根走！**

### 3.1 为什么先走中间会把自己活活困死？
很多新手一开局，看见棋盘中间有两个圆点离得很近，就随手在正中间画了一条线。
结果呢？这条横在正中央的水管，就像一道高墙，把棋盘硬生生切成了两半！
后面的长水管想要从左边跑到右边，发现路被死死堵住，进退两难，整盘瞬间变成死局！

### 3.2 围墙边缘的唯一生路
请你仔细看棋盘最外面的四条边和四个角落：
- 如果一个圆点刚好贴在最外边的墙壁上，甚至就在角落里：
- 它能往哪里走？它绝不可能往棋盘外面跑，它的选择通常**只有唯一的一条路**！
- 这条唯一的生路就是：**贴着墙根往里顺延！**

### 3.3 外圈滚雪球效应
当你把最外圈的几个圆点贴着墙壁连好之后，你会惊奇地发现：
最外层的一整圈格子，全都被规规整整地铺满了水管！
这时候，原来的 10×10 大棋盘，就等于被我们剥去了一层皮，缩小成了 8×8 的内部小棋盘！
一层一层往里剥，大迷宫就会变得像剥洋葱一样简单！

---

## 第四章：破案第二大绝招：小短腿先拉手与独木桥抢占

外圈铺好之后，内圈的水管该怎么规划呢？记住这两个神奇定式：

### 4.1 离得近的小伙伴先拉手（短线优先法）
看看剩下的圆点里，有没有靠得很近的邻居？
- 如果两颗绿色小水滴只隔了一两个格子，中间又没有其他颜色阻挡：
- 赶紧用最短、最紧凑的路线把它们连上！
- 为什么呢？因为把短距离的水管迅速解决，不仅省心，还能把中间大片大片的开阔地带腾出来，留给那些必须从东南角跑到西北角的远距离水管！

### 4.2 独木桥瓶颈法则
有时候，两片开阔区域之间只有一条**只有一格宽度的狭窄走廊**。
这条窄走廊就像一座惊险的独木桥，每次只能允许一条水管通过！
这时候问问自己：
“到底哪一种颜色是必须跨过这座独木桥的？”
一旦确定了必须过桥的那个颜色，**赶紧把独木桥通行权留给它**！
如果别的不相干的水管贪图方便占了独木桥，整盘棋就必定死锁无解。

### 4.3 绝不留下死胡同
在你每次拐弯拉线的时候，用余光看一眼身后的空地：
千万不要画一个大大的“C”字形或者口袋形状，把某个别的圆点孤零零地封死在口袋里面！
如果被你圈在口袋里的圆点找不到出路，那就是你刚才拐弯拐错啦，赶紧按住水管退回来！

---

## 第五章：救命时刻：所有颜色都连上了，为什么还不通关？（满铺绕弯术）

几乎每一个玩连线的小朋友和大朋友，都会遇到这种令人抓狂的时刻：
“我明明把红、黄、蓝、绿所有颜色都连上了，为什么游戏不结算？难道电脑出 bug 啦？”

别着急！电脑没有出 bug，这是连线游戏最神奇的“满铺规则”在考验你！

### 5.1 闪烁金色光芒的小星星 ✦
请睁大眼睛仔细看棋盘：
是不是有两三个暗灰色的格子空荡荡的，里面根本没有水管经过？
在我们的 Puzzle PK 游戏中，只要所有颜色连接完成、但棋盘覆盖率还没达到 100% 时，**那些被遗漏的空格就会一闪一闪亮起金色的脉冲小星星 ✦**！
小星星在告诉你：“喂！我这里还空着呢，快来填满我！”

### 5.2 贪吃蛇 S 形绕弯术：直管变弯管
怎么在不切断颜色的情况下填满那些孤零零的空格呢？
办法超级简单，叫**“直管变弯管”**：
1. 看看离金色小星星最近的地方，是哪一条水管？
2. 比如有一条黄色水管，刚才为了图快，直愣愣地从旁边一笔穿过去了；
3. 把这条黄色水管擦掉一点点，让它不要走直线；
4. 让黄色水管像贪吃蛇一样，特意拐一个弯，先踩进有小星星的空格里，再拐出来连到终点！
5. 这样一来，颜色依然顺利连接，而空闲的格子也被顺手填满，**100% 满铺全覆盖！大吉大利，完美通关！**

---

## 第六章：双人 Speed PK 极速对决：手速与空间预判

在 Puzzle PK 的在线竞技场中，单机拼图将转化为令人心跳加速的双人实时竞速！

### 6.1 绝对公平的发牌种子
对战房间里的两位选手，拿到的棋盘尺寸、圆点分布、颜色位置 **100% 完全相同**！
完全不拼运气，只拼谁的大脑更快看清全局管道走势！

### 6.2 职业高手的极速手势流
1. **开局前 2 秒扫描外围**：比赛哨声一响，先别慌着落笔，扫一眼四个角落和四条边，锁定两到三条贴墙水管；
2. **两点一拉，行云流水**：手指在屏幕上平滑拖动，画完一条立刻接下一条，手指在空中不发呆；
3. **顶栏进度条心理战**：顶部仪表盘会毫秒级显示你和对手的完成度（比如 75% vs 60%）。看到对手逼近不要慌，往往对手只差一格没满铺就会卡住十几秒，保持自己的满铺节奏就能稳稳反超！

---

## 第七章：高频小问答 (FAQ) 与十二字独门心诀

### 问：遇到 10×10 或者 12×12 的超级大图完全看不出头绪，可以使用提示吗？
**答：当然可以！**
在单人练习模式下，随时可以点击顶部的 💡 灯泡按钮或者按下键盘上的 <kbd>H</kbd> 键。系统内置的智能寻路引擎会立刻帮你揭晓并连接好一条绝对正确的关键管道，瞬间帮你打开死局！

### 问：画错了一条线，需要全盘重新来过吗？
**答：完全不需要！**
你只需要把手指或鼠标放在画错的水管末端，顺着原路往回滑，就能像倒带一样擦除多余的部分；或者直接重新拉动新的端点，旧线就会自动调整。

### 问：为什么连线游戏对大脑特别有好处？
**答：它是培养空间几何大局观的神器！**
玩连线必须同时考虑“眼前的这一步”和“远处的另一个颜色能不能过得去”。经常玩连线的小朋友，在立体几何、路径规划和抗挫折耐心方面都会远超同龄人！

### 连线通关绝世十二字心诀
> **「贴边走外，短线先连；莫留死角，绕弯填满。」**
> 牢牢背熟这十二个字：先沿最外圈贴墙走，把短线就近连好，不给任何颜色留封闭死角，遇到空格绕个弯把它填满，每一关你都是满星大赢家！`;

const enRules = `## Chapter 1: What is Connect Colors? The Magic of Rainbow Water Pipes

Welcome to the **Puzzle PK Fun & Friendly Connect Colors (Numberlink) Master Guide**! Whether you are an elementary school student learning puzzle logic or an advanced player tackling giant 10x10 and 12x12 grids, mastering a few intuitive spatial tricks will allow you to solve every single board smoothly with 100% pure deduction — zero guesswork required!

### 1.1 The Century-Old Legend: Numberlink
Connect Colors has an incredible history. In late 19th-century Japan, puzzle architects created a grid-based pencil game called **Numberlink**.
Later with smartphones, it captivated millions worldwide under titles like *Flow Free*.
Whether you call it Numberlink, Flow, Pipe Connect, or Rainbow Paths, the underlying mathematical beauty of spatial pathfinding remains pure and timeless!

### 1.2 The Board and the Separated Color Twins
The board is a neat grid of squares (ranging from friendly 5x5 up to challenging 12x12 grids).
Scattered across the rooms are pairs of matching colored dots (two reds, two blues, two yellows, etc.).
Your job as the master engineer is to lay down smooth pipelines on the grid to reconnect each pair of matching twins!

### 1.3 The Two Golden Rules of Victory
To win a level, you must fulfill two rules simultaneously:
1. **Rule 1: Every color pair must have its own pipe**:
   - Red connects only to Red, Blue to Blue. No mix-ups allowed!
2. **Rule 2: Every single square must be covered (100% Full Board Coverage)**:
   - This is the number-one rule beginners forget!
   - You must not only connect the pairs, but **every single tile on the board must have a pipe running through it**. Leaving even a single empty square means the puzzle is not finished!

---

## Chapter 2: The Three Physical Laws of Pipe Laying

Before drawing your first line, keep these three physical laws in mind:

### 2.1 Law 1: No Bridges or Overpasses (Zero Line Crossings)
All pipes are laid on the same floor level — there are no underground tunnels or overhead bridges!
- Red pipes can never cross over Blue pipes;
- If you force a pipe to cut across an existing one, the old pipe **instantly breaks**, and you will have to redraw it from scratch!

### 2.2 Law 2: Orthogonal Steps Only (No Diagonal Shortcuts)
Pipes must move cleanly along the grid lines: Up, Down, Left, or Right.
Cutting diagonally across corners is strictly prohibited. Every step occupies one full square.

### 2.3 Law 3: Grey Granite Obstacles
In advanced levels, dark grey rock blocks may appear in the grid.
These are solid granite obstacles that pipes cannot penetrate. You must navigate your pipes smoothly around them, just like a stream flowing around boulders!

---

## Chapter 3: Golden Secret 1: Hug the Outer Walls (Perimeter First)

When facing a brand-new board with dots everywhere, where should you start?
The master's answer: **Find dots near the outer border and hug the walls!**

### 3.1 Why Starting in the Middle Traps You
Beginners often see two dots close together in the center and immediately draw a straight line between them.
That central pipe acts like a giant brick wall cutting the board in half! Later, pipes from the left can no longer reach the right, leading straight to a dead end!

### 3.2 The Unique Escape Route on the Walls
Look closely at the four outer borders and four corners:
- A dot situated on the perimeter wall or tucked into a corner has almost **no choice**;
- It cannot travel off the board, so its only valid path is to **hug the outer wall**!

### 3.3 The Onion Peeling Effect
Once you hug the perimeter with the outer dots, the entire outer ring of squares gets neatly filled with pipes.
Your 10x10 puzzle effectively shrinks into an 8x8 inner puzzle! Peeling off outer layers makes giant mazes feel effortless.

---

## Chapter 4: Golden Secret 2: Short Paths Early & Narrow Corridors

Once the outer walls are secured, how do you solve the interior?

### 4.1 Short-Distance Twins Connect First
Look for matching dots that sit close to each other without obstacles in between.
Connect them with tight, compact paths right away! This frees up wide-open central territory for the longer pipes that have to travel across the entire board.

### 4.2 The Narrow Bridge Bottleneck
Sometimes, two large areas of the board are joined by a corridor that is **only one square wide**.
That narrow corridor can only fit **one single pipe**!
Ask yourself: "Which color truly needs to pass through this bridge?"
Once identified, **reserve that bridge strictly for that color**. If another pipe wanders through it carelessly, the entire puzzle becomes impossible.

### 4.3 Never Trap a Dot in a Dead-End Pocket
As you bend your pipes around corners, always check behind you:
Never draw a loop or a "C"-shape that walls off an opposing dot into a closed box with no way out!

---

## Chapter 5: Emergency Fix: All Colors Connected but Not Clearing?

Almost every player hits this confusing moment:
"I connected every color! Why didn't the level complete?"

The puzzle is not broken — it's the **100% Full Coverage Rule** at work!

### 5.1 The Pulsing Golden Stars ✦
Look closely at the board:
Are there two or three dark, empty squares with no pipes running through them?
In Puzzle PK, whenever all colors are linked but coverage is below 100%, **the empty squares will pulse with sparkling golden stars ✦**!
The stars are waving at you: "Hey! We are empty! Come cover us!"

### 5.2 The Snake Winding Trick (Straight Pipes into S-Curves)
How do you fill those empty squares without disconnecting your colors?
The trick is **"Make Straight Pipes Wavy"**:
1. Find a straight pipe running next to the empty star squares.
2. Erase that straight segment slightly.
3. Bend the pipe like a snake: route it in an S-curve to step onto the star squares, then continue to its destination!
4. All colors stay connected, every square is covered, and **BAM! 100% Full Board Coverage victory!**

---

## Chapter 6: Real-Time Speed PK Arena: Reflexes & Rhythm

In Puzzle PK's online multiplayer arena, you duel opponents in real time:

### 6.1 Identical Random Seeds for 100% Fairness
Both players receive the exact same board dimensions and dot locations. Victory is purely a test of quick spatial foresight!

### 6.2 Master Speed Gestures
1. **First 2 Seconds**: Scan the perimeter and corners to lock in 2 or 3 wall-hugging pipes.
2. **Fluid Dragging**: Keep your finger or mouse moving smoothly from dot to dot without hesitation.
3. **Top HUD Progress Bar**: Watch your rival's live percentage (e.g. 75% vs 60%). Even if an opponent is ahead, they often get stuck searching for that last 1% unfilled square, giving you the perfect window to overtake them!

---

## Chapter 7: FAQ & The Twelve-Word Master Creed

### Q: Can I use hints on giant 10x10 or 12x12 boards?
**A: Yes!** In solo mode, press <kbd>H</kbd> or click the 💡 button anytime. The built-in pathfinder will instantly lay down a guaranteed correct pipe to break open the puzzle.

### Q: If I make a mistake, do I have to restart from scratch?
**A: Not at all!** Just drag backward along the pipe to retract the erroneous segment, or click on a dot to redraw that specific color.

### The Twelve-Word Master Creed
> **"Hug the borders; connect short first; leave no pockets; wind and fill!"**`;

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
console.log('1. Updating i18n JSON files for game.connect.seo_desc...');
const languages = ['zh', 'en', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
for (const lang of languages) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const newDesc = seoDescMap[lang] || seoDescMap.en;
  content['game.connect.seo_desc'] = newDesc;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  Updated ${lang}.json (length: ${newDesc.length} chars)`);
}

// ==========================================
// 4. Execution: Update games-docs.json
// ==========================================
console.log('2. Updating games-docs.json for connect...');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
const conn = docs.find(d => d.id === 'connect');
if (!conn) {
  console.error('connect not found in games-docs.json!');
  process.exit(1);
}

conn.rules = JSON.stringify(updatedRules);
fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf-8');
console.log(`  Successfully updated connect in games-docs.json! (zh length: ${zhRules.length}, en length: ${enRules.length})`);

// Sanity checks: verify ZERO dollar signs ($)
if (zhRules.includes('$')) console.error('WARNING: zhRules contains $ !');
else console.log('  Sanity check PASSED: zhRules contains ZERO dollar signs ($)!');

if (enRules.includes('$')) console.error('WARNING: enRules contains $ !');
else console.log('  Sanity check PASSED: enRules contains ZERO dollar signs ($)!');

if (seoDescMap.zh.includes('$')) console.error('WARNING: seoDescMap.zh contains $ !');
else console.log('  Sanity check PASSED: seoDescMap.zh contains ZERO dollar signs ($)!');
