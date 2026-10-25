const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'src/assets/i18n');
const docsPath = path.join(root, 'public/assets/games-docs.json');

// ==========================================
// 1. Layer 1: In-Page Tactical Quick-Guide (Friendly, Plain, No LaTeX)
// ==========================================
const seoDescMap = {
  zh: `<h2>关于数织 (Nonogram / 织网求真 / 像素画拼图)</h2>
<p><strong>数织 (Nonogram)</strong> 是一款风靡世界的逻辑画图游戏，也被大家亲切地称为“绘图方块”或“Picross”。它的玩法特别像在方格纸上做侦探破案：每一行和每一列的边缘都写着一些数字，这些数字告诉你<strong>这一排有几块连在一起的黑色积木</strong>。通过一步一步的纯逻辑推导，不需要任何瞎猜，当你把所有该涂黑的方格填好、该留空的方格打上叉时，一幅藏在棋盘里的精美像素画就会奇迹般浮现出来！</p>

<h3>全平台按键与手势操控指南</h3>
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
        <td class="p-2 border border-[var(--color-border-card)] font-bold">涂黑方块 (填色)</td>
        <td class="p-2 border border-[var(--color-border-card)]">鼠标左键点击 / 按住拖拽</td>
        <td class="p-2 border border-[var(--color-border-card)]">手指轻点方格 / 沿直线滑动</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>Space</kbd> 或 <kbd>Enter</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">把确认是图案的格子涂成纯黑色</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">打叉标记 (× 空格)</td>
        <td class="p-2 border border-[var(--color-border-card)]">鼠标右键点击 / 按住拖拽</td>
        <td class="p-2 border border-[var(--color-border-card)]">切换到底部 ❌ 模式点击 / 长按</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>X</kbd> 或 <kbd>F</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">标出绝对没有颜色的空白格，像防火墙一样隔开积木</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">擦除 / 恢复空格</td>
        <td class="p-2 border border-[var(--color-border-card)]">用相同的按键再点一下</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻点已填格子或点击橡皮擦</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>C</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">擦掉画错的黑色或叉号，恢复成干干净净的初始格</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">移动选中框</td>
        <td class="p-2 border border-[var(--color-border-card)]">移动鼠标指针悬停</td>
        <td class="p-2 border border-[var(--color-border-card)]">手指直接点击目标格</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或 方向键</td>
        <td class="p-2 border border-[var(--color-border-card)]">在棋盘上移动高亮光标</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">拖动平移棋盘</td>
        <td class="p-2 border border-[var(--color-border-card)]">按住鼠标中键滚轮拖动</td>
        <td class="p-2 border border-[var(--color-border-card)]">两根手指按住屏幕一起滑动</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">在 15×15 或 25×25 的大棋盘里自由推移画面</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">放大 / 缩小视野</td>
        <td class="p-2 border border-[var(--color-border-card)]">滚动鼠标中间滚轮</td>
        <td class="p-2 border border-[var(--color-border-card)]">双指捏合或张开 (Pinch)</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">把小格子放大，手机上手指再粗也不会按偏按错</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">后悔撤销 (Undo)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部的撤销箭头</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击撤销工具按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">立刻撤销刚才画错的一笔</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">一键重开 (Restart)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击重开按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击重开菜单项</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">一键清空全盘重新开始计时</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>看懂边上的数字：两条小学生都能秒懂的铁律</h3>
<ul>
  <li><strong>数字有多大，连在一起的黑块就有多长</strong>：比如某一行开头写着 <code>5</code>，就表示这一行里正好有 5 个连在一起涂黑的格子；如果写着 <code>2 3</code>，就表示先有一段长为 2 的黑积木，接着又有一段长为 3 的黑积木。</li>
  <li><strong>两块黑积木之间，必须隔着至少一个空格（打叉）</strong>：就像两节不同车厢之间要有连接处一样，长为 2 和长为 3 的两块黑积木绝不能贴在一起粘成一块长为 5 的大积木，中间必须留出至少一个白格！</li>
  <li><strong>做完的提示会自动变灰</strong>：当你把某一排的全部要求都做对时，边上的数字就会自动变灰画横线，告诉你：“这一排已经搞定啦，快去看别的地方吧！”</li>
</ul>

<h3>破案四大招：中小学生一学就会的解题绝招</h3>
<ul>
  <li><strong>绝招一：两头挤一挤（找重叠格）</strong>：比如一条 10 格长跑道上要放一个长为 8 的积木。把积木推到最左边占第 1 到 8 格；推到最右边占第 3 到 10 格。你会发现，中间的第 3、4、5、6、7、8 格不管怎么推都在里面！这 6 个格子想都不用想，直接涂黑！<br>
  <strong>简易心算法</strong>：总长 10 格，积木长 8 格，剩下空档是 10 - 8 = 2 格。积木长度 8 减去空档 2，中间重叠的正是 8 - 2 = 6 格！</li>
  <li><strong>绝招二：贴墙往里数（边缘推进法）</strong>：如果靠近最左边的格子已经涂黑了，而这一行的第一个数字是 4，说明它就是 4 号积木的开头！直接顺着它向右连数涂满 4 格，然后在第 5 格必须立刻打个叉 (×) 挡住它！</li>
  <li><strong>绝招三：小抽屉塞不下大积木（空格排除法）</strong>：如果两个叉号之间夹着一个只有 2 格长的小空隙，而这一排剩下的积木最短都是 3 格，那么这个 2 格的小抽屉根本装不下任何积木，里面肯定全是空的，立刻统统打上叉号！</li>
  <li><strong>绝招四：到头关大门（完工封堵）</strong>：当一个长为 3 的积木已经涂满了 3 格，它已经完成任务了，不能再变长了！立刻在它前后两端各打一个叉号关上大门，防止它不小心被越画越长。</li>
</ul>

<h3>双人 PK 对战模式：比脑力更比反应</h3>
<ul>
  <li><strong>极速竞速模式 (Speed PK)</strong>：两个人做一模一样的一张图，比谁最快解完！高手的小秘诀是一开局先扫视全盘，把 <code>10</code>、<code>9</code> 这样的大数字一笔拉满，骨架一下子就搭好了。</li>
  <li><strong>抢分模式 (Steal PK)</strong>：两个人共用同一张棋盘抢格子！点对一个黑格加 1 分，点错不仅扣分，还要被<strong>冰冻罚站 2 秒钟</strong>不能动！所以千万不能瞎蒙，稳扎稳打抢关键格子才是王道。</li>
</ul>

<h2>常见问题解答 (FAQ)</h2>
<h3>为什么有时候算到一半卡住了，好像没有格子可以填了？</h3>
<p>别灰心！这时候赶紧把视线从“横排”转到“坚排”！数织就像十字路口，你在横排点了一个黑格或打了一个叉，顺着看那竖排，往往那一竖排的空位就被压缩了，马上就能算出新格子来！</p>

<h3>为什么打叉 (×) 和涂黑一样重要？</h3>
<p>叉号就像围栏。把围栏立起来，大操场就变成了小院子；院子太小放不下大积木，你就能马上排除掉不可能的地方，让正确的黑格子自己浮现出来！</p>

<h3>手机上玩大棋盘容易按错怎么办？</h3>
<p>用两根手指在屏幕上张开，把棋盘放大，每个格子就会变得像巧克力块一样大，轻轻一点就能涂准，再也不会误触扣分啦！</p>`,

  en: `<h2>About Nonogram (Picross / Griddlers / Picture Logic)</h2>
<p><strong>Nonogram</strong> (also famously known as Picross, Griddlers, or Picture Logic) is an addictive picture puzzle game loved by players of all ages around the world. Imagine you are a detective uncovering a hidden mystery picture: numbers along the top and left edges tell you <strong>how many consecutive black blocks</strong> exist in each row and column. With 100% pure deductive logic and zero guessing, filling in the correct black pixels and placing crosses on empty spots will reveal an enchanting pixel artwork right under your fingers!</p>

<h3>Controls & Keyboard Shortcuts Guide</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">Action</th>
        <th class="p-2 border border-[var(--color-border-card)]">Mouse</th>
        <th class="p-2 border border-[var(--color-border-card)]">Touch (Phone / Tablet)</th>
        <th class="p-2 border border-[var(--color-border-card)]">Keyboard</th>
        <th class="p-2 border border-[var(--color-border-card)]">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Fill Cell (Black)</td>
        <td class="p-2 border border-[var(--color-border-card)]">Left Click / Drag</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap cell / Swipe along straight line</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>Space</kbd> or <kbd>Enter</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Paints confirmed pixel cell solid black</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Mark Cross (× Space)</td>
        <td class="p-2 border border-[var(--color-border-card)]">Right Click / Drag</td>
        <td class="p-2 border border-[var(--color-border-card)]">Switch to ❌ mode / Long press</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>X</kbd> or <kbd>F</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Marks empty cells to prevent illegal block expansions</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Erase / Clear Cell</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click again with same tool</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap filled cell or select Eraser</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>C</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Clears marked cell back to neutral empty state</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Move Cursor Box</td>
        <td class="p-2 border border-[var(--color-border-card)]">Hover mouse pointer</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap target coordinate directly</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrow Keys</td>
        <td class="p-2 border border-[var(--color-border-card)]">Navigates highlighted selection frame</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Pan Board Viewport</td>
        <td class="p-2 border border-[var(--color-border-card)]">Middle Mouse Button Drag</td>
        <td class="p-2 border border-[var(--color-border-card)]">Drag with two fingers</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">Moves view smoothly across large boards (15×15 to 25×25)</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Zoom In / Out</td>
        <td class="p-2 border border-[var(--color-border-card)]">Scroll mouse wheel</td>
        <td class="p-2 border border-[var(--color-border-card)]">Pinch in / out with two fingers</td>
        <td class="p-2 border border-[var(--color-border-card)]">-</td>
        <td class="p-2 border border-[var(--color-border-card)]">Enlarges small cells so fingers never tap the wrong spot</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Undo Mistake</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click top Undo icon</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap Undo toolbar button</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Instantly rewinds your last step or stroke</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Quick Restart</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click Restart button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap Restart in game menu</td>
        <td class="p-2 border border-[var(--color-border-card)]"><kbd>R</kbd></td>
        <td class="p-2 border border-[var(--color-border-card)]">Clears the board and resets the timer in solo mode</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>The Two Golden Rules of Clue Numbers</h3>
<ul>
  <li><strong>The number tells you the block length</strong>: If a row shows <code>5</code>, it has 5 continuous filled black cells. If it shows <code>2 3</code>, there is a block of 2, followed by a gap, then a block of 3.</li>
  <li><strong>Blocks must be separated by at least one space</strong>: Two black blocks can never touch directly; there must always be at least one empty square (cross) between them.</li>
  <li><strong>Completed clues turn grey</strong>: Once all blocks in a row or column are correctly placed, the numbers automatically dim and strike through to let you focus on remaining lines!</li>
</ul>

<h3>Four Easy Tricks Anyone Can Master</h3>
<ul>
  <li><strong>Trick 1: Push from Both Ends (Find the Overlap)</strong>: If a row has 10 cells and a block of 8: push it all the way left (cells 1 to 8), then all the way right (cells 3 to 10). Notice that cells 3, 4, 5, 6, 7, and 8 are covered in both cases! Paint those 6 cells black immediately! Quick math: 10 - 8 = 2 empty cells. Block size 8 minus 2 empty cells equals 6 overlapping black cells!</li>
  <li><strong>Trick 2: Count from the Wall (Edge Pinning)</strong>: If cell 1 at the edge is black, and the first clue is 4, count 4 cells straight from the edge and paint them black. Then place a cross (×) right after it!</li>
  <li><strong>Trick 3: Small Spaces Can't Fit Big Blocks</strong>: If you see a small gap of 2 empty cells between two crosses, but your shortest remaining block is 3, that small gap cannot hold anything. Cross out both cells right away!</li>
  <li><strong>Trick 4: Close the Doors When Done</strong>: When a block reaches its designated clue length (like 3 full black cells for a clue of 3), cap both ends with crosses so it doesn't accidentally grow too long.</li>
</ul>

<h3>Multiplayer PK Modes (Speed &amp; Steal PK)</h3>
<ul>
  <li><strong>Speed PK</strong>: Both players solve the exact same puzzle simultaneously. Scan for the biggest numbers first (like 10 or 9) to build the framework in seconds!</li>
  <li><strong>Steal PK</strong>: Both players share one board! Correct fills give +1 point, but clicking wrong deducts points and <strong>freezes you for 2 full seconds</strong>. Never guess blindly!</li>
</ul>`,

  es: `<h2>Acerca de Nonogram (Picross / Píxeles Lógicos)</h2>
<p><strong>Nonogram</strong> es un divertido juego de lógica visual. Los números en los bordes indican cuántas casillas negras consecutivas hay en cada fila y columna. Mediante deducciones sencillas y sin adivinar, irás revelando una hermosa imagen de arte píxel.</p>
<h3>Controles Clave</h3>
<ul>
  <li><strong>Pintar negro</strong>: Clic izquierdo o toque en pantalla (<kbd>Espacio</kbd> / <kbd>Enter</kbd>).</li>
  <li><strong>Marcar cruz (×)</strong>: Clic derecho o modo cruz (<kbd>X</kbd> / <kbd>F</kbd>).</li>
  <li><strong>Navegar y Zoom</strong>: Teclas <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, rueda del ratón o pellizcar con dos dedos en el móvil.</li>
  <li><strong>Deshacer</strong>: <kbd>Ctrl</kbd> + <kbd>Z</kbd> para revertir el último trazo.</li>
</ul>
<h3>Regla de Oro: Buscar la Superposición</h3>
<p>Si una fila de 10 casillas tiene un bloque de 8, empújalo a la izquierda y a la derecha: las 6 casillas del centro coinciden siempre en ambas posiciones. ¡Píntalas de negro sin dudar!</p>`,

  ja: `<h2>イラストロジック（ピクロス / Nonogram）の遊び方とコツ</h2>
<p><strong>イラストロジック（ピクロス）</strong>は、マス目の外側にある数字を手がかりにしてマスを塗りつぶし、隠されたドット絵を完成させる大人気パズルです。勘に頼らず、算数の引き算とパズルのルールだけで誰でも簡単に解くことができます！</p>
<h3>操作方法とショートカット</h3>
<ul>
  <li><strong>黒く塗る</strong>：左クリック または 画面タップ（<kbd>Space</kbd> / <kbd>Enter</kbd>）</li>
  <li><strong>バツ印（×）を打つ</strong>：右クリック または ×モード（<kbd>X</kbd> / <kbd>F</kbd>）</li>
  <li><strong>拡大・縮小・移動</strong>：二本指でピンチイン/アウト、マウスホイールでズーム</li>
  <li><strong>一手戻す</strong>：<kbd>Ctrl</kbd> + <kbd>Z</kbd> キーですぐに戻せます</li>
</ul>
<h3>小学生でもすぐできる！「両端から寄せる」重なり技</h3>
<p>10マスの列に数字「8」がある場合、一番左に寄せた配置と一番右に寄せた配置を比べると、真ん中の6マスはどちらでも必ず黒になります。この真ん中の6マスは最初から安心して塗りつぶせます！</p>`,

  ko: `<h2>노노그램 (네모네모 로직 / 피크로스) 쉬운 설명</h2>
<p><strong>노노그램(네모네모 로직)</strong>은 가로와 세로에 적힌 숫자 힌트를 보고 칸을 칠해 숨겨진 도트 그림을 찾아내는 두뇌 퍼즐입니다. 찍어서 맞출 필요 없이, 초등학생도 이해할 수 있는 간단한 규칙만 알면 막힘없이 술술 풀립니다!</p>
<h3>조작법 및 단축키</h3>
<ul>
  <li><strong>검은 칸 칠하기</strong>: 마우스 좌클릭 또는 터치 (<kbd>Space</kbd> / <kbd>Enter</kbd>)</li>
  <li><strong>X 표시하기 (빈칸)</strong>: 마우스 우클릭 또는 X 모드 터치 (<kbd>X</kbd> / <kbd>F</kbd>)</li>
  <li><strong>화면 확대 및 이동</strong>: 두 손가락으로 화면 벌리기 / 마우스 휠 스크롤</li>
  <li><strong>되돌리기 (실행 취소)</strong>: <kbd>Ctrl</kbd> + <kbd>Z</kbd> 키</li>
</ul>
<h3>가장 쉬운 공식: 양쪽으로 밀어 겹치는 칸 찾기</h3>
<p>10칸 줄에 숫자 8이 있다면, 왼쪽 끝으로 밀었을 때와 오른쪽 끝으로 밀었을 때 가운데 6칸은 무조건 겹칩니다. 고민하지 말고 가운데 6칸을 검은색으로 바로 칠하세요!</p>`,

  pt: `<h2>Sobre o Nonograma (Picross / Pintura Lógica)</h2>
<p><strong>Nonograma</strong> é um jogo de raciocínio simples e divertido. Os números nas bordas indicam o tamanho dos blocos pretos contínuos. Usando lógica pura e sem adivinhar, você vai descobrir desenhos incríveis em pixel art!</p>
<h3>Controles Principais</h3>
<ul>
  <li><strong>Pintar de Preto</strong>: Clique esquerdo ou toque (<kbd>Espaço</kbd> / <kbd>Enter</kbd>).</li>
  <li><strong>Marcar Cruz (×)</strong>: Clique direito ou modo X (<kbd>X</kbd> / <kbd>F</kbd>).</li>
  <li><strong>Zoom e Navegação</strong>: Teclas <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, roda do mouse ou pinça com dois dedos.</li>
  <li><strong>Desfazer</strong>: <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
</ul>`,

  fr: `<h2>À Propos du Nonogram (Picross / Hanjie)</h2>
<p>Le <strong>Nonogram (Picross)</strong> est un jeu de logique visuelle accessible à tous. Les chiffres en bordure indiquent la longueur des blocs noirs consécutifs. Sans jamais deviner au hasard, vous découvrirez de magnifiques images en pixel art !</p>
<h3>Contrôles Essentiels</h3>
<ul>
  <li><strong>Noircir une case</strong> : Clic gauche ou toucher (<kbd>Espace</kbd> / <kbd>Entrée</kbd>).</li>
  <li><strong>Marquer une croix (×)</strong> : Clic droit ou mode croix (<kbd>X</kbd> / <kbd>F</kbd>).</li>
  <li><strong>Zoom et déplacement</strong> : Molette de la souris ou pincement à deux doigts sur mobile.</li>
  <li><strong>Annuler</strong> : <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
</ul>`,

  de: `<h2>Über Nonogramm (Picross / Japanische Rätsel)</h2>
<p>Das <strong>Nonogramm (Picross)</strong> ist ein leicht verständliches Logikrätsel für Jung und Alt. Die Zahlen am Rand zeigen an, wie viele zusammenhängende schwarze Kästchen in jeder Zeile und Spalte liegen. Ganz ohne Raten entsteht Schritt für Schritt ein tolles Pixel-Kunstwerk!</p>
<h3>Wichtige Tasten und Gesten</h3>
<ul>
  <li><strong>Feld schwärzen</strong>: Linksklick oder Antippen (<kbd>Leertaste</kbd> / <kbd>Enter</kbd>).</li>
  <li><strong>Kreuz (×) setzen</strong>: Rechtsklick oder X-Modus (<kbd>X</kbd> / <kbd>F</kbd>).</li>
  <li><strong>Zoom &amp; Verschieben</strong>: Mausrad oder Zwei-Finger-Geste auf dem Touchscreen.</li>
  <li><strong>Rückgängig</strong>: <kbd>Ctrl</kbd> + <kbd>Z</kbd>.</li>
</ul>`
};

// ==========================================
// 2. Layer 2: Deep Masterpiece Guide (Easy for 8-14 Year Olds, Zero LaTeX)
// ==========================================
const zhRules = `## 第一章：数织到底是什么？大楼开灯与像素画的秘密

欢迎来到 **Puzzle PK 数织 (Nonogram) 趣味通关全书**！不管你是小学三年级刚接触这种拼图游戏，还是初高中想要挑战高难度大图的推理高手，只要掌握几个像拼积木一样简单的方法，你就能不用瞎猜任何一个格子，像大侦探福尔摩斯一样把整张图解出来！

### 1.1 像素画与大楼窗户的有趣故事
数织是怎么发明出来的呢？
在 1987 年，日本有一位名叫石田的插画设计师。晚上她走在东京街头，抬头看着高高的大楼，发现大楼上一间间办公室有的亮着灯、有的关着灯。她心想：“如果我把开灯的窗口看成小黑块，关灯的看成白块，不就能在大楼上拼出一只可爱的小猫或者小狗了吗？”
与此同时，另一位谜题大师西尾先生也设计出了用数字做线索的画图游戏。后来，任天堂公司把它做成了超级好玩的《马力欧耀西绘图方块》，全世界的大人和小朋友就都爱上了这个游戏！

### 1.2 边缘的数字到底想告诉你什么？
盘面是由很多个整整齐齐的小方格组成的（比如 10×10 或者 15×15）。在每一行最左边、每一列最上面，都有一些数字。
记住两条最核心的小秘密：
1. **数字多大，连续的黑色积木就有多长**：
   - 比如某一行开头写着一个数字 **5**，就表示这一行里正好有一块长为 5 个格子的黑色积木。
   - 如果开头写着 **2  3** 两个数字，就表示这一行自左向右：先有一块长为 2 的小积木，接着又有一块长为 3 的小积木。
2. **两块黑积木之间，必须留一条白缝（至少空一格）**：
   - 就像两辆小汽车排队不能撞在一起一样，2 号积木和 3 号积木之间必须用至少一个空格隔开，绝对不能连在一起变成一块长为 5 的大积木！

### 1.3 绝不瞎猜的纯逻辑破案法
在高质量的数织题目中（比如我们 Puzzle PK 网站上的所有题目），每一幅画都经过电脑程序的严格检查，**保证每一个格子都能用道理算出来，绝对只有唯一的一种画法**！
千万不要随手瞎蒙一个格子。因为一旦蒙错了，后面的推导就会全乱套。学会下面的“两头挤一挤”口诀，你就能顺理成章、轻轻松松找出所有答案！

---

## 第二章：破案第一大绝招：“两头挤一挤”找重叠格（送分题）

面对一张空白的棋盘，第一笔该从哪里下手呢？答案就是：**找大数字，两头挤一挤！**

### 2.1 火车靠边停：推到最左边与推到最右边
我们来看一个超级生动的例子：
假设这一行一共有 **10 个格子**，边上的数字写着一个大大的 **8**。
我们要把一列长为 8 的小火车放进这 10 个格子里：
- **方案 A（推到最左边停靠）**：火车占领了第 1、2、3、4、5、6、7、8 格（第 9、10 格空着）。
- **方案 B（推到最右边停靠）**：火车占领了第 3、4、5、6、7、8、9、10 格（第 1、2 格空着）。

现在请你仔细观察：
不管是推到最左边，还是推到最右边，**中间的第 3、4、5、6、7、8 格（一共 6 个格子）是不是无论如何都被火车压住了？**
对！即使火车停在中间的任何位置，这 6 个格子也逃不掉，它们百分之百一定是黑色的！
所以一开局，你就可以胸有成竹地把第 3 到第 8 格直接涂成黑色！

### 2.2 小学生心算口诀：用积木长度减去空闲格数
怎样一眼就能心算出重叠了多少格呢？很简单：
1. 第一步：算算剩下几个空格（空闲格子）？
   - 一共有 10 格，火车长 8，剩下的空闲格子就是：10 - 8 = 2 格。
2. 第二步：用火车长度减去空闲格数！
   - 重叠格数 = 8 - 2 = 6 格！
3. 结论：两头各留出 2 个空位，中间的 6 个格子闭着眼睛涂黑！

再来练一练：
- 如果 10 格的行里写着数字 **6** 呢？
  - 空闲格子 = 10 - 6 = 4 格；
  - 重叠格数 = 6 - 4 = 2 格；
  - 两头各空 4 格，中间的第 5、6 格必定是黑色的！
- 如果 10 格的行里写着数字 **10** 呢？
  - 10 - 10 = 0，没有空闲！整行 10 个格子全黑，一秒钟搞定！

### 2.3 一串小积木怎么算重叠？把它们“串成烤串”
如果 10 格的行里不是一个大数字，而是写着 **4  3** 两个数字呢？
别慌！我们先把它们像羊肉串一样串在一起：
- 4 号积木占 4 格；
- 中间必须至少空 1 格白缝；
- 3 号积木占 3 格；
- 它们串在一起最少要占：4 + 1 + 3 = 8 格！
- 10 格的跑道减去 8 格，空闲格数仍然只有：10 - 8 = 2 格！

现在分别看看它们能重叠几格：
- 4 号积木长度为 4，减去空闲的 2 格：4 - 2 = 2 格重叠！
- 3 号积木长度为 3，减去空闲的 2 格：3 - 2 = 1 格重叠！
看！用这个神奇的方法，你一下子就能在这一行里点出 3 个确定的黑格子！

---

## 第三章：连环破案四大法宝：贴墙走、小抽屉、关大门与满格秒杀

学会了两头挤一挤之后，棋盘上已经出现了一些黑格子。接下来只要学会这四个法宝，就能像多米诺骨牌一样一路推到底！

### 3.1 法宝一：贴墙走（边缘推进法）
如果靠近最左边的第一格已经被涂黑了，而这一行的第一个数字是 **4**：
- 这就意味着：这第一格肯定是 4 号积木的龙头！
- 你顺着它往右一口气数 4 格，把第 1、2、3、4 格全涂黑！
- 重点来了：**第 5 格必须立刻打上一个叉号 (×)！**
- 为什么？因为 4 号积木到这里就完工了，后面必须隔出白色的缝隙，否则它就变成 5 号积木了！

### 3.2 法宝二：小抽屉塞不下大积木（空格排除法）
在游戏里，打叉号 (×) 的格子就像一堵墙。
如果两堵墙之间夹着一个小小的空隙，长度只有 **2 个格子**。
但是你看一看这一行剩下的数字：最小的数字都是 **3**！
你想一想：长为 3 的积木，能塞进只有 2 格长的小抽屉里吗？
当然塞不进！
所以这 2 个格子里**绝对不可能有任何黑块，立刻把它们全打上叉号 (×)**！
把它们排除掉之后，积木可以放的地方就更小了，剩下的地方往往又能直接算出重叠格！

### 3.3 法宝三：到头关大门（长度封堵法）
如果线索数字是 **3**，现在你已经在盘面上连着涂黑了 3 个格子。
这就说明：这个 3 号积木已经长齐全了，它绝对不能再长了！
立刻在这个积木的最左端和最右端（或者最上端和最下端）**各打一个叉号关上大门**！
及时打叉关大门，是高手最重要的小习惯。很多新手卡关，就是因为忘了关大门，不知道后面能不能继续画。

### 3.4 法宝四：看清整行正好满格（刚性满格）
有时候数字加起来刚好等于这一行的总长度：
例如 10 格跑道，数字是 **5  4**。
算一算：5 + 1(空格) + 4 = 10 格，不多不少刚刚好！
这时候连推都不用推，直接按顺序：涂黑 5 格、打 1 个叉、涂黑 4 格，整行秒杀！

---

## 第四章：十字路口看风景：横竖交叉连环破局

只盯着一行看，很容易走到死胡同。数织最好玩的地方，就在于横线和竖线的交叉配合！

### 4.1 横向画一笔，竖向送大礼
当你刚刚在第 3 行涂黑了一个格子时，千万不要立刻离开！
顺着这个新格子，**垂直往下看它所在的这一列**：
这一列原本可能还在犹豫，但你刚刚给它送来了一个确定的黑格子！
这个新格子可能会帮这一列“贴墙走”，或者把长长的列切成了两个小区间，一下子就能在这一列里又画出两三个新的黑格！
这就是高手的视线流动：**横排画完看竖排，竖排画完转横排**！

### 4.2 边角的四个角落最神奇
棋盘的四个小角落（左上、右上、左下、右下）是最容易出奇迹的地方：
- 如果左上角的第一格涂黑了，第一行和第一列的第一块积木就会同时从这里出发，向右画横线、向下画竖线！
- 如果左上角是个叉号，第一行和第一列的可用空间都会缩短一格，原本重叠不了的小数字，现在立刻就能重叠了！

### 4.3 满列的激光炮
如果你看到某一列的数字是 **15**（在 15×15 棋盘里）：
这叫“满列激光炮”！直接从头到尾一整列刷成黑色！
这一道黑色激光刷下去，等于一瞬间给所有 15 行每一行都送了一颗现成的黑种子，整张盘面立刻被全面激活！

---

## 第五章：卡关了怎么办？像小侦探一样排除嫌疑

在解 15×15 或 20×20 的高难度图画时，偶尔会遇到所有明显的重叠都找完了、不知道下一步点哪里的时候。这时候只要做三件事：

### 5.1 第一步：检查有没有漏打的叉号
90% 的卡关，都是因为**该打叉的地方没有打叉**！
回头认真看一看每一行：
- 有没有哪个已经涂完的积木两头还没关大门？赶紧补上叉号！
- 有没有哪个夹在中间的小缝隙太短了根本塞不下积木？赶紧补上叉号！
叉号一补上，原本宽敞的大道就变成了窄门，积木的活动空间被压缩，“两头挤一挤”的重叠格就会立刻跳出来！

### 5.2 第二步：看谁只剩下一种放法
观察某个还剩下一两个数字的行：
如果这个数字只能放在左边的小空档里、右边根本放不下，那它就只能乖乖呆在左边！

### 5.3 第三步：小侦探的反证法（如果它是黑的会怎样？）
如果你盯住一个很关键的交叉格子，拿不准它是黑还是白：
在脑子里悄悄假设：“假如我把它涂成黑色，会发生什么？”
顺着脑内推一步：
“如果它是黑的，那这一列就变成了 4 个黑格连在一起，可是这一列的线索只要 2 呀！矛盾啦，大穿帮了！”
这说明什么？说明刚才的假设绝对是错的！
这个格子**绝对不能是黑的，它百分之百是个叉号！**
给它果断画上叉号，案情立刻大白！

---

## 第六章：双人 PK 对战绝招：眼急手快，稳中求胜

在 Puzzle PK 的在线联机对战中，你不仅能自己解谜，还能和好朋友或者全球的小伙伴实时对决！

### 6.1 竞速模式 (Speed PK)：大数开局，一笔拉满
1. **开局雷达扫大数**：比赛开始哨声一响，**千万别傻傻地从第 1 行第一格开始看**！眼睛像雷达一样飞快扫视全盘四周，只找最大的数字（比如 15、14、13、12 或者 10 格里的 8、9、10）。
2. **长线拖拽连笔**：用鼠标按住或者手指在屏幕上一划拉一条线，前 5 秒就把整张像素画的大骨干牢牢架好，速度比一个一个点快好几倍！
3. **顺手打叉**：画完一段积木，顺手在两头右键点上两个叉，马上看交叉的竖线，一路行云流水。

### 6.2 抢分模式 (Steal PK)：宁慢一秒，绝不乱蒙
在抢分模式里，两个人抢同一张棋盘：
- **得分与惩罚**：点对一个黑格得 1 分；但是如果点错了，不仅要扣分，还会被**冰冻罚站整整 2 秒钟**！在这 2 秒里你什么都不能点，只能眼睁睁看着对手把周围的好分数全抢光！
- **抢占十字枢纽**：优先抢大数字相交的中心格子。拿下这个关键格子，你就抢到了得分，还能把对手思考的思路直接打断！

---

## 第七章：高频疑难解答 (FAQ) 与十二字独门心诀

### 问：我做数织的时候老是容易画错一格，结果导致后面全盘皆输，有什么好办法吗？
**答：养成“不确定的格子绝不下手”的好习惯！**
数织不是填字猜谜，数织是 100% 讲道理的拼图。只要你涂下去的每一个黑格和打上去的每一个叉号，都是用“两头挤一挤”或“贴墙走”严丝合缝算出来的，就绝对不可能出错！每画完一行，抬头看一眼数字对不对，细心的小朋友通关最快！

### 问：手机屏幕太小，手指按的时候老是遮住视线按错怎么办？
**答：善用双指放大功能！**
在手机和平板上玩大图时，用两个手指张开，把棋盘放大一倍。格子变大之后，手指轻轻一点就能精准命中，完全不会按错；需要看全景时再两指合拢缩小回来。

### 问：同一道题目可能画出两幅不同的画吗？
**答：正规的好题目绝对不会！**
如果在一些小网站上遇到可以这样画也可以那样画的题目，那是题目本身设计得不合格。我们 Puzzle PK 网站上的所有题目都经过严格的计算机唯一性验证，每一道题都有一幅画好的、唯一的漂亮像素图在等着你揭晓！

### 数织通关十二字心诀
> **「先找大数，两头挤挤；勤打叉号，顺藤摸瓜。」**
> 牢牢背熟这十二个字：一开局专找大数字算两边重叠，有了空隙立刻打叉做屏障，顺着横竖交叉点顺藤摸瓜，整幅美丽的像素画就会展现在你眼前！`;

const enRules = `## Chapter 1: What is Nonogram? The Magic of Pixel Art & City Lights

Welcome to the **Puzzle PK Fun & Friendly Nonogram Guide**! Whether you are an elementary school student just learning the game or a puzzle lover tackling giant grids, mastering a few intuitive building-block techniques will allow you to solve every puzzle step-by-step with 100% pure deduction — zero guessing needed!

### 1.1 The Story of Pixel Art and Skyscraper Lights
How was Nonogram invented?
Back in 1987 in Tokyo, graphic artist Non Ishida was walking down the street at night. Looking up at the tall skyscrapers, she noticed office windows turning lights on and off. She thought: "If bright windows are black squares and dark windows are white squares, couldn't we paint a giant puppy or kitten on the building?"
At the exact same time, puzzle master Tetsuya Nishio created a coordinate drawing puzzle using number clues. Soon after, Nintendo brought it to millions of players worldwide as *Mario's Picross*!

### 1.2 What Do the Clue Numbers Tell You?
The game board is a neat grid of squares (such as 10x10 or 15x15). Numbers sit along the top and left borders.
Remember the two golden rules:
1. **The number equals the length of consecutive black blocks**:
   - If a row starts with **5**, it means exactly 5 solid black squares connected together.
   - If it says **2  3**, it means there is a block of 2, followed by some gap, then a block of 3.
2. **There MUST be at least one white space between different blocks**:
   - Just like trains need room between cars, the block of 2 and the block of 3 can never touch directly into a single block of 5. They must have at least one empty square separating them!

### 1.3 Pure Logic: No Guessing Ever Needed!
Every puzzle on Puzzle PK is mathematically verified by computers to have **one and only one unique, logical solution**. You never need to gamble or guess. Follow the rules below, and every answer will appear like magic!

---

## Chapter 2: The Number One Secret: Push from Both Ends (Finding Overlaps)

When looking at a brand new, empty grid, where do you start?
The answer: **Find the big numbers and push them from both ends!**

### 2.1 The Train at the Station: Push Left and Push Right
Let's see an easy example:
Suppose a row has **10 squares**, and the clue is a big **8**.
Imagine an 8-car train on this 10-track rail:
- **Case A (Parked all the way to the Left)**: The train covers squares 1, 2, 3, 4, 5, 6, 7, and 8 (leaving 9 and 10 empty).
- **Case B (Parked all the way to the Right)**: The train covers squares 3, 4, 5, 6, 7, 8, 9, and 10 (leaving 1 and 2 empty).

Look closely at the board:
Whether the train is on the left or the right, **squares 3, 4, 5, 6, 7, and 8 are covered in both cases!**
Even if the train stops in the middle, those 6 squares are unconditionally under the train. They must be solid black!
Right on move one, you can paint squares 3 through 8 black with absolute confidence!

### 2.2 Mental Math Trick: Subtract Empty Space from the Block
Here is a fast way to calculate overlaps in your head:
1. **Step 1**: How much empty slack space is left?
   - 10 squares total minus 8-block length = 2 empty spaces.
2. **Step 2**: Subtract the empty slack from the block length!
   - 8 - 2 = 6 overlapping squares!
3. **Result**: Leave 2 empty at each end, and paint the middle 6 squares black!

Try another one:
- What if a 10-square row has clue **6**?
  - Slack space = 10 - 6 = 4 squares.
  - Overlap = 6 - 4 = 2 squares!
  - Leave 4 on each end, and squares 5 and 6 are guaranteed black!
- What if a 10-square row has clue **10**?
  - 10 - 10 = 0 slack. Paint the entire row black instantly!

### 2.3 Multiple Clues on One Line: Tie Them Together
What if the clue is **4  3** on a 10-square line?
Tie them together with the minimum required 1-space gap:
- Block of 4 + 1 gap + Block of 3 = 8 squares minimum!
- Slack space: 10 - 8 = 2 squares!
Now check each block:
- Block of 4 minus 2 slack = 2 overlapping black squares!
- Block of 3 minus 2 slack = 1 overlapping black square!
You just revealed 3 confirmed black squares at once!

---

## Chapter 3: Four Core Solving Tricks

Once initial black squares appear, use these four intuitive tricks to keep rolling:

### 3.1 Trick 1: Count from the Wall (Edge Pinning)
If square 1 at the far edge is painted black, and the first clue is **4**:
- That edge square must belong to the 4-block!
- Paint squares 1, 2, 3, and 4 black right away.
- **Super important**: Place a cross (×) on square 5 immediately! Because the block is finished, it must have a space after it.

### 3.2 Trick 2: Small Drawers Can't Fit Big Toys (Gap Exclusion)
Crosses (×) act like solid brick walls.
If two crosses form an isolated little gap that is only **2 squares wide**, but your shortest remaining clue is **3**:
Can an 3-block toy fit inside a 2-square drawer?
Never!
Therefore, that 2-square gap can never hold any blocks: **cross them all out with (×) right now!**
Closing small gaps shrinks the board and often reveals new overlaps in the remaining space!

### 3.3 Trick 3: Close the Doors (Capping Completed Blocks)
When a clue says **3**, and you see 3 consecutive black squares already filled, that block is 100% finished. It cannot grow any longer!
Put a cross (×) at both ends to close the doors so it doesn't accidentally stretch into a 4 or 5.

### 3.4 Trick 4: Exact Fit Rows
If the clues add up exactly to the line length (e.g., clues 5 and 4 on a 10-line: 5 + 1 space + 4 = 10):
It fills the entire line with zero slack! Paint 5, cross 1, paint 4. Solved in one second!

---

## Chapter 4: Crossroad Connections: Look Across Rows and Columns

Don't get stuck staring at just one row! The magic of Nonogram is in the intersections.

### 4.1 A Stroke in a Row Unlocks the Column
Whenever you place a new black square in row 3, don't walk away:
**Look down the column passing through that new square!**
That column might have been unsure before, but your new square gives it an anchor. It will often let you paint 2 or 3 new squares vertically right away!
The master's habit: **Check rows, then check columns, back and forth!**

### 4.2 The Four Magical Corners
The four corners of the grid (top-left, top-right, bottom-left, bottom-right) are high-powered intersections. Filling a corner sends solid lines shooting outward in two directions at once!

### 4.3 The Full-Line Laser Beam
If you spot a clue of **15** on a 15x15 board:
That is a full laser beam! Paint all 15 squares black top-to-bottom. It places a confirmed black square in every single row on the board!

---

## Chapter 5: What to Do If You Get Stuck?

On difficult 15x15 or 20x20 boards, if you run out of obvious overlaps, do these three things:

### 5.1 Check for Missing Crosses (×)
90% of roadblocks happen because players **forgot to put crosses on completed blocks**!
Look over every line:
- Are there finished blocks missing end caps? Add crosses!
- Are there tiny spaces too small for any remaining clues? Add crosses!
Once you add crosses, the free space shrinks, and big overlaps will appear again!

### 5.2 Detective Test: What If It Were Black?
If you are wondering about a key intersection cell:
Ask yourself: "If this cell were black, what would happen to its column?"
If making it black would force the column to have 4 black squares when the clue only allows 2, then your assumption is impossible!
That cell **CANNOT be black — it is guaranteed to be a cross (×)!**

---

## Chapter 6: Multiplayer PK Tactics (Speed & Steal PK)

### 6.1 Speed PK: Radar Scan & Smooth Dragging
1. **Radar Scan for Big Clues**: When the match starts, scan the edges for the biggest numbers (like 10, 9, 8).
2. **Continuous Dragging**: Click and drag your mouse or finger across the line to paint 5x faster than tapping one by one!
3. **Cap as You Go**: Right-click crosses at the ends of completed blocks as you slide past.

### 6.2 Steal PK: Stay Calm and Avoid Freezes!
- In Steal PK, both players share one board:
- Correct clicks give +1 point. But wrong clicks deduct points and **freeze your screen for 2 full seconds**!
- During those 2 frozen seconds, your opponent can steal 5 easy points! Never guess wildly. Target the central intersection squares!

---

## Chapter 7: FAQ & The Twelve-Word Master Creed

### Q: What if the squares are too small on my phone screen?
**A: Use two fingers to pinch and zoom!** Enlarge the board until each cell is as big as a chocolate bar, and tap with 100% comfort.

### Q: Why are crosses just as important as black squares?
Crosses act like fences. Fencing off impossible areas traps the blocks into smaller pens, forcing them to reveal their exact coordinates!

### The Twelve-Word Master Creed
> **"Find big numbers; push both ends; place your crosses; follow the clues!"**`;

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
console.log('1. Updating i18n JSON files for game.nonogram.seo_desc...');
const languages = ['zh', 'en', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
for (const lang of languages) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const newDesc = seoDescMap[lang] || seoDescMap.en;
  content['game.nonogram.seo_desc'] = newDesc;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  Updated ${lang}.json (length: ${newDesc.length} chars)`);
}

// ==========================================
// 4. Execution: Update games-docs.json
// ==========================================
console.log('2. Updating games-docs.json for nonogram...');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
const nono = docs.find(d => d.id === 'nonogram');
if (!nono) {
  console.error('Nonogram not found in games-docs.json!');
  process.exit(1);
}

nono.rules = JSON.stringify(updatedRules);
fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf-8');
console.log(`  Successfully updated nonogram in games-docs.json! (zh length: ${zhRules.length}, en length: ${enRules.length})`);

// Sanity check: verify ZERO dollar signs in zhRules and enRules
if (zhRules.includes('$')) console.error('WARNING: zhRules contains $ !');
else console.log('  Sanity check PASSED: zhRules contains ZERO dollar signs ($)!');

if (enRules.includes('$')) console.error('WARNING: enRules contains $ !');
else console.log('  Sanity check PASSED: enRules contains ZERO dollar signs ($)!');
