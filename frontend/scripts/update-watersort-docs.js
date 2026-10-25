const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT_DIR, 'src', 'assets', 'i18n');
const DOCS_JSON = path.join(ROOT_DIR, 'public', 'assets', 'games-docs.json');
const DIST_DOCS_JSON = path.join(ROOT_DIR, 'dist', 'x-game', 'browser', 'assets', 'games-docs.json');

const TIER2_ZH = fs.readFileSync(path.join(__dirname, 'watersort-doc-zh.md'), 'utf8');
const TIER2_EN = fs.readFileSync(path.join(__dirname, 'watersort-doc-en.md'), 'utf8');

// ==========================================
// 1. TIER 1: In-Game Quick Rules & Controls HTML
// ==========================================

const TIER1_ZH = `<h2>水管分色 (Water Sort Puzzle) 核心规则与操作指南</h2>
<p><strong>水管分色 (Water Sort)</strong> 是一款将离散组合数学、图染色理论与物理流体美学融为一体的经典解谜与多人竞技游戏。玩家面对多根装有不同颜色混合液体的试管，通过严密的拓扑调度与色彩合并，使每根试管最终只包含<strong>单一纯色</strong>或完全置空。</p>

<h3>🎮 游戏控制与快捷键指南</h3>
<table style="width:100%; border-collapse: collapse; margin-bottom: 1rem;">
  <thead>
    <tr style="border-bottom: 2px solid var(--color-border-card); text-align: left;">
      <th style="padding: 8px;">操作方式</th>
      <th style="padding: 8px;">键位 / 动作</th>
      <th style="padding: 8px;">说明</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>选择源试管</strong></td>
      <td style="padding: 8px;"><kbd>鼠标点击</kbd> / <kbd>触控轻按</kbd></td>
      <td style="padding: 8px;">选中源试管，试管将上浮并选定最上层的同色水柱</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>倾倒至目标</strong></td>
      <td style="padding: 8px;"><kbd>点击目标试管</kbd></td>
      <td style="padding: 8px;">触发倾倒动画，水柱自动批量注入目标试管</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>取消选中</strong></td>
      <td style="padding: 8px;"><kbd>再次点击源试管</kbd></td>
      <td style="padding: 8px;">试管下沉复位，取消当前选定状态</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>极速重开本局</strong></td>
      <td style="padding: 8px;"><kbd>R</kbd> 键 / 工具栏重开按钮</td>
      <td style="padding: 8px;">单人模式下瞬间重置当前棋盘并重置步数</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>智能提示</strong></td>
      <td style="padding: 8px;">工具栏 <kbd>💡 提示</kbd></td>
      <td style="padding: 8px;">由求解引擎推算一步最佳合规移动，若无解则提示并自愈</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>难度切换</strong></td>
      <td style="padding: 8px;">顶部下拉框</td>
      <td style="padding: 8px;">简单（7管5色）、中等（11管9色）、困难（16管14色）</td>
    </tr>
  </tbody>
</table>

<h3>🧪 倒水四大公理与物理约束</h3>
<ul>
  <li><strong>同色相吸公理 (Color Matching)</strong>：仅当目标试管顶层颜色与源试管顶层颜色<strong>完全一致</strong>时，方可倾倒。严禁不同颜色液体直接接触叠加！</li>
  <li><strong>容量绝对约束 (Capacity Invariant)</strong>：每根试管物理容量严格恒定为 <strong>4 格</strong>。目标试管达到 4 格后无法再注入任何液体。</li>
  <li><strong>贪心批量倾倒 (Greedy Batch Pour)</strong>：源试管顶层所有连续同色单元在一次动作中会被<strong>全量批量倾倒</strong>，直至源试管连续同色耗尽或目标试管达到 4 格容量。</li>
  <li><strong>空管中转特权 (Empty Tube Buffer)</strong>：开局时提供的 2 根完全置空的试管是全局最稀缺的“自由度（Degrees of Freedom）”，可无条件接收任意颜色的液体。</li>
</ul>

<h3>🧠 人脑解题五大核心定式</h3>
<ol>
  <li><strong>空管守恒定律 (Buffer Conservation)</strong>：空试管是不可再生的战略中转站。严禁无目的占用空管，每次使用空管必须有明确的“腾出新空管”推演链条。</li>
  <li><strong>自顶向下逆向破冰 (Top-Down Excavation)</strong>：观察试管底座大色块，优先剥离压在上面的杂色层，绝不被表层单格颜色分散精力。</li>
  <li><strong>严禁二次碎片化 (Split Avoidance)</strong>：已凝聚为 2 格或 3 格的同色水柱切忌二次拆散分流，碎片化是中后期死锁的根源。</li>
  <li><strong>底座筑基与封顶 (Bottom-Up Foundation)</strong>：当某试管底部已积聚 3 格纯色，最高优先级是寻找第 4 格完成封顶。封顶后问题规模永久缩小为 N-1。</li>
  <li><strong>连环链式置换 (Chained Cascade)</strong>：借助空管发起 3~4 步循环倾倒（A→Empty, B→A, C→B, Empty→C），实现全局零损耗归位并重新释放空管。</li>
</ol>

<h3>⚔️ 多人联机对战（Speed PK）机制</h3>
<ul>
  <li><strong>绝对公平同源同题</strong>：PK 房间内所有玩家同步加载<strong>完全一致的初始试管排列种子</strong>，无运气偏差，纯粹比拼空间拓扑洞察力与手速。</li>
  <li><strong>实时态势遥测</strong>：右侧 HUD 实时显示对手完成试管数与百分比，领先时稳扎稳打，落后时极限冲刺。</li>
  <li><strong>失误快速回溯</strong>：若走入僵局，单人模式按 <kbd>R</kbd> 一键重开；PK 模式下应保持冷静利用反向置换解开死锁。</li>
</ul>

<p>👉 欲了解完整的状态空间有向图分析、IDA* 算法求解原理、深层死锁图谱与十二字心诀，请查阅 <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">水管分色深度战略攻略宝典</a>。</p>`;

const TIER1_EN = `<h2>Water Sort Puzzle Core Rules & Master Guide</h2>
<p><strong>Water Sort Puzzle</strong> is a mesmerizing brain teaser that merges discrete combinatorial graph theory, color-matching mechanics, and fluid physics aesthetics. Facing multiple test tubes filled with layered colored liquids, players execute precise topological transfers and batch consolidations until every tube contains only <strong>one pure color</strong> or is completely empty.</p>

<h3>🎮 Controls & Keyboard Shortcuts</h3>
<table style="width:100%; border-collapse: collapse; margin-bottom: 1rem;">
  <thead>
    <tr style="border-bottom: 2px solid var(--color-border-card); text-align: left;">
      <th style="padding: 8px;">Control Mode</th>
      <th style="padding: 8px;">Key / Gesture</th>
      <th style="padding: 8px;">Function Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Select Source Tube</strong></td>
      <td style="padding: 8px;"><kbd>Click</kbd> / <kbd>Tap</kbd></td>
      <td style="padding: 8px;">Elevates the tube and selects its top contiguous color stream</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Pour to Target</strong></td>
      <td style="padding: 8px;"><kbd>Click Target Tube</kbd></td>
      <td style="padding: 8px;">Triggers pouring animation, batch-transferring fluid into the destination</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Deselect</strong></td>
      <td style="padding: 8px;"><kbd>Click Source Again</kbd></td>
      <td style="padding: 8px;">Returns the tube to its resting position and clears selection</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Instant Restart</strong></td>
      <td style="padding: 8px;"><kbd>R</kbd> Key / Restart Button</td>
      <td style="padding: 8px;">Instantly resets the current board and moves counter in single player</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Smart Hint</strong></td>
      <td style="padding: 8px;">Toolbar <kbd>💡 Hint</kbd></td>
      <td style="padding: 8px;">Computes the optimal valid move; warns and recovers if state is locked</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--color-border-card);">
      <td style="padding: 8px;"><strong>Difficulty Selector</strong></td>
      <td style="padding: 8px;">Top Dropdown</td>
      <td style="padding: 8px;">Easy (7 Tubes / 5 Colors), Medium (11 / 9), Hard (16 / 14)</td>
    </tr>
  </tbody>
</table>

<h3>🧪 The Four Physical Pouring Axioms</h3>
<ul>
  <li><strong>Color Matching Axiom</strong>: You can ONLY pour fluid onto a target tube if its top layer matches the incoming color. Mismatched colors cannot contact each other.</li>
  <li><strong>Capacity Invariant</strong>: Every tube has a strict physical capacity of <strong>4 units</strong>. Once a tube has 4 units, no additional liquid can enter.</li>
  <li><strong>Greedy Batch Pour Principle</strong>: All contiguous units of the top color are transferred in one single operation, up to the remaining capacity of the destination.</li>
  <li><strong>Empty Tube Buffer</strong>: The 2 empty buffer tubes provided at the start are the most precious degrees of freedom on the board and can accept any color.</li>
</ul>

<h3>🧠 Five Core Mental Heuristics</h3>
<ol>
  <li><strong>Buffer Conservation Law</strong>: Empty tubes are strategic registers. Never park liquid into an empty tube without a clear derivation chain to free another tube.</li>
  <li><strong>Top-Down Excavation</strong>: Identify foundational colors at tube bottoms and methodically peel away covering layers by merging them into matching destinations.</li>
  <li><strong>Split Avoidance Principle</strong>: Never divide an already consolidated color stream (2 or 3 units) across multiple tubes; fragmentation causes deadlocks.</li>
  <li><strong>Bottom-Up Foundation & Sealing</strong>: When a tube reaches 3 units of pure color at the base, prioritize sealing the 4th unit to permanently reduce problem complexity to N-1.</li>
  <li><strong>Chained Cascade Maneuver</strong>: Utilize an empty buffer to execute cyclic transfers (A→Empty, B→A, C→B, Empty→C), accomplishing clean realignment while restoring the buffer.</li>
</ol>

<h3>⚔️ Multiplayer Speed PK Arena</h3>
<ul>
  <li><strong>Identical Seed Racing</strong>: All players receive the exact same initial tube configuration, guaranteeing 100% fair skill-based competition.</li>
  <li><strong>Live Telemetry HUD</strong>: Real-time progress bars show opponents' completion rates and move counts. Balance deliberate accuracy against raw speed.</li>
  <li><strong>Deadlock Recovery</strong>: Press <kbd>R</kbd> in single player to instantly restart; in PK mode, stay calm and reverse tangled transfers to recover the board.</li>
</ul>

<p>👉 For the complete mathematical state-space analysis, IDA* solver proofs, deadlock taxonomy, and the Twelve-Word Formula, visit the <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">Water Sort Master Strategy Monograph</a>.</p>`;

const TIER1_ES = `<h2>Reglas del Rompecabezas de Clasificación de Agua (Water Sort)</h2>
<p><strong>Water Sort</strong> es un clásico juego de ingenio que combina teoría de grafos, combinatoria y física de fluidos. Clasifica líquidos de colores en tubos de ensayo hasta que cada tubo contenga un <strong>único color puro</strong> o esté completamente vacío.</p>
<h3>🎮 Controles y Atajos de Teclado</h3>
<ul>
  <li><kbd>Clic / Toque</kbd>: Selecciona el tubo de origen; pulsa el tubo de destino para transferir el líquido.</li>
  <li><kbd>R</kbd>: Reinicio instantáneo del tablero actual en modo solitario.</li>
  <li><kbd>💡 Pista</kbd>: Muestra el mejor movimiento legal calculado por el motor.</li>
</ul>
<h3>🧪 Reglas de Vertido</h3>
<ul>
  <li><strong>Mismo Color</strong>: Solo puedes verter sobre un líquido del MISMO color.</li>
  <li><strong>Capacidad 4</strong>: Cada tubo tiene un límite estricto de 4 unidades.</li>
  <li><strong>Vertido en Bloque</strong>: Se vierten todas las unidades contiguas del mismo color de golpe.</li>
  <li><strong>Tubos Vacíos</strong>: Pueden recibir cualquier color y actúan como búfer de almacenamiento.</li>
</ul>
<p>👉 Consulta la <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">Guía Estratégica Completa de Water Sort</a> para tácticas avanzadas.</p>`;

const TIER1_JA = `<h2>ウォーターソートパズル（水管分色）基本ルールと操作ガイド</h2>
<p><strong>ウォーターソートパズル (Water Sort)</strong> は、離散数学と流体物理の美しさを融合させた論理パズルです。試験管内の混ざり合った液体を並べ替え、最終的に各チューブに<strong>単一色</strong>のみが入った状態を目指します。</p>
<h3>🎮 操作方法とショートカット</h3>
<ul>
  <li><kbd>クリック / タップ</kbd>：注ぎ元の試験管を選択し、注ぎ先の試験管をタップして流し込みます。</li>
  <li><kbd>R</kbd> キー：現在の盤面を即座にリセット（シングルプレイ時）。</li>
  <li><kbd>💡 ヒント</kbd>：ソルバーが計算した最適な一手を表示します。</li>
</ul>
<h3>🧪 4大注水ルール</h3>
<ul>
  <li><strong>同色一致</strong>：注ぎ先の最上層と同じ色の液体のみ注ぐことができます。</li>
  <li><strong>容量制限（4マス）</strong>：チューブの容量は4ユニット厳守です。</li>
  <li><strong>連続ブロック一括移動</strong>：同じ色の連続層は一括してまとめて注がれます。</li>
  <li><strong>空チューブの特権</strong>：完全に空のチューブにはどの色でも一時保管できます。</li>
</ul>
<p>👉 状態空間グラフや高度な定式は <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">ウォーターソート完全戦略ガイド</a> をご覧ください。</p>`;

const TIER1_KO = `<h2>워터 소트 퍼즐 (Water Sort) 핵심 규칙 및 가이드</h2>
<p><strong>워터 소트 퍼즐 (Water Sort)</strong>은 이산수학의 그래프 이론과 유체 색상 분류를 결합한 두뇌 퍼즐입니다. 각 시험관에 <strong>하나의 순수한 색상</strong>만 남거나 완전히 빌 때까지 액체를 옮겨 담으세요.</p>
<h3>🎮 조작법 및 단축키</h3>
<ul>
  <li><kbd>클릭 / 터치</kbd>: 출발 시험관을 선택하고 대상 시험관을 탭하여 붓습니다.</li>
  <li><kbd>R</kbd> 키: 현재 판 즉시 재시작 (싱글 모드).</li>
  <li><kbd>💡 힌트</kbd>: 엔진이 계산한 최적의 이동을 보여줍니다.</li>
</ul>
<h3>🧪 4대 물리 원칙</h3>
<ul>
  <li><strong>동색 일치</strong>: 대상 시험관 상단과 동일한 색상 위에만 부을 수 있습니다.</li>
  <li><strong>용량 4칸</strong>: 각 시험관의 최대 용량은 4칸으로 고정됩니다.</li>
  <li><strong>연속 묶음 이동</strong>: 상단의 연속된 동일 색상은 한 번에 일괄 이동합니다.</li>
  <li><strong>빈 시험관 활용</strong>: 빈 시험관은 어떤 색상이든 임시 보관할 수 있는 버퍼입니다.</li>
</ul>
<p>👉 더 자세한 정석과 알고리즘은 <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">워터 소트 심층 공략 가이드</a>를 참고하세요.</p>`;

const TIER1_FR = `<h2>Règles du Puzzle de Tri de l'Eau (Water Sort)</h2>
<p><strong>Water Sort</strong> est un casse-tête élégant combinant combinatoire discrète et esthétique des fluides. Triez les liquides colorés jusqu'à ce que chaque tube ne contienne qu'une <strong>seule couleur pure</strong> ou soit vide.</p>
<h3>🎮 Contrôles et Raccourcis</h3>
<ul>
  <li><kbd>Clic / Appui</kbd> : Sélectionnez le tube source puis appuyez sur le tube cible pour verser.</li>
  <li><kbd>R</kbd> : Recommencer instantanément la partie en mode solo.</li>
  <li><kbd>💡 Indice</kbd> : Affiche le meilleur coup calculé par le moteur de jeu.</li>
</ul>
<h3>🧪 Règles de Versement</h3>
<ul>
  <li><strong>Même Couleur</strong> : Vous ne pouvez verser que sur un liquide de couleur identique.</li>
  <li><strong>Capacité 4</strong> : Chaque tube a une capacité maximale stricte de 4 unités.</li>
  <li><strong>Versement par Bloc</strong> : Toutes les unités contiguës de même couleur sont versées d'un coup.</li>
  <li><strong>Tubes Vides</strong> : Peuvent accueillir n'importe quelle couleur comme zone tampon.</li>
</ul>
<p>👉 Consultez le <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">Guide Stratégique Approfondi de Water Sort</a>.</p>`;

const TIER1_DE = `<h2>Water Sort Puzzle – Grundregeln und Steuerungsleitfaden</h2>
<p><strong>Water Sort</strong> ist ein faszinierendes Logikspiel, das diskrete Graphentheorie und Farbklassifizierung vereint. Sortiere die farbigen Flüssigkeiten um, bis jedes Röhrchen nur <strong>eine einzige reine Farbe</strong> enthält oder komplett leer ist.</p>
<h3>🎮 Steuerung und Tastenkürzel</h3>
<ul>
  <li><kbd>Klick / Tippen</kbd>: Wähle das Quellröhrchen und tippe auf das Zielröhrchen zum Umfüllen.</li>
  <li><kbd>R</kbd>: Sofortiger Neustart des aktuellen Levels im Einzelspielermodus.</li>
  <li><kbd>💡 Hinweis</kbd>: Zeigt den vom Löser berechneten besten legalen Zug an.</li>
</ul>
<h3>🧪 4 Gießregeln</h3>
<ul>
  <li><strong>Gleiche Farbe</strong>: Nur Flüssigkeiten gleicher Farbe dürfen aufeinander gegossen werden.</li>
  <li><strong>Kapazität 4</strong>: Jedes Röhrchen fasst maximal 4 Einheiten.</li>
  <li><strong>Blockweises Umfüllen</strong>: Zusammenhängende Schichten derselben Farbe werden im Block gegossen.</li>
  <li><strong>Leere Röhrchen</strong>: Dienen als universelle Puffer für beliebige Farben.</li>
</ul>
<p>👉 Besuche das <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">Umfassende Water Sort Strategie-Handbuch</a>.</p>`;

const TIER1_PT = `<h2>Regras do Quebra-Cabeça Water Sort</h2>
<p><strong>Water Sort</strong> é um clássico jogo de raciocínio que combina teoria de grafos e física de fluidos. Organize os líquidos coloridos até que cada tubo contenha apenas <strong>uma única cor pura</strong> ou fique totalmente vazio.</p>
<h3>🎮 Controles e Atalhos</h3>
<ul>
  <li><kbd>Clique / Toque</kbd>: Selecione o tubo de origem e toque no tubo de destino para transferir.</li>
  <li><kbd>R</kbd>: Reinício instantâneo da fase no modo solo.</li>
  <li><kbd>💡 Dica</kbd>: Exibe a jogada ideal calculada pelo motor do jogo.</li>
</ul>
<h3>🧪 Regras de Transferência</h3>
<ul>
  <li><strong>Mesma Cor</strong>: Só é permitido despejar sobre líquido da MESMA cor.</li>
  <li><strong>Capacidade 4</strong>: Cada tubo suporta no máximo 4 unidades.</li>
  <li><strong>Despejo em Lote</strong>: Todas as camadas contíguas da mesma cor são transferidas juntas.</li>
  <li><strong>Tubos Vazios</strong>: Podem receber qualquer cor como estação de transferência.</li>
</ul>
<p>👉 Confira o <a href="/docs/watersort" style="color: var(--color-accent-from); text-decoration: underline; font-weight: bold;">Guia Estratégico Completo do Water Sort</a>.</p>`;

// ==========================================
// 2. EXECUTE UPDATES
// ==========================================

console.log('1. Updating i18n files...');
const i18nMap = {
  'zh.json': TIER1_ZH,
  'en.json': TIER1_EN,
  'es.json': TIER1_ES,
  'ja.json': TIER1_JA,
  'ko.json': TIER1_KO,
  'fr.json': TIER1_FR,
  'de.json': TIER1_DE,
  'pt.json': TIER1_PT
};

for (const [filename, content] of Object.entries(i18nMap)) {
  const filePath = path.join(I18N_DIR, filename);
  if (fs.existsSync(filePath)) {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    json['game.watersort.seo_desc'] = content;
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`  Updated ${filename}`);
  }
}

console.log('2. Updating games-docs.json...');
if (fs.existsSync(DOCS_JSON)) {
  const docs = JSON.parse(fs.readFileSync(DOCS_JSON, 'utf8'));
  const entry = docs.find(d => d.id === 'watersort');
  if (entry) {
    const rulesObj = {
      zh: TIER2_ZH,
      en: TIER2_EN,
      es: TIER1_ES.replace(/<[^>]+>/g, ''),
      ja: TIER1_JA.replace(/<[^>]+>/g, ''),
      ko: TIER1_KO.replace(/<[^>]+>/g, ''),
      fr: TIER1_FR.replace(/<[^>]+>/g, ''),
      de: TIER1_DE.replace(/<[^>]+>/g, ''),
      pt: TIER1_PT.replace(/<[^>]+>/g, '')
    };
    entry.rules = JSON.stringify(rulesObj);
    fs.writeFileSync(DOCS_JSON, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`  Updated ${DOCS_JSON} with 7-chapter guides (ZH: ${TIER2_ZH.length} chars, EN: ${TIER2_EN.length} chars)`);

    // Sync to dist if present
    if (fs.existsSync(DIST_DOCS_JSON)) {
      fs.writeFileSync(DIST_DOCS_JSON, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`  Synced to ${DIST_DOCS_JSON}`);
    }
  } else {
    console.error('  Could not find id: "watersort" in games-docs.json!');
  }
}

console.log('Water Sort Tier 1 & Tier 2 documentation update completed successfully!');
