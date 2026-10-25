const fs = require('fs');
const path = require('path');

const zhDocPath = path.join(__dirname, 'block-doc-zh.md');
const enDocPath = path.join(__dirname, 'block-doc-en.md');
const gamesDocsPath = path.join(__dirname, '../public/assets/games-docs.json');
const i18nDir = path.join(__dirname, '../src/assets/i18n');

const zhRules = fs.readFileSync(zhDocPath, 'utf8');
const enRules = fs.readFileSync(enDocPath, 'utf8');

// 1. Update games-docs.json
console.log('Reading games-docs.json...');
const docsData = JSON.parse(fs.readFileSync(gamesDocsPath, 'utf8'));
const blockDoc = docsData.find(d => d.id === 'block');

if (!blockDoc) {
  console.error('block entry not found in games-docs.json!');
  process.exit(1);
}

let existingRules = {};
try {
  existingRules = JSON.parse(blockDoc.rules);
} catch (e) {
  existingRules = {};
}

existingRules.zh = zhRules;
existingRules.en = enRules;
// For other languages, retain existing or update with structured English/localized headers
existingRules.es = enRules;
existingRules.ja = enRules;
existingRules.ko = enRules;
existingRules.pt = enRules;
existingRules.fr = enRules;
existingRules.de = enRules;

blockDoc.rules = JSON.stringify(existingRules);

fs.writeFileSync(gamesDocsPath, JSON.stringify(docsData, null, 2), 'utf8');
console.log('Successfully updated games-docs.json for block!');

// 2. Prepare Tier 1 SEO & In-game Quick Rules (HTML for modal & SEO)
const tier1ZH = `<h2>关于俄罗斯方块拼图 (Block Puzzle / 1010!)</h2>
<p>俄罗斯方块拼图（Block Puzzle）是一款将经典几何骨牌与 10×10 无重力空间规划融为一体的现代休闲消除大作。它剥离了传统俄罗斯方块中令人窒息的重力下落与时间限制，赋予玩家在 100 格矩阵中运筹帷幄的绝对自由。支持多端响应式适配，无论在手机、平板还是电脑浏览器中均可免安装即点即玩。</p>

<h3>核心操作方式 (Controls)</h3>
<table>
  <thead>
    <tr><th>操作类型</th><th>鼠标 / 触摸屏</th><th>键盘快捷键</th><th>功能说明</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>挑选拼块</strong></td><td>点击下方手牌槽位 / 按住拖拽</td><td><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd></td><td>选中对应手牌（高亮外框提示），再次点击取消</td></tr>
    <tr><td><strong>移动光标 / 预览</strong></td><td>鼠标悬停棋盘网格 / 拖拽移动</td><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或 <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></td><td>预览拼块落点虚影（绿色有效，红色受阻）</td></tr>
    <tr><td><strong>确认落子</strong></td><td>点击目标网格 / 松开拖拽手指</td><td><kbd>Space</kbd> 或 <kbd>Enter</kbd></td><td>将选中拼块落入棋盘，触发消除与音效</td></tr>
    <tr><td><strong>取消选择</strong></td><td>点击棋盘外部或再次点击手牌</td><td><kbd>Esc</kbd></td><td>取消当前手牌选中状态</td></tr>
    <tr><td><strong>快速重开</strong></td><td>点击顶部重开按钮</td><td><kbd>R</kbd></td><td>单人模式下快速重置开局</td></tr>
  </tbody>
</table>

<h3>核心游戏机制</h3>
<ul>
  <li><strong>10×10 空间收纳</strong>：在 100 格无重力网格中自由落子。拼块<strong>完全不可旋转</strong>，必须以原有姿态规划。</li>
  <li><strong>三手整批派发</strong>：每次固定生成 3 块手牌，只有全部放完才会补发下一批。务必统筹三手连动！</li>
  <li><strong>整行整列消除</strong>：填满任意一行（横向）或一列（纵向）立即爆裂消除并腾出空间。</li>
  <li><strong>连消暴击机制</strong>：单步消除多线（2~5线）以及连续每步触发消除将启动 Combo 翻倍乘数！</li>
</ul>

<h3>得分模型速查</h3>
<table>
  <thead>
    <tr><th>消除类型</th><th>消除线数</th><th>基础得分</th><th>连击加成公式</th></tr>
  </thead>
  <tbody>
    <tr><td>单线消除</td><td>1 线</td><td>100 分</td><td>基础分 × (1 + 0.5 × (Combo - 1))</td></tr>
    <tr><td>双线 / 十字消除</td><td>2 线</td><td>360 分</td><td>极高性价比，清场核心</td></tr>
    <tr><td>三线连消</td><td>3 线</td><td>800 分</td><td>高阶战术爆发</td></tr>
    <tr><td>大四喜同消</td><td>4 线</td><td>1,600 分</td><td>激光全屏贯通</td></tr>
    <tr><td>完美全清 (All-Clear)</td><td>清空全盘</td><td>+1,500 净奖励</td><td>盘面无残留积木终极嘉奖</td></tr>
  </tbody>
</table>

<h3>大师生存十二字心诀</h3>
<p><strong>「常留九宫，统筹三手；多线连消，步步为营。」</strong> 始终在棋盘核心或边角保留一个纯净的 3×3 安全区，防止遭遇巨型正方形瞬间暴毙。</p>

<h2>常见问题 (FAQ)</h2>
<h3>方块拼图可以旋转形状吗？</h3>
<p>不可以。形状锁定是本游戏的核心挑战。你必须通过提前规划行与列的消除，来主动改造棋盘以适应手牌。</p>

<h3>手机上玩容易被手指遮挡吗？</h3>
<p>完全不会！我们独创了防遮挡指距算法，拖拽时拼块会位于手指正上方一段距离，确保落子视野开阔清晰；同时也支持点击手牌后再点击格子的「点选落子」模式。</p>

<h3>多人联机 PK 是如何对战的？</h3>
<p>在联机模式下，所有对战玩家共用完全相同的伪随机发牌序列，公平比拼空间规划与得分爆发力。先死局或落后者出局，并可实时观战。</p>`;

const tier1EN = `<h2>About Block Puzzle (1010!)</h2>
<p>Block Puzzle is a modern spatial packing and line-clearing game blending geometric polyomino aesthetics with pure 10×10 zero-gravity puzzle planning. Stripping away the gravity and countdown timers of Tetris, it grants complete freedom to strategize your moves across a 100-cell grid. Fully responsive across desktop, tablet, and mobile browsers with instant play.</p>

<h3>Game Controls</h3>
<table>
  <thead>
    <tr><th>Action</th><th>Mouse / Touchscreen</th><th>Keyboard</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Select Shape</strong></td><td>Click hand slot / Drag shape</td><td><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd></td><td>Select hand piece (elevated cyan border); click again to deselect</td></tr>
    <tr><td><strong>Move / Preview</strong></td><td>Hover board cell / Drag across board</td><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></td><td>Move cursor and preview ghost placement shadow</td></tr>
    <tr><td><strong>Commit Placement</strong></td><td>Click cell / Release drag</td><td><kbd>Space</kbd> or <kbd>Enter</kbd></td><td>Place piece at valid position and trigger clears</td></tr>
    <tr><td><strong>Cancel Selection</strong></td><td>Click board backdrop</td><td><kbd>Esc</kbd></td><td>Deselect current hand shape</td></tr>
    <tr><td><strong>Quick Restart</strong></td><td>Click top Restart button</td><td><kbd>R</kbd></td><td>Instantly reset game in single-player mode</td></tr>
  </tbody>
</table>

<h3>Core Mechanics</h3>
<ul>
  <li><strong>10×10 Zero-Gravity Grid</strong>: Place shapes anywhere without gravity. Shapes <strong>cannot be rotated</strong>; adapt your grid topography to fit them.</li>
  <li><strong>Triad Batch Dealing</strong>: Shapes are dealt in sets of 3. New shapes arrive only after all 3 are played. Always plan all three steps!</li>
  <li><strong>Row & Column Clears</strong>: Completely filling any horizontal row or vertical column detonates it instantly, reclaiming space.</li>
  <li><strong>Combo Multipliers</strong>: Clearing multiple lines simultaneously (2–5 lines) or maintaining consecutive clears scales score exponentially!</li>
</ul>

<h3>Scoring Matrix</h3>
<table>
  <thead>
    <tr><th>Clear Type</th><th>Lines Cleared</th><th>Base Score</th><th>Combo Formula</th></tr>
  </thead>
  <tbody>
    <tr><td>Single Clear</td><td>1 Line</td><td>100 pts</td><td>Base × (1 + 0.5 × (Combo - 1))</td></tr>
    <tr><td>Double / Cross Clear</td><td>2 Lines</td><td>360 pts</td><td>High efficiency core tactic</td></tr>
    <tr><td>Triple Clear</td><td>3 Lines</td><td>800 pts</td><td>Tactical burst</td></tr>
    <tr><td>Quad Clear</td><td>4 Lines</td><td>1,600 pts</td><td>Screen-clearing laser blast</td></tr>
    <tr><td>Perfect All-Clear</td><td>Wipe 100% board</td><td>+1,500 Bonus</td><td>Board fully emptied</td></tr>
  </tbody>
</table>

<h3>Master Creed</h3>
<p><strong>"Preserve the 3×3 Sanctuary, Plan the Entire Triad, Cascade Continuous Clears, Step by Prudent Step."</strong> Always hold a pristine 3×3 void to survive sudden giant square spawns.</p>

<h2>Frequently Asked Questions (FAQ)</h2>
<h3>Can I rotate shapes?</h3>
<p>No. Fixed orientation is the core rule of Block Puzzle. Sculpt your board to fit incoming pieces rather than trying to rotate them.</p>

<h3>Does touch dragging block the view?</h3>
<p>Not at all! Our smart offset algorithm renders dragged pieces comfortably above your fingertip. You can also tap a hand piece and then tap a board cell to place it without dragging.</p>

<h3>How does multiplayer PK work?</h3>
<p>Players share identical pseudo-random shape sequences in real time, competing strictly on spatial efficiency and combo execution.</p>`;

const langMap = {
  'zh.json': tier1ZH,
  'en.json': tier1EN,
  'es.json': tier1EN,
  'ja.json': tier1ZH,
  'ko.json': tier1EN,
  'fr.json': tier1EN,
  'de.json': tier1EN,
  'pt.json': tier1EN
};

for (const [filename, content] of Object.entries(langMap)) {
  const filePath = path.join(i18nDir, filename);
  if (fs.existsSync(filePath)) {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    json['game.block.seo_desc'] = content;
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Updated game.block.seo_desc in ${filename}`);
  }
}

console.log('All block docs successfully updated!');
