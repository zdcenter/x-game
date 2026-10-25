const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'src/assets/i18n');
const docsPath = path.join(root, 'public/assets/games-docs.json');

// ==========================================
// 1. Layer 1: In-Page Tactical Quick-Guide (Friendly, Plain, No LaTeX)
// ==========================================
const seoDescMap = {
  zh: `<h2>关于桥梁谜题 (Hashi / 数桥 / 架桥大侦探)</h2>
<p><strong>桥梁谜题 (Hashiwokakero / Hashi / 数桥)</strong> 是一款源自日本益智圣殿 Nikoli 的经典纯逻辑造桥解谜游戏。在一片宁静蔚蓝的群岛海域中，散落着带有数字的圆形“海岛”。你的任务是化身桥梁总工程师，在相邻海岛之间架设横向或纵向的大桥。<strong>每一座海岛连出的桥梁总数必须正好等于岛上的数字，两座岛之间最多只能架双桥，而且所有桥梁绝不能交叉，最终要把所有海岛联通成一个互联互通的大家庭！</strong>免下载安装，随时开启脑力挑战！</p>

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
        <td class="p-2 border border-[var(--color-border-card)] font-bold">造桥 / 增桥 / 拆桥</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击起点海岛，再点击目标海岛</td>
        <td class="p-2 border border-[var(--color-border-card)]">手指从起点海岛滑向目标海岛</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">在两座相邻海岛间循环轮转：架单桥(1) → 架双桥(2) → 拆除(0)</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">AI 智能提示</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部的灯泡 💡 提示按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触工具栏灯泡图标</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>H</kbd> 键</td>
        <td class="p-2 border border-[var(--color-border-card)]">单人练习模式下自动为你架设一座绝对正确的关键桥梁</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">一键重开 (Restart)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部重开按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触重置按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd> 键</td>
        <td class="p-2 border border-[var(--color-border-card)]">单人模式下一键清空所有已架设的桥梁，重置计时器</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>造桥三大物理铁律速查</h3>
<ul>
  <li><strong>数字是死命令</strong>：每个海岛圆圈里的数字（1 到 8），代表从这座岛向外连接出去的桥梁总数。桥架够了岛屿变灰绿满足，架超了会变红报警！</li>
  <li><strong>直来直往，最多双桥</strong>：桥梁只能沿着横向（左、右）或者纵向（上、下）直线修建，绝对不允许斜着飞！任意两座相邻岛屿之间，最多只能架设 2 座平行桥（单桥或双桥），绝不能架第 3 座！</li>
  <li><strong>严禁十字交叉与穿岛</strong>：桥梁绝不能互相十字交叉，也绝不能穿过中间的其他海岛！桥梁在海面上不能搭立交桥。</li>
  <li><strong>全网大联通原则</strong>：通关时，所有海岛必须通过桥梁连成一整张大网，绝不能出现自娱自乐、与外部世界完全隔绝的“孤岛局域网”！</li>
</ul>

<h3>四大破案造桥定式（中小学生秒懂指南）</h3>
<ul>
  <li><strong>定式一：大胃王 8 号与角落 4 号（满员秒杀）</strong>：四面环海的 8 号岛必定上下左右各架双桥（2+2+2+2=8）；贴在角落只有两个方向的 4 号岛必定两个方向各架双桥（2+2=4）；贴在边框只有三个方向的 6 号岛必定三个方向各架双桥（2+2+2=6）！</li>
  <li><strong>定式二：角落 3 号与边缘 5 号（保底一座桥）</strong>：角落的 3 号岛只有 2 个方向，每个方向必定保底架设至少 1 座桥（因为如果某方向不架桥，另一边最多只能架 2 座，根本不够 3 座！同理边缘 5 号岛三个方向各保底 1 座桥）！</li>
  <li><strong>定式三：唯一邻居大营救</strong>：如果某个海岛放眼望去只有一个方向能连邻居（比如写着 1 且四周只有一座邻岛），不用犹豫，那唯一的一座桥必须连过去！</li>
  <li><strong>定式四：严防二人世界孤岛闭环</strong>：绝对不能让两个 1 号岛直接用一座桥连上，也不能让两个 2 号岛直接用双桥连死！这样它们虽然数字满足了，却与外部世界彻底失联，直接沦为死局。</li>
</ul>

<h3>双人实时 Speed PK 竞速对决</h3>
<ul>
  <li><strong>完全一致的随机种子</strong>：对战双方获得完全相同的海岛坐标与数字分布，纯粹比拼手速与眼力。</li>
  <li><strong>毫秒级进度看板</strong>：顶部 PK 仪表盘实时同步双方的联通百分比。谁先以 100% 正确率将所有岛屿全部合法联通，谁就赢得胜局！</li>
</ul>

<h2>常见问题解答 (FAQ)</h2>
<h3>为什么我已经把所有岛屿的数字都满足了，系统却没有提示通关？</h3>
<p>这是因为你触犯了“孤岛隔离”规则！检查一下是不是盘面上存在两三个岛屿自己连成了封闭的小环，却没有路通往其他海岛？全盘必须全部互联互通才能通关！</p>

<h3>两座岛之间为什么有时候连不上桥？</h3>
<p>检查两座岛中间是不是隔着另外一座岛，或者中间已经有一条垂直的桥梁拦腰挡住了去路？桥梁既不能穿过别的岛，也不能跨越已经存在的桥梁。</p>

<h3>遇到复杂难题卡关了怎么办？</h3>
<p>随时可以按键盘 <kbd>H</kbd> 键或者点击顶部 💡 提示按钮，AI 会为你智能架设一座绝对正确的关键桥梁，带你立刻打破僵局！</p>`,

  en: `<h2>About Hashi (Hashiwokakero / Bridges / Island Connect)</h2>
<p><strong>Hashi (Hashiwokakero / Bridges)</strong> is an elegant pure-logic puzzle created by the famous Japanese publisher Nikoli. In a calm ocean grid, numbered islands (from 1 to 8) await a master bridge architect. Your goal is to connect all islands by drawing horizontal and vertical bridges. <strong>Every island must connect to exactly as many bridges as its number dictates, no two islands can have more than two bridges, bridges can never cross, and all islands must form a single connected network!</strong></p>

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
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Build / Add / Remove Bridge</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click island A, then click island B</td>
        <td class="p-2 border border-[var(--color-border-card)]">Swipe finger from island A to island B</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">Cycles between adjacent islands: Single Bridge (1) → Double Bridge (2) → Clear (0)</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">AI Smart Hint</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click top lightbulb 💡 button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap hint lightbulb icon</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>H</kbd> Key</td>
        <td class="p-2 border border-[var(--color-border-card)]">Automatically builds one guaranteed correct bridge in solo mode</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Restart Board</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click restart button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap reset icon</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd> Key</td>
        <td class="p-2 border border-[var(--color-border-card)]">Clears all constructed bridges to start the puzzle fresh</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>The Core Physical Laws of Hashi</h3>
<ul>
  <li><strong>Numbers are Strict Orders</strong>: The number inside an island dictates exactly how many bridges must attach to it. Fully satisfied islands turn green; overloaded islands flash red warning!</li>
  <li><strong>Orthogonal Only, Max Double Bridges</strong>: Bridges must run strictly horizontal or vertical (no diagonals). Between any two islands, you can build at most 2 parallel bridges (single or double). Never a 3rd!</li>
  <li><strong>No Crossings &amp; No Island Piercing</strong>: Bridges can never cross each other, nor can they pass through an intermediate island.</li>
  <li><strong>One Single Connected Network</strong>: Every island must be reachable from every other island. No isolated mini-networks allowed!</li>
</ul>

<h3>Four Essential Solving Tactics</h3>
<ul>
  <li><strong>The Big Maximums (8s, 6s on edges, 4s in corners)</strong>: An 8 island must build double bridges in all 4 directions (2+2+2+2=8). A 4 in a corner must build double bridges in both available directions (2+2=4). A 6 on an edge must build double bridges in all 3 directions (2+2+2=6)!</li>
  <li><strong>At Least One Bridge Guarantee (Corner 3s, Edge 5s)</strong>: A 3 in a corner only has 2 directions; each direction must have at least one bridge! (Otherwise, the other direction could have at most 2, falling short of 3).</li>
  <li><strong>Lone Neighbor Rescue</strong>: If an island with number 1 or 2 has only one single neighbor island in sight, it must connect directly to it.</li>
  <li><strong>Avoid Isolation Traps</strong>: Never connect two 1s together or two 2s with a double bridge, as they would isolate themselves into a dead-end circuit disconnected from the rest of the world.</li>
</ul>

<h3>Real-Time Speed PK Arena</h3>
<ul>
  <li><strong>100% Identical Seed</strong>: Both players face the exact same island map for fair competitive play.</li>
  <li><strong>First to Complete Wins</strong>: Watch live progress percentages and race to connect all islands into one unified network!</li>
</ul>`,

  es: `<h2>Acerca de Puentes (Hashi / Hashiwokakero)</h2>
<p><strong>Hashi</strong> es un elegante juego de lógica japonesa de Nikoli. Une las islas mediante puentes horizontales y verticales. Cada isla debe tener exactamente tantos puentes como indica su número. ¡No se pueden cruzar puentes y todas las islas deben formar una única red conectada!</p>
<h3>Controles Clave</h3>
<ul>
  <li><strong>Construir puente</strong>: Clic o deslizar de una isla a otra (ciclo: 1 puente, 2 puentes, borrar).</li>
  <li><strong>Pista AI</strong>: Pulsa la tecla <kbd>H</kbd> o el icono 💡.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd> para reiniciar el mapa.</li>
</ul>
<h3>Estrategia Maestra</h3>
<p>Empieza por los números máximos: los 8 siempre tienen puentes dobles en las 4 direcciones, y los 4 en esquinas tienen puentes dobles en ambas direcciones.</p>`,

  ja: `<h2>橋をかけろ (Hashi / 橋架けパズル) の遊び方</h2>
<p><strong>橋をかけろ (Hashiwokakero)</strong> は、数字の書かれた島同士を橋で繋ぐニコリ発祥の大人気パズルです。島の数字と同じ本数の橋を架け、すべての島を1つの大きなネットワークに繋げばクリア！</p>
<h3>操作方法</h3>
<ul>
  <li><strong>橋を架ける</strong>：島から島へタップまたはドラッグ（1本 → 2本 → 消去）。</li>
  <li><strong>ヒント</strong>：<kbd>H</kbd> キーまたは 💡 ボタンで正しい橋を1本表示。</li>
  <li><strong>リスタート</strong>：<kbd>R</kbd> キーで盤面を初期化。</li>
</ul>
<h3>攻略のコツ：最大数から攻める！</h3>
<p>四方に隣接する「8」は全方向に2本ずつ架かります。カドにある「4」も2方向に2本ずつ確定します！</p>`,

  ko: `<h2>하시 (다리 잇기 / Hashiwokakero) 게임 방법</h2>
<p><strong>하시 (다리 잇기)</strong>는 섬의 숫자만큼 가로와 세로로 다리를 놓아 모든 섬을 하나로 연결하는 정통 논리 퍼즐입니다. 다리는 겹치거나 교차할 수 없으며, 최대 2개까지 놓을 수 있습니다!</p>
<h3>조작법</h3>
<ul>
  <li><strong>다리 놓기</strong>: 섬에서 다른 섬으로 드래그 (1개 → 2개 → 삭제).</li>
  <li><strong>힌트</strong>: <kbd>H</kbd> 키 또는 💡 아이콘.</li>
  <li><strong>다시 시작</strong>: <kbd>R</kbd> 키로 초기화.</li>
</ul>
<h3>핵심 비법: 큰 숫자부터 풀기</h3>
<p>사방이 뚫린 8은 모든 방향에 2개씩 다리가 놓이고, 구석의 4는 양쪽 방향에 2개씩 무조건 연결됩니다!</p>`,

  pt: `<h2>Sobre Pontes (Hashi / Hashiwokakero)</h2>
<p><strong>Hashi</strong> é um clássico quebra-cabeça japonês da Nikoli: conecte todas as ilhas com pontes horizontais e verticais até que o número de cada ilha seja atendido, formando uma rede única!</p>
<h3>Controles</h3>
<ul>
  <li><strong>Construir ponte</strong>: Clique ou arraste entre ilhas (1 ponte, 2 pontes, limpar).</li>
  <li><strong>Dica AI</strong>: Tecla <kbd>H</kbd> ou lâmpada 💡.</li>
  <li><strong>Reiniciar</strong>: Tecla <kbd>R</kbd>.</li>
</ul>`,

  fr: `<h2>À Propos de Ponts (Hashi / Hashiwokakero)</h2>
<p><strong>Hashi</strong> est un jeu de logique japonais signé Nikoli. Reliez les îles par des ponts horizontaux ou verticaux (au maximum deux ponts entre deux îles) sans jamais les croiser, jusqu'à réunir toutes les îles en un seul réseau !</p>
<h3>Commandes</h3>
<ul>
  <li><strong>Construire</strong> : Glissez entre deux îles (1 pont, 2 ponts, effacer).</li>
  <li><strong>Indice</strong> : Touche <kbd>H</kbd> ou icône ampoule 💡.</li>
  <li><strong>Recommencer</strong> : Touche <kbd>R</kbd>.</li>
</ul>`,

  de: `<h2>Über Hashi (Brückenrätsel / Hashiwokakero)</h2>
<p><strong>Hashi</strong> ist ein faszinierendes Logikrätsel aus Japan (Nikoli). Verbinde die Inseln mit horizontalen und vertikalen Brücken (maximal 2 parallele Brücken), sodass jede Insel ihre exakte Zahl erfüllt und alle Inseln vernetzt sind!</p>
<h3>Steuerung</h3>
<ul>
  <li><strong>Brücke bauen</strong>: Von Insel zu Insel ziehen (1 Brücke, 2 Brücken, Löschen).</li>
  <li><strong>Tipp</strong>: Taste <kbd>H</kbd> oder Glühbirnen-Symbol 💡.</li>
  <li><strong>Neustart</strong>: Taste <kbd>R</kbd>.</li>
</ul>`
};

// ==========================================
// 2. Layer 2: Deep Masterpiece Guide (Easy for 8-14 Year Olds, Zero LaTeX)
// ==========================================
const zhRules = `## 第一章：数桥到底是什么？大海里群岛大联通的桥梁建筑师

欢迎来到 **Puzzle PK 桥梁谜题 (Hashiwokakero / Hashi / 数桥) 趣味通关全书**！不管你是刚学会认数字的小学三年级学生，还是喜欢攻克复杂大迷宫的初高中解谜高手，只要掌握几个像拼搭乐高积木一样简单清楚的造桥定式，你就能不用瞎猜任何一座桥，顺理成章把整片海域的所有海岛紧密连接在一起！

### 1.1 那个源自益智圣殿 Nikoli 的经典神作
数桥 (Hashi) 是世界益智游戏史上一座闪耀的里程碑。
1990 年，发明了数独 (Sudoku) 的日本著名益智出版社 Nikoli，在其王牌杂志上刊登了一种全新的连线游戏，日文名字叫 **Hashiwokakero**（意思就是“快来架桥吧！”）。
它的画面纯净优雅：只有蔚蓝的大海、圆圆的海岛和笔直平整的桥梁，不含一丝多余的杂质，纯粹考验玩家的逻辑演绎能力与全局规划思维。

### 1.2 游戏舞台：浩瀚大海里的数字海岛
游戏的地图是一片平静的大海。海面上散落着许多圆圆的“海岛”，每一个海岛里面都端端正正写着一个数字（从 1 到 8）。
你的身份就是整座群岛的**首席桥梁总工程师**！
岛屿里面的数字就是海岛居民交给你的**工程指标**：
- 如果岛里写着数字 3，就代表必须不多不少、正好修 3 座桥连到这座岛上；
- 如果写着数字 8，就代表必须正好有 8 座桥连着它！

### 1.3 建筑师的终极使命：全网互通大家庭
造桥不仅仅是满足每一座海岛的数字指标，更重要的是实现**全网大联通**：
当你把所有桥梁建好之后，整片海域的所有海岛必须连成一个紧密相连的大家庭！
任何一座海岛上的居民，都可以通过桥梁一路散步，走到海面上其他任何一座海岛去拜访朋友。如果哪座岛被孤零零地甩在外面自成一个小圈子，那就是不合格的废弃工程！

---

## 第二章：造桥四大物理铁律：严禁空中飞仙与强行撞桥

在拿起图纸动手修桥之前，请必须背熟这四大像铁一样不可违反的工程铁律：

### 2.1 铁律一：只能造单桥或双桥（最多 2 座平行桥）
在任意两座能够互相望见的相邻海岛之间：
- 你可以造一条细细的**单桥**（代表 1 流量）；
- 也可以造两条并排的**双桥**（代表 2 流量）；
- **但是绝对不允许造第 3 座桥**！两岛之间最多就是双桥，绝不能贪心。

### 2.2 铁律二：必须横平竖直，严禁斜着飞
所有的桥梁只能沿着水平方向（向左、向右）或者垂直方向（向上、向下）直线架设。
桥梁必须笔直平整，绝对不允许造弯曲的拱桥，更不允许斜对角飞线！

### 2.3 铁律三：严禁十字交叉，更不能穿岛而过
在同一片海面上，**不能造立交桥**！
- 水平方向的桥梁和垂直方向的桥梁绝不能在半空中十字交叉；
- 桥梁也绝不能从另外一座海岛的肚子上面横穿过去！如果两座岛之间隔着第三座岛，它们就互相看不见对方，绝不能跨岛架桥。

### 2.4 铁律四：数字变色反馈指示灯
在我们的 Puzzle PK 游戏中：
- 当一座岛周围架设的桥梁数量刚好等于岛上的数字时，这座岛会立刻亮起温暖舒适的**浅绿底色**，告诉你：“我修好啦！”
- 如果你不小心架多了、超出了岛上的数字，这座岛会立刻**闪红报警**，提醒你桥修多啦赶紧拆掉一座！

---

## 第三章：破案第一大绝招：寻找海岛“大胃王”（送分题满员秒杀）

面对一张满是圆点的大地图，第一座桥应该修在哪里呢？
答案就是：**找最大的数字，一秒钟送分！**

### 3.1 什么是海岛的“容量天花板”？
你想一想：一座海岛在平坦的海面上，最多能有几个方向可以架桥？
最多只有东、南、西、北 **4 个方向**！
而每一个方向最多只能架 **2 座桥**。
所以一座海岛理论上能连接的最大桥梁总数，就是 2 + 2 + 2 + 2 = **8 座桥**！

### 3.2 8 号超级大岛：天下第一送分王！
只要你在棋盘正中间看到一个大大的数字 **8**：
请立刻开心地笑出声来！因为这道题连想都不用想：
8 号岛想要满足 8 座桥的要求，它的 4 个方向必须**一个都不能少，而且每一个方向都必须架满双桥**！
直接大手一挥：向上架双桥、向下架双桥、向左架双桥、向右架双桥！一秒钟拿下 8 座桥！

### 3.3 角落的 4 号岛与边缘的 6 号岛
同理，我们看看那些靠墙靠角的海岛：
1. **角落里的 4 号海岛**：
   - 呆在棋盘四个小角落的岛，有两个方向直接撞墙，只有 **2 个可用方向**；
   - 2 个方向要想凑齐 4 座桥，唯一的办法就是：**这两个方向必须全部架满双桥（2 + 2 = 4）**！
2. **贴在边框上的 6 号海岛**：
   - 贴在四条外框上的岛，有一个方向撞墙，只有 **3 个可用方向**；
   - 3 个方向要想凑齐 6 座桥，唯一的办法就是：**这 3 个方向必须全部架满双桥（2 + 2 + 2 = 6）**！

你看，开局只要扫视一眼 8、角落的 4、边缘的 6，整片大海的骨架一下子就搭好了！

---

## 第四章：破案第二大绝招：“保底一座桥”与孤僻海岛大营救

当最简单的满员大岛修完之后，接下来该找谁呢？记住这两个神奇定式：

### 4.1 角落的 3 号岛与边缘的 5 号岛（保底抽屉原理）
面对角落的 **3 号岛**：
- 它只有 2 个方向可以架桥；
- 如果你在某一个方向一座桥都不架，那另一个方向最多只能架 2 座，2 座根本达不到 3 座的目标！
- 所以无论如何，**这两个方向都必须各保底架设至少 1 座桥！**
- 我们可以毫不犹豫地先在这两个方向各修 1 座单桥。先保底，至于谁能拿到那第 2 座桥，留给后面的线索去决定！

同理，贴在边框上的 **5 号岛**：
- 它只有 3 个可用方向；
- 如果某个方向空着不修，剩下的两个方向最多只能架 2 + 2 = 4 座，依然凑不够 5 座！
- 所以 5 号岛的 **3 个方向，每一个方向都必定保底拥有至少 1 座单桥！**

### 4.2 只有一个邻居的可怜孤岛（单亲海岛大营救）
在海面上巡视一圈，看看有没有哪个小岛特别孤单：
- 如果一座岛上写着数字 **1**，而它的上下左右望出去，**只有唯一的一个邻居**（其他方向都是海水或者被别的桥挡住了）：
- 那还用想吗？这座岛唯一的生路就是连向这个邻居！直接拉出一条单桥！
- 如果一座岛写着数字 **2**，而它也只有唯一的一个邻居：
- 那这座岛就必须向这个唯一的邻居直接连上**双桥**！

---

## 第五章：破案第三大绝招：严防“二人世界”死循环（防孤岛隔离法）

很多小朋友玩数桥时，把所有岛屿的数字都修满了，却惊奇地发现游戏不肯通关，这是为什么呢？
因为你犯了造桥界最大的禁忌——**把海岛困在二人世界里了！**

### 5.1 两个 1 号岛绝不能私定终身
假设海面上挨着两座写着 **1** 的海岛。
很多新手一看：“哎呀，1 遇到 1，太简单了！一笔拉过去，两座岛都变绿满足啦！”
停！千万住手！
如果你把这两个 1 号岛连在一起，它们两个确实都满足了 1 座桥的要求，再也不能连别的桥了。
但是你退后一步看看大地图：**它们两个变成了一对脱离大部队的孤儿！它们再也没有任何桥梁能够连到外部世界了！**
这样整张地图就碎成了两截，永远不可能全网联通！
所以铁律：**两个相邻的 1 号岛之间，绝对不能直接连线！**

### 5.2 两个 2 号岛绝不能连双桥
同理，如果两座相邻的 **2 号岛**之间直接架上了双桥，它们俩就当场结成了死结闭环，再也没有名额连向其他海岛，全盘直接报废！
利用这条“防孤岛定理”，你就能倒推出：“既然它们不能互连，那它们的桥梁就必须拐向别的海岛”，很多看似复杂的难题瞬间就能迎刃而解！

---

## 第六章：双人 Speed PK 极速对决：电竞手势与扫盘节奏

在 Puzzle PK 的在线竞技场中，你可以和好友或全球玩家展开实时 1v1 极速造桥对抗！

### 6.1 绝对公平的发牌种子
对战房间里的两位选手，面对的完全是同一张图纸、相同坐标的海岛和相同的数字分布。
完全不靠运气，纯粹比拼谁的眼睛更快、谁的桥梁逻辑更严密！

### 6.2 职业高手的开局雷达扫盘流
1. **前 3 秒只扫大数**：哨声一响，先别从左上角按部就班看！眼睛像雷达一样全盘扫描，找到所有的 8、边上的 6、角落的 4，两根手指快速滑动拉满双桥；
2. **顺手保底**：顺着刚才修好的桥，给相撞的 3 和 5 各补上一座保底单桥；
3. **顶栏进度百分比心理战**：顶部仪表盘实时同步双方的已满足岛屿百分比。看到对手跑到 80% 千万别慌，往往对手因为孤岛闭环卡在最后两步拆桥，只要你按照防孤岛定式稳扎稳打，最后几秒反杀就是家常便饭！

---

## 第七章：高频小问答 (FAQ) 与十二字独门心诀

### 问：遇到 10×10 或者 15×15 的超级大图完全卡关了，按 <kbd>H</kbd> 键会有惩罚吗？
**答：在单人练习模式下，完全没有任何惩罚！**
随时可以按下键盘上的 <kbd>H</kbd> 键或者点击顶部 💡 灯泡图标。系统内置的高性能回溯求解引擎会立刻为你揭晓并架好一座绝对正确的关键桥梁，带你秒速走出死胡同！

### 问：两座海岛之间我不小心架错了桥，怎么快速拆除？
**答：点击或者滑动第三次就会自动清空！**
两岛之间的连线是循环状态机：点一下架单桥(1)，再点一下架双桥(2)，再点一下就会恢复平整干净的海面(0)。或者直接在单人模式按键盘快捷键 <kbd>R</kbd> 一秒重开！

### 问：为什么数桥是培养空间大局观和工程思维的神器？
**答：因为它把局部加法计算和全局网络联通完美融为一体！**
玩数桥的孩子不仅要算清楚眼前每一座岛的加减法，脑海里更要时刻装着一整幅全网联通的蓝图。经常玩数桥，孩子的耐心、全局统筹能力和严谨度都会有质的飞跃！

### 数桥通关绝世十二字心诀
> **「大数满架，角落保底；严防孤岛，全网联通。」**
> 牢牢背熟这十二个字：大数字直接拉满双桥，角落边缘先拿保底，绝对不连封闭死循环，整片大海连通成一家，每一关你都是最优秀的五星总工程师！`;

const enRules = `## Chapter 1: What is Hashi? The Island Network Architect

Welcome to the **Puzzle PK Fun & Friendly Hashi (Hashiwokakero / Bridges) Master Guide**! Whether you are an elementary school student learning puzzle logic or an advanced puzzle lover solving giant ocean maps, mastering a few intuitive architectural blueprints will allow you to build bridges across the entire sea with 100% pure deduction — zero guesswork required!

### 1.1 The Japanese Classic from Nikoli
Hashi was created in 1990 by the world-famous Japanese puzzle publisher Nikoli (the very creators of Sudoku).
In Japanese, the game is called **Hashiwokakero**, which literally translates to "Build bridges!"
The game is pure and elegant: a calm blue sea, round numbered islands, and straight bridges connecting them into a unified community.

### 1.2 The Ocean Map and Island Numbers
The game board represents an open ocean dotted with circular islands. Each island contains a number from 1 to 8.
You are the **Chief Bridge Engineer**!
The number inside an island is your strict construction specification:
- An island with number **3** must have exactly 3 bridge connections attached to it;
- An island with number **8** must have exactly 8 bridge connections attached to it!

### 1.3 The Ultimate Goal: A Single Connected Network
Building bridges is not just about satisfying the numbers; it is about building a connected family of islands!
When all bridges are placed, **every island must be connected into a single, unified network**. Any resident on any island must be able to walk across bridges to reach any other island in the sea!

---

## Chapter 2: The Four Physical Laws of Bridge Building

Before laying down bridges, master these four unbreakable engineering laws:

### 2.1 Law 1: Single or Double Bridges Only (Max 2 Parallel Bridges)
Between any two adjacent neighboring islands:
- You may build a **single bridge** (1 capacity);
- Or a **double bridge** (2 capacity);
- **Never a 3rd bridge**! Between any two islands, 2 bridges is the absolute limit.

### 2.2 Law 2: Horizontal and Vertical Only (No Diagonal Bridges)
Bridges must run strictly East-West (horizontal) or North-South (vertical).
Diagonal bridges are strictly prohibited by ocean physics!

### 2.3 Law 3: No Crossings and No Piercing Intermediate Islands
In this ocean, **overpasses and multi-level bridges do not exist**!
- A horizontal bridge and a vertical bridge can never cross in mid-air;
- Bridges cannot pass through another island along the way. If a third island sits between two islands, they cannot see each other and cannot build a bridge directly.

### 2.4 Law 4: Green Satisfaction Feedback
In Puzzle PK:
- When an island reaches its exact required bridge count, it lights up in a warm **soft green** to tell you it is satisfied!
- If you accidentally overbuild, the island flashes **red alert** to warn you that too many bridges are attached.

---

## Chapter 3: Golden Secret 1: Spot the Maximum Islands (Instant Free Points!)

Where should you place your very first bridge on a brand-new map?
The answer: **Find the biggest numbers for instant free points!**

### 3.1 The Capacity Ceiling of an Island
How many directions can an island possibly have on a grid?
At most **4 directions**: North, South, East, West!
And each direction can hold at most **2 bridges**.
Therefore, the theoretical maximum capacity of any island is 2 + 2 + 2 + 2 = **8 bridges**!

### 3.2 The Mighty 8 Island: King of Free Points!
Whenever you spot an island with number **8**:
Smile and celebrate! You do not need to think twice:
For an 8 to be satisfied, **all 4 directions must build double bridges (2 + 2 + 2 + 2 = 8)**!
Swipe in all 4 directions immediately to secure 8 bridges in one second!

### 3.3 Corner 4s and Edge 6s
Look at the islands resting against walls and corners:
1. **A 4 in a Corner**:
   - A corner island has only 2 available directions.
   - To reach 4, **both available directions must build double bridges (2 + 2 = 4)**!
2. **A 6 on an Edge Wall**:
   - An edge island has only 3 available directions.
   - To reach 6, **all 3 directions must build double bridges (2 + 2 + 2 = 6)**!

---

## Chapter 4: Golden Secret 2: Guaranteed Minimum Bridges

What about islands that are almost at their maximum?

### 4.1 Corner 3s and Edge 5s (The Pigeonhole Principle Made Easy)
Consider a **3 in a corner**:
- It has only 2 directions.
- If one direction had 0 bridges, the other could hold at most 2, leaving you short of 3!
- Therefore, **both directions are guaranteed to have at least 1 bridge**!
- Build a single bridge in both directions right away. Deciding which one gets the second bridge can wait for later.

Similarly, a **5 on an edge wall**:
- It has only 3 directions.
- Each of its 3 directions is guaranteed to hold **at least 1 bridge**!

### 4.2 Lone Neighbor Rescue
Look around the ocean for islands with very few neighbors:
- If an island shows number **1** and has only **one single neighbor** in sight, connect a single bridge to it immediately!
- If an island shows number **2** and has only **one single neighbor**, connect a double bridge directly to it!

---

## Chapter 5: Golden Secret 3: Beware the Isolation Trap!

Beginners often satisfy every island's number, but the game does not declare victory. Why?
Because you accidentally created an **isolated closed loop**!

### 5.1 Two 1s Must Never Marry!
Suppose two neighboring islands each show number **1**.
If you connect them directly, both islands are satisfied, but **they form an isolated 2-island colony that can never connect to the rest of the world**!
The entire ocean map breaks into two disconnected pieces.
Iron Rule: **Two neighboring 1 islands can NEVER connect directly to each other!**

### 5.2 Two 2s Must Never Form a Double Bridge
Similarly, building a double bridge between two neighboring 2 islands seals them into an isolated bubble forever.
Using this rule, you can deduce that their bridges must head outward to other islands, instantly unlocking tricky situations!

---

## Chapter 6: Multiplayer Speed PK Arena Tactics

In Puzzle PK's online multiplayer arena, test your bridge-building speed in real time:

### 6.1 Identical Random Seeds for 100% Fairness
Both players receive the exact same puzzle map and island numbers. Victory is purely a contest of rapid spatial scanning!

### 6.2 Speed Scanning Rhythm
1. **First 3 Seconds**: Scan the board for all 8s, edge 6s, and corner 4s. Build double bridges immediately!
2. **Guaranteed Bridges Next**: Add single bridges to corner 3s and edge 5s.
3. **Watch the Top HUD**: Live percentages show your rival's progress. Stay calm even if an opponent seems ahead — players frequently get stuck with an isolated loop at the end, giving you the perfect window to overtake them!

---

## Chapter 7: FAQ & The Twelve-Word Master Creed

### Q: Can I use hints on giant boards?
**A: Yes!** In solo mode, press <kbd>H</kbd> or click 💡 anytime. The built-in engine will immediately construct one guaranteed correct bridge.

### Q: How do I remove an accidental bridge?
**A: Click or swipe a third time!** Connecting islands cycles: Single Bridge (1) -> Double Bridge (2) -> Clear (0).

### The Twelve-Word Master Creed
> **"Max numbers full; corners secure; avoid loops; connect the whole world!"**`;

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
console.log('1. Updating i18n JSON files for game.hashi.seo_desc...');
const languages = ['zh', 'en', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
for (const lang of languages) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const newDesc = seoDescMap[lang] || seoDescMap.en;
  content['game.hashi.seo_desc'] = newDesc;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  Updated ${lang}.json (length: ${newDesc.length} chars)`);
}

// ==========================================
// 4. Execution: Update games-docs.json
// ==========================================
console.log('2. Updating games-docs.json for hashi...');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
const hashi = docs.find(d => d.id === 'hashi');
if (!hashi) {
  console.error('hashi not found in games-docs.json!');
  process.exit(1);
}

hashi.rules = JSON.stringify(updatedRules);
fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf-8');
console.log(`  Successfully updated hashi in games-docs.json! (zh length: ${zhRules.length}, en length: ${enRules.length})`);

// Sanity checks: verify ZERO dollar signs ($)
if (zhRules.includes('$')) console.error('WARNING: zhRules contains $ !');
else console.log('  Sanity check PASSED: zhRules contains ZERO dollar signs ($)!');

if (enRules.includes('$')) console.error('WARNING: enRules contains $ !');
else console.log('  Sanity check PASSED: enRules contains ZERO dollar signs ($)!');

if (seoDescMap.zh.includes('$')) console.error('WARNING: seoDescMap.zh contains $ !');
else console.log('  Sanity check PASSED: seoDescMap.zh contains ZERO dollar signs ($)!');
