const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../public/assets/games-docs.json');
const docs = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));

const sudoku = docs.find(d => d.id === 'sudoku');
if (!sudoku) {
  console.error('Sudoku not found in games-docs.json');
  process.exit(1);
}

const zhRules = `## 第一章：数独的本质与数理逻辑模型

欢迎阅读 **Puzzle PK 经典数独全阶解谜指南**。无论你是刚刚接触数独的新人，还是尝试挑战专家级乃至恶魔级谜题的高手，掌握系统化的推演定理都将彻底改变你的解题视野。

### 1.1 纯粹符号集的排除逻辑
数独虽然使用数字 1 到 9，但它本质上与四则运算、加减乘除毫无关系。数字在数独中仅仅作为 **9 个互不相同的互斥符号（Symbols）**。哪怕将数字替换为 9 种颜色、9 个希腊字母或 9 种水果，解题的内在逻辑结构完全一致。

标准数独基于一个由 81 个单元格构成的 9×9 网格，同时划分为 9 个 3×3 的九宫格（Blocks）。它的核心法则只有一条：**在每一行、每一列以及每一个 3×3 宫格内，9 个符号必须全部出现且仅出现一次**。这意味着，任何一个空格与其所在行、所在列、所在九宫格共同构成了它的“约束领域（Peer Unit）”。

### 1.2 为什么真数独严禁猜测
在高质量的数独题库中（例如 Puzzle PK 生成的所有题目），每一道题都经过回溯算法严密验证，**保证存在且仅存在唯一的逻辑解**。

很多初学者在遇到瓶颈时习惯随意“猜一个数字看看”，这是数独练习中最大的陷阱：
1. **逻辑树链式崩塌**：一旦在某个分支猜错，错误往往在十多步之后才通过冲突显现，此时棋盘已被污染，无法追溯断点；
2. **阻断直觉提升**：每一次依靠猜测解题，都会失去发现隐藏逻辑结构（如数对、X-Wing）的宝贵复盘机会。数独的每一步推进，都必须是有据可循的必然推导。

---

## 第二章：从入门到进阶的核心推演手法

### 2.1 宫内排除法 (Cross-Hatching / Scanning)
宫内排除法是数独中最基础、最直观的破局手法：
- **原理**：选定一个特定数字（例如数字 7），观察它在棋盘各个宫格的分布。
- **推导**：已知某行已经存在 7，则该行所有的空格都不能再填 7；某列已经存在 7，该列所有的空格也不能再填 7。当这两条隐形射线穿透某个目标九宫格时，若该宫格内只剩下一个空格没有被射线封锁，则该空格**必定**填入 7。
- **实战建议**：开局时优先扫描盘面上出现频率最高的数字（出现 5~7 次的数字），往往能瞬间填出 3 到 5 个确定值。

### 2.2 唯一余数法 (Naked Single / Sole Candidate)
- **原理**：从单个单元格的视角出发，观察其所在的行、列、宫这三大“约束领域”。
- **推导**：如果某个空格所在的行出现了 [1, 2, 4]，所在的列出现了 [3, 5, 6]，所在的九宫格内出现了 [7, 8]，那么这三者合并的互斥集合已经包含了 8 个不同的数字：{1, 2, 3, 4, 5, 6, 7, 8}。根据排除原则，该格的候选数只剩下唯一定解：**9**。
- **实战技巧**：当某一行或某一列已经填了 7 个或 8 个数字时，剩余的格子用此方法能立刻秒解。

### 2.3 隐性单数法 (Hidden Single)
- **原理**：某个单元格虽然有多个候选数（例如同时可以填 2, 5, 7），但对于其所在的整行（或整列、整宫）而言，数字 2 **除了这个空格之外，在其他任何空格都无法立足**（被交叉排除）。
- **推导**：尽管这个空格看似有多个可能，但为了满足整行必须拥有 2 的硬性规则，它必须填入 2。
- **关键区别**：唯一余数法是“这个空格只能填它”，而隐性单数法是“这个数字只能放在这里”。

### 2.4 区块摒除法 (Locked Candidates / Pointing & Claiming)
这是迈入中高级数独的第一道分水岭：
- **指向型排除 (Pointing)**：在某个 3×3 宫格内，候选数 4 仅出现在第一行的两个格子里。虽然我们暂不确定具体在哪一格，但可以 100% 断定：**该宫的数字 4 必定落在这第一行**。因此，第一行在其他宫格里的所有空格，都可以安全地剔除候选数 4！
- **领地型排除 (Claiming)**：反之，若某一行内的候选数 4 全部位于中间那个九宫格内，则中间九宫格在其他行里的空格，绝对不可能填入 4。

---

## 第三章：高阶进阶技巧：数对与子集定理

当单数排除法无法继续推进时，就必须全面开启游戏内置的“注记/笔记 (Notes)”功能，利用集合论进行高阶清洗。

### 3.1 显性数对 (Naked Pairs)
- **定理**：在同一个行、列或九宫格内，如果恰好有两个单元格的候选数集合都**完全等于且仅等于两个相同的数字**（例如格 A 为 {3, 7}，格 B 也为 {3, 7}）。
- **推论**：数字 3 和 7 必定分别占据这两个格子。因此，该行（或列、宫）内的**所有其他空格**，都可以安全地删去候选数 3 和 7！
- **价值**：数对自身虽然没有立刻确定答案，但它为同一单元的其他格子扫清了迷雾，往往直接催生出新的“唯一余数”。

### 3.2 显性三数集 (Naked Triples)
- **定理**：显性数对的升维形式。若某行内有三个格子，它们的候选数分别是 {1, 5}、{5, 9}、{1, 9}（或者都为 {1, 5, 9} 的子集），三个格子总共只涵盖了 {1, 5, 9} 这三个数字。
- **推论**：这三个数字必定被这三格锁定，该行其余格子内的 1、5、9 候选数全部可以剔除。

### 3.3 隐性数对 (Hidden Pairs)
- **定理**：某一行内有 6 个空格，表面上候选数繁杂。但在仔细统计时发现，数字 4 和 8 在这整整一行中，**仅仅出现在格 C 和格 D 这两个位置**。
- **推论**：为了让这一行拥有 4 和 8，格 C 和格 D 必须由 4 和 8 瓜分。因此，格 C 和格 D 里原本记录的其他所有候选数（如 1, 3, 6）全部是伪解，应当立即清洗抹除，格 C 和格 D 瞬间转为显性数对 {4, 8}！

---

## 第四章：大师级终极定理：突破专家难题

### 4.1 X-Wing 定理 (四角定向排除法)
X-Wing 是数独解谜史上最经典、最具几何美感的定理，常用于终盘打破僵局：
- **构成形态**：
  - 寻找某个特定候选数（例如数字 6）；
  - 在第 2 行中，数字 6 仅仅只能出现在第 3 列和第 8 列；
  - 在第 7 行中，数字 6 同样仅仅只能出现在第 3 列和第 8 列；
  - 此时这四个点 (R2C3, R2C8, R7C3, R7C8) 构成了一个长方形的四个顶点，状如大写的“X”。
- **推导逻辑**：
  - 如果第 2 行的 6 在第 3 列，则根据互斥原则，第 7 行的 6 必须在第 8 列；
  - 如果第 2 行的 6 在第 8 列，则第 7 行的 6 必须在第 3 列。
  - **终极推论**：无论哪种情况发生，**第 3 列和第 8 列的所有其他行，都绝对不可能再有数字 6**！
- **成果**：你可以一口气将第 3 列和第 8 列中除这四个顶点外的所有候选数 6 全部删除，整盘局势瞬间盘活！

### 4.2 Swordfish 剑鱼定理 (三阶 X-Wing)
- **原理**：X-Wing 的三维扩展。当某个候选数在三行中，分别仅仅分布在相同的三个列（或其子集）内时，这三列的所有其余单元格都可以彻底删除该候选数。

### 4.3 XY-Wing (双分支候选强弱链)
- **形态**：由一个核心枢轴格（Pivot）和两个翼格（Pincer）组成。
  - 枢轴格候选数为 {A, B}；
  - 翼格 1 与枢轴同宫/同行，候选数为 {A, C}；
  - 翼格 2 与枢轴同列，候选数为 {B, C}。
- **推论**：枢轴格无论取 A 还是取 B，都会强制翼格 1 或翼格 2 之一变成 C。因此，**凡是同时能够看到两个翼格的所有公共交叉单元格**，候选数 C 全部可以安全移除！

---

## 第五章：实战残局手把手推导示范

我们以一段高难度残局为例演示逻辑链的咬合：

1. **第一步（全局视线扫描）**：观察全盘 1~9，发现数字 1 在第 1 宫、第 3 宫已经落位。利用十字射线扫描第 2 宫，锁定第 2 宫的 1 只能落在中央格 (R2C5)。
2. **第二步（标记候选数）**：在第 5 行，剩下 3 个空格未填，分别记入笔记。发现第 5 行的候选数为 {2, 7}、{7, 8}、{2, 8}，构成标准的显性三数集。
3. **第三步（清洗与破局）**：由此剔除该行其他可能，并在该行关联的第 6 列发现唯一余数法生效，立刻得出数字 3。
4. **第四步（连锁反应）**：填入 3 后，触发上方九宫格内的隐性单数，盘面如多米诺骨牌般连续破开，直至全盘 100% 验证通过。

---

## 第六章：Puzzle PK 竞速对抗提速心得

在 Puzzle PK 的实时对战模式中，解题不仅仅关乎正确率，更关乎反应速度与心态：

### 6.1 动眼动线与扫盘节奏
- **从稠密到稀疏**：永远先看数字已有 6~8 个的行、列、宫，收割最容易拿下的唯余点；
- **利用同数高亮**：在 Puzzle PK 界面中点击任意数字即可高亮全盘同数，利用高亮光斑形成的“十字空隙”进行快速盲扫，可节省 40% 的看盘时间；
- **双手协同键盘流**：左手放 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移位，右手按数字小键盘，配合 <kbd>Space</kbd> 切换笔记，速度远超鼠标点击。

### 6.2 抢夺模式 (Steal PK) 的博弈法则
- **坚决不盲猜**：抢夺模式中填错会被罚秒冻结！在被冻结的时间里，对手可以连续夺走数个关键空格；
- **抢占关键枢纽**：优先抢填位于九宫格中心或者十字交叉点的空格，这些位置会给对手的视线制造最大程度的信息封锁。

---

## 第七章：常见疑难解答 (In-Depth FAQ)

### Q: 为什么有时候按逻辑推导，最后却发现两行数字重复了？
A: 这几乎 100% 是因为在前面的某一步，将“隐性单数”或者“区块排除”推导错了一位。数独的容错率为零，一个细微的笔误会在多步推导后演变为不可调和的矛盾。建议遇到矛盾时，按下 <kbd>Ctrl+Z</kbd> 或使用界面的撤销按钮，回退到最近一次确认无误的稳定盘面。

### Q: 遇到专家级难题完全看不到可以填的数字，怎么办？
A: 当所有基础排除法失效时，必须执行“全盘笔记标注”。给所有剩余空格准确标出候选数后，寻找是否存在显性数对、区块排除或 X-Wing。99.9% 的高级难题都是通过数对削减候选数后破局的。
`;

const enRules = `## Chapter 1: The Foundations & Mathematical Logic of Sudoku

Welcome to the **Puzzle PK Master Class Sudoku Guide**. Whether you are a newcomer learning the basic grid or an experienced solver looking to conquer Expert, Fiendish, and Master puzzles, mastering systematic deductive theorems will fundamentally elevate your solving speed and logical vision.

### 1.1 Pure Symbolic Deduction, Not Arithmetic
Although Sudoku is played with the digits 1 through 9, it requires absolutely **no mathematical calculations**—no addition, subtraction, or multiplication. The digits simply represent **9 unique, mutually exclusive symbols**. If you replaced the numbers 1-9 with 9 distinct colors, letters, or geometric shapes, the underlying logic of the game would remain entirely identical.

A standard Sudoku board consists of an 81-cell 9×9 grid, subdivided into nine 3×3 blocks (also called nonets or boxes). Its universal rule is straightforward: **Every row, every column, and every 3×3 block must contain the symbols 1 through 9 exactly once**. Consequently, for any empty cell, its intersecting row, column, and block collectively form its "Peer Unit"—a 20-cell zone of strict mutual exclusion.

### 1.2 The Absolute Rule: Never Guess
In high-grade puzzles like those on Puzzle PK, every single puzzle is mathematically validated to possess **one and only one unique logical solution**.

Beginners often fall into the trap of making an intuitive guess when they get stuck:
1. **Catastrophic Failure Cascade**: A wrong guess rarely reveals itself immediately; it usually causes a contradiction 15 to 20 moves later. By then, the board is thoroughly corrupted with no easy way to backtrack.
2. **Stunted Intuition**: Guessing bypasses the opportunity to discover advanced structural patterns like Naked Pairs or X-Wings. Every correct placement in Sudoku must be logically forced by deduction.

---

## Chapter 2: Essential Solving Techniques (Beginner to Intermediate)

### 2.1 Cross-Hatching & Scanning
The most fundamental and quickest solving technique:
- **The Concept**: Pick a frequent digit (e.g., 7) and track its positions across the board.
- **The Logic**: If row 2 contains a 7, no other cell in row 2 can be 7. If column 5 contains a 7, no cell in column 5 can be 7. When these invisible blocker lines intersect a 3×3 box, if only one empty cell remains unblocked, that cell **must** be 7.
- **Pro Tip**: Start every puzzle by scanning numbers that appear 5 or more times on the board.

### 2.2 Naked Single (Sole Candidate)
- **The Concept**: Inspect a single cell against its row, column, and 3×3 box.
- **The Logic**: If the cell's row contains [1, 2, 4], its column contains [3, 5, 6], and its 3×3 box contains [7, 8], all 8 numbers {1, 2, 3, 4, 5, 6, 7, 8} are eliminated as possibilities for this cell. The only remaining legal candidate is **9**.
- **Pro Tip**: When any row or column already has 7 or 8 cells completed, use Naked Single analysis to instantly resolve the remaining spot.

### 2.3 Hidden Single
- **The Concept**: A cell may have multiple pencil mark candidates (e.g., {2, 5, 7}), but within its entire row, column, or box, the digit 2 **cannot legally be placed in any other cell**.
- **The Logic**: To satisfy the rule that every unit must contain a 2, that cell must be 2, overriding all other candidate possibilities.
- **Key Distinction**: Naked Single means "this cell can only take this number"; Hidden Single means "this number can only go in this cell."

### 2.4 Locked Candidates (Pointing & Claiming)
The milestone separating casual solvers from intermediate puzzle enthusiasts:
- **Pointing Pairs/Triples**: If candidate 4 in a 3×3 box is confined to a single row, that candidate 4 is guaranteed to be in that row. You can safely eliminate candidate 4 from all other cells in that entire row outside the box!
- **Box-Line Reduction (Claiming)**: Conversely, if all instances of candidate 4 in a row lie inside the same 3×3 box, candidate 4 can be eliminated from all other cells in that box.

---

## Chapter 3: Advanced Set Theory (Pairs, Triples & Subsets)

When singles can no longer advance the board, switch on the in-game "Pencil Notes" feature to uncover set-based exclusions.

### 3.1 Naked Pairs
- **Theorem**: If two cells within the same row, column, or block contain **only the exact same two candidates** (e.g., both cells are {3, 7}).
- **Deduction**: Because 3 and 7 must occupy these two cells in some combination, neither 3 nor 7 can exist anywhere else in that unit.
- **Action**: Safely erase 3 and 7 from all other cells in that peer unit, often triggering immediate Naked Singles.

### 3.2 Naked Triples
- **Theorem**: Three cells in a unit whose candidate sets are restricted to a total of three numbers (e.g., {1, 5}, {5, 9}, and {1, 9}).
- **Deduction**: Those three digits are locked inside those three cells. All other instances of 1, 5, and 9 in that row, column, or box can be stripped away.

### 3.3 Hidden Pairs
- **Theorem**: Two digits (e.g., 4 and 8) appear as candidates in only two cells in a unit, even if those two cells also contain other noisy candidates (e.g., {1, 4, 6, 8} and {3, 4, 8}).
- **Deduction**: Since 4 and 8 must go into those two cells, all other candidates in those two cells are impossible illusions.
- **Action**: Cleanse the noise! Erase {1, 6} and {3}, converting them into a clean Naked Pair {4, 8}.

---

## Chapter 4: Master-Level Theorems for Expert Puzzles

### 4.1 The X-Wing Theorem
The hallmark of advanced Sudoku solving, turning an impasse into an open board:
- **Pattern Structure**:
  - Focus on a single candidate digit (e.g., 6);
  - In Row 2, the digit 6 can only appear in Column 3 and Column 8;
  - In Row 7, the digit 6 can also only appear in Column 3 and Column 8;
  - The four intersection points (R2C3, R2C8, R7C3, R7C8) form the corners of a rectangle resembling an "X".
- **Deductive Proof**:
  - If R2C3 is 6, then R7C8 must be 6;
  - If R2C8 is 6, then R7C3 must be 6;
  - In either scenario, **Column 3 and Column 8 both have their 6 claimed by these two rows**!
- **Conclusion**: You can safely delete candidate 6 from every other cell in Column 3 and Column 8!

### 4.2 Swordfish Theorem (3-Row X-Wing)
- **Concept**: A 3×3 extension of the X-Wing. When a candidate in three different rows is restricted to the same three columns (or subsets thereof), that candidate can be eliminated from all other rows in those three columns.

### 4.3 XY-Wing (Bent Triple Chaining)
- **Structure**: A pivot cell {A, B} connected to two pincer cells {A, C} and {B, C}.
- **Deduction**: Whichever value the pivot takes (A or B), it forces one of the pincers to become C.
- **Conclusion**: Any cell that shares sightlines with BOTH pincer cells can safely eliminate candidate C.

---

## Chapter 5: Real-World Walkthrough Strategy

Follow this systematic 4-phase protocol when solving challenging boards:
1. **Phase 1 (Rapid Cross-Hatching)**: Scan 1-9 to harvest all obvious singles in boxes with 5+ clues.
2. **Phase 2 (Targeted Line Counting)**: Find rows or columns with 2 or 3 empty cells and apply Naked Single logic.
3. **Phase 3 (Comprehensive Candidate Notation)**: For cells with 2 or 3 candidates, systematically pencil them in. Look immediately for Pointing Pairs and Naked Pairs.
4. **Phase 4 (Chain & Pattern Breakthrough)**: If stalled on Expert mode, search for X-Wings or XY-Wings across open columns. Once the blocker candidate is removed, the puzzle usually resolves like falling dominoes.

---

## Chapter 6: Speedrunning & Multiplayer PK Tactics

In Puzzle PK multiplayer duels, strategy and nerve are just as important as logic:

### 6.1 Visual Navigation & Highlighting
- **Highlighting Advantage**: Tap any solved digit to light up all identical numbers across the grid. This highlights the negative space and reveals immediate cross-hatch placements.
- **Two-Handed Desktop Ergonomics**: Rest your left hand on <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys for rapid cursor navigation and your right hand on the numpad, using <kbd>Space</kbd> or <kbd>N</kbd> for notes.

### 6.2 Steal PK (Shared Board) Strategy
- **Never Guess**: Placing an incorrect digit triggers a penalty freeze timer. During your freeze, your opponent can easily claim 2-3 cells and secure the lead!
- **Control Intersection Hubs**: Prioritize claiming cells at box centers or row-column intersections to starve your opponent of visibility.

---

## Chapter 7: Troubleshooting & FAQ

### Q: Why did two identical numbers end up in the same row?
A: Sudoku errors have a zero-tolerance domino effect. A mistake in step 10 will inevitably cause an impossible contradiction at step 35. When a conflict occurs, press <kbd>Z</kbd> or tap Undo to step back to your last verified stable configuration.

### Q: Is every Sudoku guaranteed to have a solution without guessing?
A: Yes! Every Puzzle PK puzzle is mathematically generated with a verified unique solution reachable through pure step-by-step logic.
`;

const esRules = `## Guía Maestra de Sudoku: Estrategias de Principiante a Experto

Bienvenido a la **Guía Completa de Sudoku de Puzzle PK**. Descubre las técnicas lógicas que te permitirán resolver tableros desde nivel Fácil hasta Experto sin tener que adivinar jamás.

### 1. Reglas Fundamentales y Conceptos Clave
El Sudoku clásico se juega en una cuadrícula de 9x9 dividida en 9 cajas de 3x3. El objetivo es colocar los números del **1 al 9** de modo que cada fila, columna y caja contenga los 9 números sin repetición.
- **Sin matemáticas**: Solo importa la deducción lógica de exclusión.
- **Solución única**: Cada tablero de Puzzle PK tiene una única solución alcanzable 100% por lógica.

### 2. Técnicas Básicas e Intermedias
- **Barrido (Cross-Hatching)**: Observa dónde se repite un número y traza líneas imaginarias para encontrar la única casilla libre en una caja 3x3.
- **Único Desnudo (Naked Single)**: Cuando una casilla tiene 8 números diferentes en su fila, columna y caja, el número restante es obligatorio.
- **Único Oculto (Hidden Single)**: Cuando un número solo puede colocarse en una casilla específica de toda una fila o columna.
- **Candidatos Bloqueados**: Cuando un número dentro de una caja se restringe a una sola línea, puedes eliminarlo de las otras cajas en esa misma línea.

### 3. Técnicas Avanzadas: Pares y Conjuntos
- **Pares Desnudos (Naked Pairs)**: Si dos casillas en la misma fila o caja solo pueden ser {3, 7}, ese par bloquea el 3 y el 7 de todas las demás casillas de esa unidad.
- **Pares Ocultos (Hidden Pairs)**: Dos números que solo pueden ubicarse en dos casillas específicas permiten limpiar todos los demás candidatos de esas casillas.

### 4. Teoremas Maestros: X-Wing y XY-Wing
- **El teorema X-Wing**: Cuando un candidato solo aparece en las mismas dos columnas de dos filas distintas, ese número queda descartado de todas las demás filas de esas dos columnas.
- **Técnica XY-Wing**: Una combinación de tres casillas con pares de candidatos que elimina un valor común en las casillas que ambas ven.

### 5. Consejos para el Modo PK Multijugador
- **Atajos de teclado**: Usa <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o flechas para moverte, <kbd>1</kbd>-<kbd>9</kbd> para rellenar, y <kbd>Espacio</kbd> o <kbd>N</kbd> para activar las notas.
- **Modo Robo**: No adivines nunca; un fallo te congelará durante valiosos segundos.
`;

const jaRules = `## 数独マスターガイド：初級から上級テクニック完全解説

**Puzzle PK 数独完全攻略ガイド**へようこそ。直感だけでなく体系的な論理定理を学ぶことで、上級・エキスパート難易度もスムーズに解けるようになります。

### 1. 基本ルールと論理モデル
数独（9x9）は、9つの3x3ブロックに分かれています。すべての行、列、3x3ブロックに **1から9までの数字が1度ずつ** 入ります。
- **計算不要**：純粋な記号排除ロジックです。
- **推測禁止**：Puzzle PKの盤面はすべて唯一解が論理的に導き出せます。推測は崩壊の原因になります。

### 2. 必須の基本テクニック
- **クロストリガー（スキャン法）**：特定の数字に注目し、行と列の視線で対象ブロックの候補を1マスに絞り込みます。
- **ネイキッドシングル（唯余法）**：周囲の行・列・宮に既に8種類の数字がある場合、残る1つの数字が確定します。
- **ヒドゥンシングル（隠れ単数）**：マス自体には複数の候補があっても、その行や列でその数字を置けるのがそのマスだけである場合。
- **ブロック予約（Locked Candidates）**：宮の中で候補数字が同一直線上にある場合、その直線の延長上にある他の宮の候補から除外できます。

### 3. 上級テクニック：ペアとサブセット
- **ネイキッドペア（同盟数対）**：同じ行やブロック内で2つのマスが全く同じ2つの候補（例：{3, 7}）を持つ場合、そのユニットの他のマスから3と7を除外できます。
- **ヒドゥンペア（隠れ数対）**：ある行で2つの数字が特定の2マスにしか出現しない場合、その2マスから余計な候補をすべて消去できます。

### 4. エキスパート定理：X-WingとXY-Wing
- **X-Wing（四角形排除定理）**：2つの行において、ある候補数字が全く同じ2つの列にしか入らない場合、その2つの列の他の行からその数字を完全に消去できます。
- **XY-Wing**：3マスの強弱リンクを利用した候補消去法。

### 5. PK対戦とスピードランのコツ
- **キーボード操作**：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>で移動、<kbd>1</kbd>〜<kbd>9</kbd>で入力、<kbd>Space</kbd>または<kbd>N</kbd>でメモ切替。
- **スティールPK（強奪モード）**：誤答ペナルティ（フリーズ）を避けるため、当てずっぽうは厳禁です。
`;

const koRules = `## 스도쿠 마스터 클래스: 입문부터 최고 난이도까지의 완전 공략

**Puzzle PK 스도쿠 종합 전략 가이드**에 오신 것을 환영합니다. 체계적인 논리 정리를 익히면 전문가 난이도의 퍼즐도 막힘없이 풀어낼 수 있습니다.

### 1. 기본 원리와 수학적 논리
표준 스도쿠는 9x9 격자와 9개의 3x3 박스로 구성됩니다. 모든 행, 열, 3x3 박스에 **1부터 9까지의 숫자가 중복 없이 정확히 한 번씩** 채워져야 합니다.
- **수학 계산 불필요**: 순수한 배타적 논리 배치 게임입니다.
- **추측 금지**: 모든 퍼즐은 100% 논리적인 수순으로 풀리도록 설계되어 있습니다.

### 2. 핵심 기본 및 중급 기술
- **교차 스캐닝 (Cross-Hatching)**: 특정 숫자의 가로세로 영향력을 활용해 3x3 박스 내 유일한 자리를 찾습니다.
- **네이키드 싱글 (Naked Single / 단일 후보)**: 행, 열, 박스에 이미 8개 숫자가 나타난 경우 마지막 남은 숫자가 확정됩니다.
- **히든 싱글 (Hidden Single)**: 해당 셀에 후보 숫자가 여럿 있더라도 해당 행/열에서 그 숫자가 들어갈 수 있는 곳이 오직 그 셀뿐인 경우입니다.
- **락트 캔디데이트 (Locked Candidates)**: 박스 내 후보가 한 줄에 정렬되면 해당 줄의 다른 박스에서 해당 후보를 제거합니다.

### 3. 고급 기술: 페어 및 부분집합
- **네이키드 페어 (Naked Pairs)**: 동일 단위 내 두 셀이 오직 동일한 두 후보 {3, 7}만 가질 때, 해당 단위의 다른 모든 셀에서 3과 7을 지울 수 있습니다.
- **히든 페어 (Hidden Pairs)**: 두 숫자가 단위 내에서 오직 두 셀에만 나타날 때 다른 모든 불필요한 후보를 제거합니다.

### 4. 마스터급 정리: X-Wing 및 체인
- **X-Wing 정리**: 두 행에서 특정 숫자가 오직 동일한 두 열에만 나타날 때, 사각형 네 꼭짓점을 이루어 해당 두 열의 다른 모든 셀에서 그 후보를 삭제합니다.

### 5. 멀티플레이어 PK 대전 팁
- **단축키 활용**: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 또는 방향키로 이동, <kbd>1</kbd>~<kbd>9</kbd> 숫자 입력, <kbd>Space</kbd>나 <kbd>N</kbd>으로 메모 모드 전환.
- **스틸 모드**: 오답 입력 시 일시 동결 패널티가 주어지므로 침착하고 정확하게 풀어야 승리합니다.
`;

const ptRules = `## Guia Mestre de Sudoku: Estratégias do Básico ao Especialista

Bem-vindo ao **Guia Completo de Sudoku do Puzzle PK**. Aprenda as técnicas lógicas avançadas para desvendar qualquer quebra-cabeça sem jamais precisar adivinhar.

### 1. Regras e Modelo Lógico
O Sudoku 9x9 clássico é dividido em nove blocos 3x3. Cada linha, coluna e bloco deve conter os dígitos de **1 a 9 exatamente uma vez**, sem repetições. Não requer contas matemáticas, apenas dedução lógica rigorosa.

### 2. Técnicas Fundamentais
- **Varredura (Cross-Hatching)**: Trace linhas imaginárias a partir de números idênticos para isolar a única posição válida em um bloco 3x3.
- **Único Nu (Naked Single)**: Quando a linha, coluna e bloco de uma célula somam 8 números distintos, o 9º é o valor obrigatório.
- **Único Oculto (Hidden Single)**: Quando um número só pode ser colocado em uma única célula de uma determinada linha ou coluna.
- **Candidatos Bloqueados**: Candidatos alinhados em um bloco eliminam esse número do restante da linha ou coluna externa.

### 3. Técnicas Avançadas
- **Pares Nus (Naked Pairs)**: Duas células na mesma unidade restritas a exatamente dois candidatos bloqueiam esses valores para todas as outras células.
- **Teorema X-Wing**: Padrão retangular formado por um candidato restrito a duas colunas em duas linhas diferentes, permitindo limpar as colunas correspondentes.

### 4. Dicas de Batalha Multijogador (PK)
- Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> para navegar e o teclado numérico para digitação ultra-rápida.
- No Modo Roubo (Steal PK), evite erros a todo custo para não sofrer penalidades de congelamento.
`;

const frRules = `## Guide Complet du Sudoku : Stratégies de Débutant à Expert

Bienvenue dans le **Guide de Maîtrise du Sudoku de Puzzle PK**. Découvrez les principes logiques et les théorèmes avancés pour venir à bout des grilles les plus complexes sans jamais deviner.

### 1. Principes et Modèle Logique
Le Sudoku standard 9x9 est composé de 9 régions 3x3. Chaque ligne, colonne et bloc doit contenir les chiffres de **1 à 9 exactement une fois**. Ce jeu repose sur la déduction pure et ne requiert aucun calcul mathématique.

### 2. Techniques Essentielles
- **Balayage (Cross-Hatching)** : Utilisez les chiffres existants pour projeter des lignes bloquantes et isoler la position d'un chiffre dans un bloc 3x3.
- **Candidat Unique Nu (Naked Single)** : Si une case voit 8 chiffres différents dans sa ligne, colonne et bloc, le 9ème est forcé.
- **Candidat Caché (Hidden Single)** : Lorsqu'un chiffre ne peut aller que dans une seule case au sein d'une unité.
- **Candidats Verrouillés (Locked Candidates)** : Restreindre un candidat dans un bloc permet de l'éliminer sur le reste de la ligne ou colonne.

### 3. Techniques Avancées : Paires & X-Wing
- **Paires Nues (Naked Pairs)** : Deux cases contenant uniquement la même paire de candidats verrouillent ces chiffres pour toute l'unité.
- **Théorème X-Wing** : Un rectangle formé par un même candidat limité à deux colonnes sur deux lignes distinctes permet de purger ces deux colonnes.

### 4. Commandes et Compétition PK
- Utilisez <kbd>Z</kbd> pour annuler, <kbd>Espace</kbd> ou <kbd>N</kbd> pour le mode crayon, et les touches <kbd>1</kbd> à <kbd>9</kbd> pour remplir rapidement les cases.
`;

const deRules = `## Meister-Leitfaden für Sudoku: Vom Anfänger zum Experten

Willkommen zum **umfassenden Sudoku-Guide von Puzzle PK**. Meistern Sie logische Theoreme und Lösetechniken, um selbst schwierigste Experten-Rätsel souverän und ohne Raten zu lösen.

### 1. Grundregeln & Logisches Fundament
Sudoku wird auf einem 9x9-Gitter mit 9 Blöcken (3x3) gespielt. Jede Zeile, jede Spalte und jeder 3x3-Block muss die Ziffern **1 bis 9 genau einmal** enthalten. Es erfordert keinerlei Rechnen, sondern reine Ausschlusslogik.

### 2. Grundlegende & Mittlere Techniken
- **Scannen (Cross-Hatching)**: Linien über das Raster ziehen, um verbleibende Positionen in einem Block zu identifizieren.
- **Nackter Einer (Naked Single)**: Wenn 8 verschiedene Zahlen eine Zelle umgeben, bleibt nur die 9. Zahl als eindeutige Lösung.
- **Versteckter Einer (Hidden Single)**: Wenn eine Zahl in einer Zeile oder Spalte nur noch in ein einziges Feld passt.
- **Blockierte Kandidaten**: Kandidaten, die in einem Block auf eine Linie beschränkt sind, eliminieren diese Zahl auf der restlichen Linie.

### 3. Fortgeschrittene Theoreme (Paare & X-Wing)
- **Nackte Paare (Naked Pairs)**: Zwei Zellen mit exakt denselben zwei Kandidaten sperren diese Zahlen für alle anderen Felder der Einheit.
- **X-Wing-Theorem**: Ein rechteckiges Muster eines Kandidaten über zwei Zeilen und Spalten eliminiert diese Zahl in den gesamten beiden Spalten.

### 4. Steuerung & Multiplayer-PK-Tipps
- Schnelle Tastaturnavigation mit <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Zahlenfeld <kbd>1</kbd>-<kbd>9</kbd> und Notizmodus mit <kbd>Leertaste</kbd> oder <kbd>N</kbd>.
- Im Steal-Modus keine Zufallstipps abgeben, um Zeitstrafen zu vermeiden.
`;

const updatedRules = {
  zh: zhRules,
  en: enRules,
  es: esRules,
  ja: jaRules,
  ko: koRules,
  pt: ptRules,
  fr: frRules,
  de: deRules
};

sudoku.rules = JSON.stringify(updatedRules);

fs.writeFileSync(FILE_PATH, JSON.stringify(docs, null, 2), 'utf-8');
console.log('Successfully updated sudoku rules in games-docs.json!');
