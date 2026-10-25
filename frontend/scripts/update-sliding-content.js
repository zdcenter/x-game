const fs = require('fs');
const path = require('path');

// 1. Define game.sliding.seo_desc for all 8 languages
const seoDescMap = {
  zh: `<h2>数字华容道核心规则与通关目标</h2><p>数字华容道（又称 15 拼图、滑动拼图，Sliding Puzzle）是一款传承百年的经典空间逻辑解谜游戏。标准棋盘由紧密相邻的数字方块与一个唯一的<strong>空白格（Empty Slot）</strong>构成。游戏极其考验玩家的<strong>空间推演、分治逻辑与盲打手速</strong>。您的终极目标是通过不断滑动方块，将全盘打乱的数字<strong>从左至右、从上到下按升序重新排列</strong>，最终将空白格归位于右下角：</p><ul><li><strong>4×4 网格（经典 15 拼图）</strong>：包含 1 到 15 号数字方块与 1 个空白格，是国际竞速比赛的标准规格。</li><li><strong>5×5 网格（24 拼图）</strong>：包含 1 到 24 号数字方块，专为追求更深空间规划的高手设计。</li><li><strong>6×6 网格（35 拼图）</strong>：包含 1 到 35 号数字方块，考验宏观大局观与超长路径规划的专家级挑战。</li></ul><h2>全平台快捷键与操作指南</h2><p>为了让您在桌面键盘和触屏设备上都能享受零延迟的速解快感，Puzzle PK 提供全端键鼠与触屏适配：</p><table><thead><tr><th>操作方式</th><th>快捷键 / 手势</th><th>功能说明</th></tr></thead><tbody><tr><td><strong>向上滑入</strong></td><td><kbd>W</kbd> 或 <kbd>↑</kbd> 方向键</td><td>将空白格<strong>正下方</strong>的数字方块向上推入空白格</td></tr><tr><td><strong>向下滑入</strong></td><td><kbd>S</kbd> 或 <kbd>↓</kbd> 方向键</td><td>将空白格<strong>正上方</strong>的数字方块向下推入空白格</td></tr><tr><td><strong>向左滑入</strong></td><td><kbd>A</kbd> 或 <kbd>←</kbd> 方向键</td><td>将空白格<strong>正右方</strong>的数字方块向左推入空白格</td></tr><tr><td><strong>向右滑入</strong></td><td><kbd>D</kbd> 或 <kbd>→</kbd> 方向键</td><td>将空白格<strong>正左方</strong>的数字方块向右推入空白格</td></tr><tr><td><strong>鼠标 / 触控点击</strong></td><td>直接点击或轻触相邻方块</td><td>点击任意与空白格相连的方块，方块将平滑位移滑入空格</td></tr><tr><td><strong>屏幕滑动手势</strong></td><td>在屏幕棋盘上任意方向滑动</td><td>支持单指滑动手势，方向直觉，完美适配移动端与平板</td></tr><tr><td><strong>快速重置</strong></td><td>键盘 <kbd>R</kbd> 键</td><td>单机练习模式下立即重开本局，一键重置洗牌残局</td></tr></tbody></table><h2>分治速解策略：层先法核心思维</h2><ul><li><strong>分层递推（Layer-by-Layer）</strong>：切勿全盘散乱移动！标准策略是优先拼好最顶端的第一行（如 4×4 中的 1, 2, 3, 4），完成后永远将其“锁定”，绝不再破坏。随后依次向下递推。</li><li><strong>尾部嵌合技巧（Corner Pair Insertion）</strong>：处理每行最后两个数字（如 15 拼图第一行的 3 和 4）时，常见误区是先推 3 再挤 4 导致卡死。高阶解法是将 3 置于角落下方、4 置于其旁，通过转角两步联动将其成对顺滑推入！</li><li><strong>100% 绝对可解性保障</strong>：根据数学奇偶性定理，纯随机排列有 50% 的概率属于无解死局。Puzzle PK 采用合规随机游走乱序算法，<strong>保证所生成的每一局棋盘都绝对可完全复原</strong>。</li></ul><h2>多人实时对战（Speed PK）模式</h2><p>单机复原不够尽兴？在多人竞技大厅中，您可以与好友或全球对手展开手速与心算的极限对决：</p><ul><li><strong>同构绝对公平对战</strong>：对局开始时，房间内所有对手获得<strong>完全相同的打乱种子棋盘</strong>。</li><li><strong>毫秒级进度同步</strong>：顶部 PK 仪表盘实时展示对手的剩余复原步数与完成百分比，心理战与手速博弈并存。</li><li><strong>抢先完成即获胜</strong>：首位将棋盘全部归位完成的玩家荣获胜利，支持 Best-of-N 系列多局积分制。</li></ul><h2>常见问题解答 (FAQ)</h2><h3>为什么有时觉得最后两个数字对调不过来？</h3><p>在解最后两行（如 13 和 14）时，如果只盯着单一行看，极易陷入局部死循环。最后两行必须作为一个整体，利用倒数两行形成的环形跑道做 3-置换轮转。如需掌握完整的数学定理与进阶步法，请参阅下方的深度权威教程。</p><h3>如何提升解题速度进入 15 秒高手俱乐部？</h3><p>速解的关键在于“视线追踪空白格”而非盯着数字跑。高手的视线始终比手快两步，预判空格的行进轨迹，配合连推多块方块的指法，将多余的空转步数降到最低。</p>`,

  en: `<h2>Objective & Core Rules of Sliding Puzzle</h2><p>Sliding Puzzle (commonly known as the 15-Puzzle or Number Slide) is a century-old classic logic game designed to challenge spatial intuition and rapid decision-making. The board consists of numbered square tiles alongside a single <strong>Empty Slot</strong>. Your objective is to shift the tiles inside the confined frame until all numbers are rearranged <strong>in sequential order from left to right, top to bottom</strong>, ending with the empty slot anchored at the bottom-right corner:</p><ul><li><strong>4×4 Grid (Classic 15-Puzzle)</strong>: Features tiles 1 through 15 and 1 empty space. The quintessential competitive standard.</li><li><strong>5×5 Grid (24-Puzzle)</strong>: Contains tiles 1 to 24, requiring extended tactical foresight and multi-layer reduction.</li><li><strong>6×6 Grid (35-Puzzle)</strong>: An expert-tier layout demanding macro path planning and sustained visual endurance.</li></ul><h2>Complete Controls & Keyboard Shortcuts Guide</h2><p>Whether playing on a desktop keyboard, mouse, or touch device, Puzzle PK delivers ultra-responsive inputs and zero-latency tile movement:</p><table><thead><tr><th>Action</th><th>Key / Gesture</th><th>Description</th></tr></thead><tbody><tr><td><strong>Slide Up</strong></td><td><kbd>W</kbd> or <kbd>↑</kbd> Arrow</td><td>Slide the tile directly <strong>below</strong> the empty slot upward into it</td></tr><tr><td><strong>Slide Down</strong></td><td><kbd>S</kbd> or <kbd>↓</kbd> Arrow</td><td>Slide the tile directly <strong>above</strong> the empty slot downward into it</td></tr><tr><td><strong>Slide Left</strong></td><td><kbd>A</kbd> or <kbd>←</kbd> Arrow</td><td>Slide the tile directly to the <strong>right</strong> of the empty slot leftward into it</td></tr><tr><td><strong>Slide Right</strong></td><td><kbd>D</kbd> or <kbd>→</kbd> Arrow</td><td>Slide the tile directly to the <strong>left</strong> of the empty slot rightward into it</td></tr><tr><td><strong>Mouse / Touch Tap</strong></td><td>Click or tap adjacent tile</td><td>Smoothly moves any tile directly neighboring the empty space into the slot</td></tr><tr><td><strong>Touch Swipe</strong></td><td>Swipe on the game board</td><td>Intuitive directional swipe gesture natively tuned for mobile and tablet screens</td></tr><tr><td><strong>Quick Restart</strong></td><td>Keyboard <kbd>R</kbd> Key</td><td>Instantly re-shuffles and restarts the current board in single-player mode</td></tr></tbody></table><h2>Layer-by-Layer Strategy & Master Tips</h2><ul><li><strong>Layer-by-Layer Reduction</strong>: Never shuffle randomly! The gold standard strategy solves the top row first (e.g., 1, 2, 3, 4 in 4×4). Once secured, never disrupt it again, progressively shrinking the puzzle downward.</li><li><strong>Corner Pair Insertion Technique</strong>: When positioning the last two tiles of a row (such as 3 and 4), attempting to place 3 and then brute-forcing 4 will get stuck. Instead, position 3 one cell below the corner, place 4 next to it, and swing the two-tile unit into the top row together!</li><li><strong>100% Solvability Guarantee</strong>: Due to permutation parity theorems, exactly 50% of random permutations are mathematically unsolvable. Puzzle PK employs legal random walk shuffling to guarantee every generated board is 100% solvable.</li></ul><h2>Multiplayer Real-Time Speed PK Battles</h2><p>Ready to test your fingers and reflexes against real opponents? Jump into the online multiplayer arena:</p><ul><li><strong>Identical Seed Board</strong>: All players in the match start with the exact same scramble state for 100% competitive fairness.</li><li><strong>Live Millisecond Progress Bar</strong>: The top HUD displays your rival's remaining tiles and solve percentage in real time.</li><li><strong>First to Solve Wins</strong>: The player who reconstructs the full numerical sequence first claims the victory trophy. Supports multi-round Best-of-N match play!</li></ul><h2>Frequently Asked Questions (FAQ)</h2><h3>Why do the last two tiles appear swapped and impossible to solve?</h3><p>In the final two rows, players often attempt to solve row-by-row and hit a cycle roadblock. The last two rows must be tackled as a single unified zone using a 3-cycle rotation around the empty slot. To learn the full mathematical algorithm and advanced maneuvers, explore our deep strategy guide linked below.</p><h3>How can I break the sub-20-second speed barrier?</h3><p>High-level speedcubers and sliding masters track the <em>empty slot</em> rather than individual numbered tiles. By looking two moves ahead and keeping your finger fluidly driving the empty pocket along smooth orbital paths, you eliminate redundant moves and maximize effective Actions Per Minute (APM).</p>`,

  es: `<h2>Objetivo y Reglas Básicas del Rompecabezas Deslizante</h2><p>El Rompecabezas Deslizante (conocido internacionalmente como el Juego del 15 o Sliding Puzzle) es un clásico desafío de lógica espacial y agilidad mental. El tablero consta de casillas numeradas y un único <strong>espacio vacío</strong>. Su objetivo es deslizar las fichas dentro del marco hasta ordenarlas <strong>secuencialmente de izquierda a derecha y de arriba hacia abajo</strong>, dejando el espacio vacío en la esquina inferior derecha.</p><h2>Guía Completa de Controles y Atajos de Teclado</h2><table><thead><tr><th>Acción</th><th>Tecla / Gesto</th><th>Descripción</th></tr></thead><tbody><tr><td><strong>Deslizar Arriba</strong></td><td><kbd>W</kbd> o Flecha <kbd>↑</kbd></td><td>Desplaza la ficha situada debajo del hueco hacia arriba</td></tr><tr><td><strong>Deslizar Abajo</strong></td><td><kbd>S</kbd> o Flecha <kbd>↓</kbd></td><td>Desplaza la ficha situada encima del hueco hacia abajo</td></tr><tr><td><strong>Deslizar Izquierda</strong></td><td><kbd>A</kbd> o Flecha <kbd>←</kbd></td><td>Desplaza la ficha situada a la derecha del hueco hacia la izquierda</td></tr><tr><td><strong>Deslizar Derecha</strong></td><td><kbd>D</kbd> o Flecha <kbd>→</kbd></td><td>Desplaza la ficha situada a la izquierda del hueco hacia la derecha</td></tr><tr><td><strong>Clic / Toque</strong></td><td>Clic o toque en ficha contigua</td><td>Mueve suavemente la ficha adyacente directamente al espacio vacío</td></tr><tr><td><strong>Deslizamiento Táctil</strong></td><td>Deslizar el dedo en pantalla</td><td>Gesto natural y fluido diseñado para móviles y tabletas</td></tr><tr><td><strong>Reinicio Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Reinicia y mezcla instantáneamente el tablero en modo individual</td></tr></tbody></table><h2>Estrategia Clave: Método por Capas (Layer-by-Layer)</h2><ul><li><strong>Resolución por Filas</strong>: Nunca mueva piezas al azar. Resuelva la primera fila completa (1, 2, 3, 4 en 4×4). Una vez colocada, no la vuelva a romper.</li><li><strong>Inserción en Esquinas</strong>: Para colocar los dos últimos números de una fila, colóquelos en tándem y rótelos en bloque hacia su posición final.</li><li><strong>100% de Tableros Resolubles</strong>: Debido al teorema matemático de paridad, el 50% de las mezclas aleatorias son imposibles. Puzzle PK garantiza que cada partida generada es 100% resoluble mediante mezclas legítimas.</li></ul>`,

  ja: `<h2>スライドパズル（15パズル）のルールとクリア目標</h2><p>スライドパズル（15パズル / 数字華容道）は、100年以上の歴史を持つ空間論理パズルの名作です。数字が書かれたパネルと1つの<strong>空白マス（空きスロット）</strong>で構成され、パネルをスライドさせて<strong>左上から右下へ昇順（1, 2, 3...）に並べ替える</strong>ことが最終目標です。</p><h2>全プラットフォーム操作ガイド＆キーボードショートカット</h2><table><thead><tr><th>操作</th><th>キー / 操作方法</th><th>機能説明</th></tr></thead><tbody><tr><td><strong>上へスライド</strong></td><td><kbd>W</kbd> または <kbd>↑</kbd> キー</td><td>空きマスの直下にある数字を上へ移動</td></tr><tr><td><strong>下へスライド</strong></td><td><kbd>S</kbd> または <kbd>↓</kbd> キー</td><td>空きマスの直上にある数字を下へ移動</td></tr><tr><td><strong>左へスライド</strong></td><td><kbd>A</kbd> または <kbd>←</kbd> キー</td><td>空きマスの右隣にある数字を左へ移動</td></tr><tr><td><strong>右へスライド</strong></td><td><kbd>D</kbd> または <kbd>→</kbd> キー</td><td>空きマスの左隣にある数字を右へ移動</td></tr><tr><td><strong>クリック / タップ</strong></td><td>隣接するパネルをタップ</td><td>空きマスに隣接するパネルを瞬時にスライド</td></tr><tr><td><strong>スワイプ操作</strong></td><td>画面上をスワイプ</td><td>スマートフォン・タブレットに最適化された直感操作</td></tr><tr><td><strong>クイックリスタート</strong></td><td><kbd>R</kbd> キー</td><td>ソロモードで盤面を即座に再シャッフル</td></tr></tbody></table><h2>攻略の極意：層別解法（Layer-by-Layer）</h2><ul><li><strong>上段から順に固定</strong>：まずは1行目（1〜4）を完成させ、一度揃えたら二度と崩さないのが鉄則です。</li><li><strong>端の2枚のペア入れ</strong>：行の最後の2つの数字は、コーナーで2枚1組のユニットを作り、回転させて同時に流し込みます。</li><li><strong>100% 解答可能保証</strong>：数学的な置換群の偶奇性定理により、完全ランダムな配置の50%は解けません。Puzzle PKは合法的な移動シミュレーションで盤面を生成するため、全てのゲームが100%解けます。</li></ul>`,

  ko: `<h2>숫자 슬라이딩 퍼즐 (15 퍼즐) 규칙과 목표</h2><p>슬라이딩 퍼즐(15 퍼즐)은 백 년 넘게 사랑받아 온 클래식 공간 논리 게임입니다. 숫자 블록과 하나의 <strong>빈칸(Empty Slot)</strong>으로 이루어져 있으며, 블록을 밀어내어 <strong>왼쪽 위부터 오른쪽 아래까지 1부터 순서대로 정렬</strong>하는 것이 목표입니다.</p><h2>전체 조작법 및 단축키 안내</h2><table><thead><tr><th>조작</th><th>단축키 / 제스처</th><th>기능 설명</th></tr></thead><tbody><tr><td><strong>위로 밀기</strong></td><td><kbd>W</kbd> 또는 <kbd>↑</kbd> 방향키</td><td>빈칸 바로 아래의 블록을 빈칸으로 이동</td></tr><tr><td><strong>아래로 밀기</strong></td><td><kbd>S</kbd> 또는 <kbd>↓</kbd> 방향키</td><td>빈칸 바로 위의 블록을 빈칸으로 이동</td></tr><tr><td><strong>왼쪽으로 밀기</strong></td><td><kbd>A</kbd> 또는 <kbd>←</kbd> 방향키</td><td>빈칸 오른쪽의 블록을 빈칸으로 이동</td></tr><tr><td><strong>오른쪽으로 밀기</strong></td><td><kbd>D</kbd> 또는 <kbd>→</kbd> 방향키</td><td>빈칸 왼쪽의 블록을 빈칸으로 이동</td></tr><tr><td><strong>마우스 / 터치</strong></td><td>인접한 타일 터치/클릭</td><td>빈칸과 맞닿은 타일을 부드럽게 밀어 넣음</td></tr><tr><td><strong>스와이프 제스처</strong></td><td>보드 위에서 화면 스와이프</td><td>모바일과 태블릿에 맞춘 부드러운 손가락 제스처</td></tr><tr><td><strong>빠른 재시작</strong></td><td>키보드 <kbd>R</kbd> 키</td><td>싱글 플레이 연습 시 즉시 퍼즐 재배열</td></tr></tbody></table><h2>단계별 공략 (Layer-by-Layer)</h2><ul><li><strong>첫 번째 행 고정</strong>: 위쪽 첫 번째 행(1, 2, 3, 4)부터 맞추고 다시는 건드리지 않는 방식으로 영역을 축소합니다.</li><li><strong>코너 페어 결합</strong>: 행의 마지막 두 숫자는 한 쌍으로 묶어 회전시키며 코너에 맞물려 넣습니다.</li><li><strong>100% 풀이 보장</strong>: 수학적 우함수 패리티 정리에 의해 무작위 셔플의 50%는 해답이 존재하지 않습니다. Puzzle PK는 규칙을 준수한 이동 셔플 알고리즘으로 모든 판이 100% 해결 가능합니다.</li></ul>`,

  pt: `<h2>Objetivo e Regras Básicas do Quebra-Cabeça Deslizante</h2><p>O Quebra-Cabeça Deslizante (Sliding Puzzle / Jogo do 15) é um desafio secular de lógica espacial. O tabuleiro é composto por blocos numerados e um único <strong>espaço vazio</strong>. Seu objetivo é deslizar as peças até organizá-las <strong>em ordem numérica crescente da esquerda para a direita e de cima para baixo</strong>, finalizando com o espaço vazio no canto inferior direito.</p><h2>Guia de Controles e Atalhos de Teclado</h2><table><thead><tr><th>Ação</th><th>Tecla / Gesto</th><th>Descrição</th></tr></thead><tbody><tr><td><strong>Deslizar para Cima</strong></td><td><kbd>W</kbd> ou Seta <kbd>↑</kbd></td><td>Move a peça abaixo do espaço vazio para cima</td></tr><tr><td><strong>Deslizar para Baixo</strong></td><td><kbd>S</kbd> ou Seta <kbd>↓</kbd></td><td>Move a peça acima do espaço vazio para baixo</td></tr><tr><td><strong>Deslizar para a Esquerda</strong></td><td><kbd>A</kbd> ou Seta <kbd>←</kbd></td><td>Move a peça à direita do espaço vazio para a esquerda</td></tr><tr><td><strong>Deslizar para a Direita</strong></td><td><kbd>D</kbd> ou Seta <kbd>→</kbd></td><td>Move a peça à esquerda do espaço vazio para a direita</td></tr><tr><td><strong>Clique / Toque</strong></td><td>Clique ou toque na peça adjacente</td><td>Desliza suavemente a peça adjacente para o espaço vazio</td></tr><tr><td><strong>Arrasto no Touch</strong></td><td>Deslizar o dedo na tela</td><td>Movimento tátil otimizado para celulares e tablets</td></tr><tr><td><strong>Reinício Rápido</strong></td><td>Tecla <kbd>R</kbd></td><td>Reinicia e reembaralha instantaneamente o tabuleiro solo</td></tr></tbody></table>`,

  fr: `<h2>Objectif et Règles du Jeu de Taquin (Sliding Puzzle)</h2><p>Le Jeu de Taquin (Sliding Puzzle / 15-Puzzle) est un casse-tête classique de logique spatiale. Le plateau est composé de tuiles numérotées et d'une <strong>case vide</strong> unique. Votre objectif est de faire glisser les tuiles dans le cadre pour les disposer <strong>dans l'ordre croissant de gauche à droite et de haut en bas</strong>, en terminant par la case vide dans le coin inférieur droit.</p><h2>Guide des Raccourcis Clavier et Contrôles</h2><table><thead><tr><th>Action</th><th>Touche / Geste</th><th>Description</th></tr></thead><tbody><tr><td><strong>Glisser vers le Haut</strong></td><td><kbd>W</kbd> ou Flèche <kbd>↑</kbd></td><td>Fait glisser la tuile située sous la case vide vers le haut</td></tr><tr><td><strong>Glisser vers le Bas</strong></td><td><kbd>S</kbd> ou Flèche <kbd>↓</kbd></td><td>Fait glisser la tuile située au-dessus de la case vide vers le bas</td></tr><tr><td><strong>Glisser vers la Gauche</strong></td><td><kbd>A</kbd> ou Flèche <kbd>←</kbd></td><td>Fait glisser la tuile à droite de la case vide vers la gauche</td></tr><tr><td><strong>Glisser vers la Droite</strong></td><td><kbd>D</kbd> ou Flèche <kbd>→</kbd></td><td>Fait glisser la tuile à gauche de la case vide vers la droite</td></tr><tr><td><strong>Clic / Toucher</strong></td><td>Cliquer ou toucher la tuile adjacente</td><td>Déplace directement la tuile adjacente dans la case vide</td></tr><tr><td><strong>Glissement Tactile</strong></td><td>Glisser le doigt sur l'écran</td><td>Contrôle gestuel fluide et naturel pour mobiles et tablettes</td></tr><tr><td><strong>Recommencer</strong></td><td>Touche <kbd>R</kbd></td><td>Mélange et redémarre instantanément le plateau en mode solo</td></tr></tbody></table>`,

  de: `<h2>Ziel und Grundregeln des Schiebepuzzles (15-Puzzle)</h2><p>Das Schiebepuzzle (auch bekannt als 15-Puzzle oder Sliding Puzzle) ist ein weltberühmter Klassiker für räumliches Denken. Das Spielbrett besteht aus nummerierten Kacheln und einem einzelnen <strong>Leerfeld</strong>. Das Ziel besteht darin, die Kacheln so zu verschieben, dass alle Zahlen <strong>von links nach rechts und von oben nach unten aufsteigend sortiert</strong> werden, wobei das Leerfeld unten rechts verbleibt.</p><h2>Steuerung & Tastenkombinationen-Leitfaden</h2><table><thead><tr><th>Aktion</th><th>Taste / Geste</th><th>Beschreibung</th></tr></thead><tbody><tr><td><strong>Nach Oben schieben</strong></td><td><kbd>W</kbd> oder Pfeil <kbd>↑</kbd></td><td>Schiebt die Kachel unter dem Leerfeld nach oben hinein</td></tr><tr><td><strong>Nach Unten schieben</strong></td><td><kbd>S</kbd> oder Pfeil <kbd>↓</kbd></td><td>Schiebt die Kachel über dem Leerfeld nach unten hinein</td></tr><tr><td><strong>Nach Links schieben</strong></td><td><kbd>A</kbd> oder Pfeil <kbd>←</kbd></td><td>Schiebt die Kachel rechts vom Leerfeld nach links hinein</td></tr><tr><td><strong>Nach Rechts schieben</strong></td><td><kbd>D</kbd> oder Pfeil <kbd>→</kbd></td><td>Schiebt die Kachel links vom Leerfeld nach rechts hinein</td></tr><tr><td><strong>Mausklick / Tippen</strong></td><td>Kachel antippen/anklicken</td><td>Verschiebt die angrenzende Kachel direkt in das Leerfeld</td></tr><tr><td><strong>Wischgeste</strong></td><td>Auf dem Bildschirm wischen</td><td>Intuitive Touch-Steuerung für Smartphones und Tablets</td></tr><tr><td><strong>Schnell-Neustart</strong></td><td>Taste <kbd>R</kbd></td><td>Mischung im Einzelspieler-Modus sofort neu starten</td></tr></tbody></table>`
};

// 2. Define deep 7-chapter guides for games-docs.json for all 8 languages
const slidingDocsRules = {
  zh: `# 数字华容道 (Sliding Puzzle / 15-Puzzle) 终极通关宝典与数学速解全书

欢迎来到 Puzzle PK 官方深度解谜与数学通关指南。数字华容道（又称 15 拼图、滑动拼图）不仅是一项风靡全球的益智竞速项目，更是离散数学与置换群论（Permutation Groups）在棋盘博弈上的经典体现。本教程将从底层的数学可解性定理出发，深入剖析层先法（Layer-by-Layer）、倒数两行循环置换、转角嵌合技巧，以及多人实时竞速（Speed PK）下的顶尖操作流派。

---

## 第一章：历史渊源与置换群数学原理（1879年奇偶性定理）

### 1.1 历史背景与 Sam Loyd 的悬赏骗局
数字华容道最早由诺伊斯·帕尔默·查普曼（Noyes Palmer Chapman）于 1874 年发明。19 世纪末，著名谜题家萨姆·洛伊德（Sam Loyd）曾悬赏 1000 美金征求将“14 与 15 两个相邻方块对调”的复原方法。无数人废寝忘食尝试却无人得奖——因为在严格的数学证明面前，该状态是**绝对不可解的死局**。

### 1.2 逆序数（Inversion Number）的严格定义
将网格上的数字按从左到右、从上到下的顺序读取为一个序列（忽略空白格），设序列长度为 $M = N^2 - 1$。
定义排列的逆序数 $\\text{Inv}(A)$ 为：
$$\\text{Inv}(A) = \\sum_{1 \\le i < j \\le M} \\mathbb{I}(A_i > A_j)$$
即每一个排在较小数前面的较大数对的总数。例如在标准复原状态 $[1, 2, 3, \\dots, 15]$ 中，没有任何逆序对，$\\text{Inv} = 0$。

### 1.3 约翰逊与斯托里（Johnson & Story）奇偶不变性定理
1879 年，数学家 William Woolsey Johnson 与 William E. Story 证明了滑动拼图的奇偶不变量：
1. **水平滑动**：当空白格向左或向右滑动时，数字序列的相对先后顺序完全不变，逆序数 $\\Delta \\text{Inv} = 0$。
2. **垂直滑动**：当空白格向上或向下滑动时，相当于该数字跨越了其间相隔的 $N - 1$ 个元素。
   - **对于奇数阶网格（如 3×3、5×5）**：$N - 1$ 为偶数，跨越偶数个元素引起的逆序数变化 $\\Delta \\text{Inv}$ 必为偶数。因此，**逆序数的奇偶性永远保持不变**！
     - 判定法则：当前残局可解 $\\iff \\text{Inv}(A) \\equiv 0 \\pmod 2$。
   - **对于偶数阶网格（如 4×4、6×6）**：$N - 1$ 为奇数，垂直移动一次会改变逆序数的奇偶性。设空白格当前所在行距底部的行数编号为 $R_{\\text{blank}}$（底行为 1，倒数第二行为 2...）：
     - 判定法则：当前残局可解 $\\iff \\text{Inv}(A) + R_{\\text{blank}} \\equiv 0 \\pmod 2$（以复原目标右下角为基准）。
3. **推论**：任意随机交换两块相邻数字方块，逆序数改变 $\\pm 1$，而空白格位置不变，这必然导致状态奇偶性颠倒。因此，**纯随机打乱的残局有恰好 50% 的概率属于无解死局**！
> **Puzzle PK 品质承诺**：本站所有单机与对战棋盘均通过“合法移动轨迹反向洗牌（Random Walk）”生成，**保证 100% 绝对可完全复原**，杜绝任何死局困扰。

---

## 第二章：标准层先法（Layer-by-Layer Strategy）系统化复原体系

### 2.1 降维分治的核心思想
很多初学者面对 4×4 甚至 6×6 的大盘面时，习惯“看见哪个数字离家近就移哪个”，导致已归位的数字被不断打散。高手的唯一正统解法是**层先法**：
1. 先复原第 1 行；
2. 再复原第 1 列（将 4×4 转化为 3×3）；
3. 接着复原第 2 行、第 2 列（将 3×3 转化为 2×2）；
4. 最终收敛并解开右下角的局部循环。
**黄金铁律：已经锁定的行和列，后续步骤绝不再将其破坏！**

### 2.2 第一行基础复原步骤（以 4×4 为例）
目标：将第一行复原为 $[1, 2, 3, 4]$。
- **前 $N-2$ 个方块（1 和 2）**：由于下方空间极为充裕，只需将数字 1 和 2 直接单向推入目标位置即可。
- **难点爆发**：当数字 1 和 2 就位后，若直接将 3 移入第 3 格，此时数字 4 将无法进入第 4 格（右上角），若强行把 4 推上去就会挤掉 3！

### 2.3 核心杀招：尾部“L型嵌合推入法”（Corner Pair Insertion）
解决每行最后两个数字（如 3 和 4）的标准解法，是将它们结成**串联滑块组**：
1. **就位姿态构建**：
   - 将数字 **3** 移至其目标格的正下方（即第 2 行第 3 列，坐标 $(2, 3)$）。
   - 将数字 **4** 移至数字 3 的正下方或右下方（坐标 $(2, 4)$ 或 $(3, 3)$）。
2. **环形转角推入序列**：
   - 调动空白格移动至右上角目标格 $(1, 4)$。
   - 将数字 3 向上推入 $(1, 3)$。
   - 空白格顺时针或逆时针旋转一圈，带动数字 4 紧跟在数字 3 后面滑入 $(1, 4)$！
3. **完成锁定**：此时第 1 行 $[1, 2, 3, 4]$ 全部就位，第一层彻底固化。

---

## 第三章：左侧垂直列归位与边界收敛

### 3.1 第一列归位流程
第一行固化后，棋盘有效活动区域缩减为 $3 \\times 4$。接下来处理第一列的剩余数字（5, 9, 13）：
- 将数字 **5** 直接推入坐标 $(2, 1)$。
- 面对最后两个数字 **9** 和 **13**，直接推 9 会卡死 13，因此必须再次套用“L型嵌合推入法”的垂直镜像版：
  - 将数字 **9** 放置在 $(4, 2)$（左下角的右侧相邻格）；
  - 将数字 **13** 放置在数字 9 的右侧或上方；
  - 调动空白格进入左下角 $(4, 1)$，将 9 顺滑推入左侧，随后 13 顺位跟进进入 $(3, 1)$！
- 旋转调整后，第一列顺利锁定为 $[1, 5, 9, 13]$。

### 3.2 棋盘降阶收敛图示
通过第 1 行与第 1 列的复原，整个 4×4 棋盘已被完美转化为右下角的一个 **3×3 独立子问题**。依此类推，复原第二行（6, 7, 8）与第二列（10, 14），棋盘将再次缩减为仅剩 2×2（或 2×3）的终盘区域。

---

## 第四章：终局死锁破除：最后两行（Last Two Rows）循环置换

### 4.1 为什么最后两行无法单行复原？
当棋盘只剩下最后两行（例如 2×3 或 2×2 区域）时，由于纵向高度仅剩 2 格，不再具备腾挪中转的“多余行”。此时如果试图单独复原一行，必然陷入无限死循环。必须将最后两行作为一个**闭合环形跑道**统一调度。

### 4.2 环形传送带机制与 3-置换（3-Cycle）
在群论中，滑动拼图的所有偶数置换都可以由多个长度为 3 的轮换（3-cycle）复合而成。
在右下角 2×3 的 6 个格子中：
- 空白格沿六边形跑道循环游走时，跑道上的方块会像传送带一样按固定方向依次向前移动。
- 当两枚目标方块在跑道上汇合为正确的相对顺序时，只需整体将它们“转”到目标区域即可一次性解开。

### 4.3 终极疑点：遇到“最后两个数字反了”该怎么办？
很多玩家经常惊呼：“我前面全拼对了，最后只剩下 14 和 15 是反的，是不是出 bug 了？”
- **误区真相**：正如第一章数学定理所证明的，本系统生成的棋盘 100% 可解，绝不可能产生单一数对对调的无解状态。
- **病因分析**：发生该现象的原因是**倒数第二行与倒数第一行的匹配相位错位**，例如数字 13、14、15 构成的局部循环并未处于正确的同余轨道上。
- **破解解法**：
  1. 切勿强行在这两个格子里反复横跳！
  2. 将空白格移至倒数第二行，向左回退 3 到 4 步，打乱最后两行的前一组数字（如 10、11 或 13）；
  3. 利用 2×3 的大环形重新调整进位先后顺序，两枚方块即可自然顺位复原！

---

## 第五章：大网格（5×5、6×6、10×10）的高效扩展与速解指法

### 5.1 数学归纳法与大网格普适性
层先法的最强大之处在于**维度无关性**。无论棋盘是 5×5（24 拼图）、6×6（35 拼图）还是 10×10：
$$\\text{Total Problem}(N \\times N) \\xrightarrow{\\text{Row 1 + Col 1}} \\text{Sub-Problem}((N-1) \\times (N-1))$$
只需机械化执行该递推算法，即可将任意高维棋盘在有限步内完全复原。

### 5.2 职业速解三大神级技巧
1. **连推技巧（Multi-tile Pushing）**：
   - 很多新手每次只点一个方块，导致手速上限极低。
   - 当空白格与目标方块相隔 2 或 3 个格子且在同一直线上时，**直接点击最外侧的目标方块**，Puzzle PK 引擎会自动将同一直线上的所有中间方块整列/整行推移！这能直接减少 60% 以上的物理点击次数。
2. **空白格视线锁定流（Ghost Blank Tracking）**：
   - 菜鸟的眼睛跟着数字跑，高手的眼睛永远盯住**空白格**。
   - 脑中规划空白格的游走轨道（“空格往右、下、下、左、上”），通过引导空白格的流动来反向牵引数字。
3. **APM 与节拍化操作**：
   - 保持每秒 4 到 6 步的匀速点击节奏，避免因盲目急速暴击导致误触而多走废步。

---

## 第六章：多人实时竞速（Speed PK）实战对抗与心理博弈

### 6.1 同构绝对公平竞技模式
在 Puzzle PK 的在线竞技大厅中，所有进入同一房间的选手（无论 2 人对决还是多人混战）在开局时都将获得**完全相同的随机乱序种子**。这意味着每位选手面临的初始逆序数、最优复原路径以及难度完全均等，胜负纯粹取决于个人解谜思路与执行手速。

### 6.2 比赛节奏与开局起手式
- **倒计时 3 秒观察期**：利用开局 3、2、1 倒计时，迅速用眼球扫出数字 1、2、3、4 的初始坐标，在脑海中预演前 5 步空白格调动路径。
- **首层闪电战**：比赛的前 5 秒谁能以最少步数锁定第一行，谁就能掌握心理上的压倒性优势。
- **抗干扰心理素质**：顶部 HUD 会实时显示对手的进度条与剩余方块数。切勿因对手领先几个方块而心浮气躁。记住：**数字华容道越到最后两行耗时波动越大，稳住基本盘随时能够绝地逆转！**

---

## 第七章：高频疑难解答与常见误区诊断 (FAQ)

### Q1: 键盘操作中，WASD 和方向键到底是怎么推方块的？
答：操作映射基于**直觉推入逻辑**：
- 按 <kbd>W</kbd> 或 <kbd>↑</kbd>：将空白格**正下方**的方块向上推入空格；
- 按 <kbd>S</kbd> 或 <kbd>↓</kbd>：将空白格**正上方**的方块向下推入空格；
- 按 <kbd>A</kbd> 或 <kbd>←</kbd>：将空白格**正右方**的方块向左推入空格；
- 按 <kbd>D</kbd> 或 <kbd>→</kbd>：将空白格**正左方**的方块向右推入空格。
双手无需离开主键盘区，极度契合盲打速解。

### Q2: 为什么我复原第二行的时候，总是不小心破坏第一行？
答：这是因为缺乏“局部缓冲区”意识。复原第二行（如 5, 6, 7, 8）时，空白格的活动范围应严格限制在第 2 行及以下区域，绝对不要让空白格进入已锁定的第一行。如果发现必须借道第一行，说明你的推导路径出现绕远，请利用下方的第 3、4 行作为中转跑道。

### Q3: 正常完成 4×4 华容道需要多少步？怎样的成绩算高手？
答：
- **休闲达标**：120 步以内，耗时 1 到 2 分钟；
- **进阶熟手**：70 到 90 步，耗时 30 到 50 秒；
- **竞技高手**：45 到 65 步，耗时 15 到 25 秒；
- **世界级纪录**：40 步左右，耗时 8 到 12 秒。`,

  en: `# The Definitive Guide to Sliding Puzzle (15-Puzzle): Mathematical Principles & Speed Solving Masterclass

Welcome to the official, authoritative master guide to the **Sliding Puzzle** (also celebrated as the 15-Puzzle, Number Slide, or Mystic Square) on Puzzle PK. Beyond its reputation as a thrilling dexterity and logic challenge, the sliding puzzle represents one of the most elegant practical applications of discrete mathematics, permutation parity, and graph state spaces.

This guide provides an end-to-end curriculum ranging from the formal mathematical proof of puzzle solvability to the Layer-by-Layer reduction method, the Corner Pair Insertion technique, last-two-row cycle resolution, and multiplayer Speed PK duel dynamics.

---

## Chapter 1: Historical Roots & Permutation Group Mathematics (The 1879 Parity Theorem)

### 1.1 The Chapman Invention and the Sam Loyd $1,000 Bounty Hoax
The sliding puzzle was created in 1874 by Noyes Palmer Chapman, a postmaster in Canastota, New York. In the late 19th century, renowned puzzle publicist Sam Loyd launched an international sensation by offering a $1,000 cash prize to anyone who could solve the puzzle starting with just the **14 and 15 tiles swapped**, with the empty space at the bottom right.

Although tens of thousands claimed to be "just one move away," no one ever collected the prize. In 1879, American mathematicians mathematically established that starting from that scrambled configuration, the solution was **physically and logically impossible**.

### 1.2 Mathematical Formulation of Inversion Count
Consider the grid flattened row by row into a single 1D numerical sequence of length $M = N^2 - 1$ (ignoring the empty blank).
The **Inversion Count** $\\text{Inv}(A)$ of permutation $A$ is defined as:
$$\\text{Inv}(A) = \\sum_{1 \\le i < j \\le M} \\mathbb{I}(A_i > A_j)$$
In words, an inversion is any pair of tiles $(A_i, A_j)$ such that $i < j$ but $A_i > A_j$. In the fully resolved target configuration $[1, 2, 3, \\dots, 15]$, $\\text{Inv} = 0$.

### 1.3 The Johnson & Story Parity Invariance Theorem (1879)
William Woolsey Johnson and William E. Story published the definitive parity theorem in the *American Journal of Mathematics* (1879):
1. **Horizontal Blank Slide**: Moving the empty slot left or right within the same row leaves the linear order of all numbers completely intact. Therefore, $\\Delta \\text{Inv} = 0$.
2. **Vertical Blank Slide**: Moving the empty slot up or down causes the moved tile to jump across exactly $N - 1$ other numbers in the 1D sequence.
   - **For Odd Grid Dimensions ($N$ is odd, e.g., 3×3, 5×5)**:
     $N - 1$ is always even. Jumping across an even number of elements alters the inversion count by an even integer ($\\Delta \\text{Inv} \\in \\{-(N-1), \\dots, +(N-1)\\}$). Hence, the **parity of the inversion count is strictly conserved**!
     $$\\text{Solvable} \\iff \\text{Inv}(A) \\equiv 0 \\pmod 2$$
   - **For Even Grid Dimensions ($N$ is even, e.g., 4×4, 6×6)**:
     $N - 1$ is always odd. Every vertical move flips the parity of $\\text{Inv}(A)$. Let $R_{\\text{blank}}$ be the row index of the empty slot counting upward from the bottom row (bottom row = 1):
     $$\\text{Invariant} = \\left( \\text{Inv}(A) + R_{\\text{blank}} \\right) \\pmod 2$$
     $$\\text{Solvable} \\iff \\text{Inv}(A) + R_{\\text{blank}} \\equiv 0 \\pmod 2 \\quad (\\text{target at bottom-right})$$
3. **The Unsolvability Deduction**: Swapping any two adjacent tiles changes $\\text{Inv}(A)$ by exactly $\\pm 1$ without moving the empty cell. This flips the parity state, transforming an otherwise solvable puzzle into an impossible dead end. Exactly **50% of all randomly assembled configurations are mathematically unsolvable**.

> **Puzzle PK Guarantee**: Every single board generated on our platform is created via a legitimate reversible random-walk scramble from the goal state. Every single game is **guaranteed 100% solvable**.

---

## Chapter 2: The Systematic Layer-by-Layer Strategy

### 2.1 The Principle of Dimensional Reduction
Novices frequently attempt to move tiles to their target positions as soon as they spot them nearby. This greedy approach inevitably leads to deadlock when later placements dismantle earlier successes.

Master solvers rely on **Layer-by-Layer Reduction**:
1. Solve Row 1 completely, then permanently lock it.
2. Solve Column 1 completely, permanently locking it. (This reduces a 4×4 problem into a 3×3 problem).
3. Solve Row 2 and Column 2 (reducing the board to 2×2 or 2×3).
4. Solve the remaining terminal cyclic group.

### 2.2 Constructing the First Row (4×4 Example)
Target: Establish the top row as $[1, 2, 3, 4]$.
- **Tiles 1 through $N-2$ (Tiles 1 and 2)**: With the entire bottom area available as workspace, navigate tile 1 directly to $(1, 1)$, then tile 2 directly to $(1, 2)$.
- **The Corner Blockade**: Placing tile 3 into $(1, 3)$ prematurely leaves no entry trajectory for tile 4 into $(1, 4)$ without kicking tile 3 back out.

### 2.3 The Master Maneuver: Corner Pair Insertion ("L-Tandem Method")
To position the final two tiles of a row ($3$ and $4$) without disrupting placed tiles:
1. **Setup Formation**:
   - Park tile **3** at $(2, 4)$ (the cell directly below the top-right corner).
   - Park tile **4** directly below tile 3 at $(3, 4)$ or to its left at $(2, 3)$.
2. **Rotational Sweep**:
   - Guide the empty space into the top-right corner $(1, 4)$.
   - Slide tile 3 upward into $(1, 3)$.
   - Rotate the empty space around the corner, pulling tile 4 immediately behind tile 3 into $(1, 4)$.
3. **Locking**: Row 1 is now permanently secured and must never be altered again.

---

## Chapter 3: Left-Column Reduction & Recursive Shrinking

### 3.1 Resolving Column 1
With Row 1 locked, the active working frame is reduced to $3 \\times 4$.
- Move tile **5** directly into position $(2, 1)$.
- Apply the vertical mirror of the Corner Pair Insertion technique for tiles **9** and **13**:
  - Park tile **9** at $(4, 2)$ (adjacent to the bottom-left corner).
  - Position tile **13** behind it.
  - Cycle the blank tile through $(4, 1)$ to snap tile 9 and tile 13 into their vertical slots $(3, 1)$ and $(4, 1)$.

### 3.2 Recursive Reduction Flow
At this stage, Row 1 and Column 1 are complete. The unsolved board is now an unconstrained **3×3 puzzle**. Repeating the exact same sequence for Row 2 (tiles 6, 7, 8) and Column 2 (tiles 10, 14) shrinks the challenge down to the final **2×3 or 2×2 zone**.

---

## Chapter 4: Terminal Resolution: Last Two Rows & Cyclic Permutations

### 4.1 Why the Last Two Rows Cannot Be Solved Independently
In the terminal $2 \\times 3$ subgrid, you no longer have extra rows below to serve as neutral buffer zones. Attempting to place tiles into Row 3 without considering Row 4 will inevitably trap tiles. The final 6 cells must be manipulated as a continuous, unified **orbital track**.

### 4.2 The 3-Cycle Conveyor Belt
In group theory, all even permutations can be generated by compositions of **3-cycles**.
- Moving the empty slot in a closed rectangular loop $(1 \\to 2 \\to 3 \\to 4 \\to 1)$ produces a cyclic shift of the tiles encountered along the perimeter.
- By rotating the cycle until the relative order of the remaining numbers matches the target sequence, the entire bottom-right quadrant resolves harmoniously in one sweeping motion.

### 4.3 Diagnosing the "Last Two Swapped" Optical Illusion
Players often complain: *"Everything is solved, but 14 and 15 are reversed! Is the game bugged?"*
- **Truth**: As proven in Chapter 1, this board is 100% solvable.
- **Root Cause**: The permutation phase of the bottom two rows is misaligned by a cycle offset.
- **Solution**:
  1. Do not obsessively wiggle the two swapped tiles.
  2. Backtrack 3 to 4 moves into the $2 \\times 3$ area.
  3. Cycle tiles 11, 12, 13, 14, 15 through the wider loop to correct their relative entry phases.
  4. The puzzle will resolve cleanly with zero parity conflicts.

---

## Chapter 5: Scalability to Large Grids (5×5, 6×6, 10×10) & Speedcubing Mechanics

### 5.1 Universal Inductive Scalability
Because the Layer-by-Layer reduction method reduces an $N \\times N$ grid to $(N-1) \\times (N-1)$ inductively, the algorithm works identically whether you are tackling standard 15-Puzzle, 24-Puzzle (5×5), or 35-Puzzle (6×6).

### 5.2 Professional Speed Techniques
1. **Multi-Tile Pushing (Line Slides)**:
   - Novice players click tiles one by one.
   - On Puzzle PK, clicking any tile in the same row or column as the empty slot will slide the **entire intervening line of tiles** in a single frame. This slashes physical input overhead by more than 60%.
2. **Ghost Blank Tracking**:
   - Do not chase tiles with your eyes; trace the **trajectory of the empty slot**.
   - Direct the empty space to orbit around target tiles, pulling them into place with minimal displacement.
3. **APM & Move Economy**:
   - Maintain a steady rhythm of 4–6 actions per second rather than sporadic bursts of erratic moves that introduce errors.

---

## Chapter 6: Real-Time Multiplayer Speed PK Duel Tactics

### 6.1 Identical Scramble Seed Fairness
In Puzzle PK's competitive rooms, all participants receive the **exact same scrambled board seed**. There is zero RNG bias: both competitors face identical initial inversion counts, identical tile distributions, and identical theoretical optimal move counts.

### 6.2 Match Cadence & Psychological Composure
- **The 3-Second Opening Preview**: Use the countdown to spot tiles 1, 2, 3, and 4. Pre-visualize the first 5 moves before the board unlocks.
- **The HUD Pressure Dynamic**: The top combat HUD updates opponent tile progress in real time. Do not panic if an opponent surges ahead early; the final two rows introduce heavy move variances where clean technique frequently enables dramatic comeback victories.

---

## Chapter 7: Frequently Asked Questions & Troubleshooting (FAQ)

### Q1: How do the keyboard shortcuts work?
The keyboard controls are mapped with intuitive physics:
- Press <kbd>W</kbd> or <kbd>↑</kbd>: Slides the tile **below** the blank space upward into it.
- Press <kbd>S</kbd> or <kbd>↓</kbd>: Slides the tile **above** the blank space downward into it.
- Press <kbd>A</kbd> or <kbd>←</kbd>: Slides the tile **to the right** of the blank space leftward into it.
- Press <kbd>D</kbd> or <kbd>→</kbd>: Slides the tile **to the left** of the blank space rightward into it.

### Q2: What are the benchmark completion times for a 4×4 puzzle?
- **Casual Solver**: 100–150 moves, 1.5–3 minutes.
- **Intermediate Player**: 70–90 moves, 40–60 seconds.
- **Competitive Master**: 45–65 moves, 15–25 seconds.
- **World Record Class**: ~40 moves, under 10 seconds.`,

  es: `# Guía Definitiva del Rompecabezas Deslizante (Juego del 15): Principios Matemáticos y Tutorial de Velocidad

Bienvenido a la guía maestra oficial de Puzzle PK para el **Rompecabezas Deslizante** (conocido como Sliding Puzzle o Juego del 15). Este juego no solo es un fascinante reto de agilidad mental, sino una de las demostraciones prácticas más bellas de la teoría de grupos de permutaciones y paridad matemática.

## Capítulo 1: Fundamentos Matemáticos y Teorema de Paridad de 1879
Inventado por Noyes Palmer Chapman en 1874 y popularizado por Sam Loyd, el rompecabezas plantea una pregunta matemática fundamental: ¿se puede resolver cualquier tablero desordenado?
- **Número de Inversiones**: Se define una inversión como cualquier pareja de fichas donde una ficha mayor aparece antes que una menor en el orden lineal del tablero.
- **Teorema de Johnson y Story (1879)**: 
  - En tableros de orden impar (como 3x3 o 5x5), los movimientos horizontales y verticales nunca alteran la paridad del número de inversiones. Por tanto, un tablero solo es resoluble si su número inicial de inversiones es **par**.
  - En tableros de orden par (como 4x4 o 6x6), la suma del número de inversiones más la fila del hueco vacío respecto al fondo debe ser constante.
  - Conclusión: El 50% de las combinaciones puramente aleatorias son matemáticamente imposibles. **Puzzle PK garantiza tableros 100% resolubles** mediante permutaciones legales.

## Capítulo 2: Estrategia por Capas (Layer-by-Layer)
El método estándar y profesional consiste en resolver el tablero de forma incremental:
1. **Fila 1 completa**: Coloque los primeros números (1, 2 en 4x4) y aplique el método tándem en esquina para los dos últimos (3 y 4).
2. **Columna 1 completa**: Empareje y deslice los números restantes de la columna izquierda (5, 9, 13) convirtiendo el 4x4 en un problema reducido de 3x3.
3. **Últimas dos filas**: No intente resolver la penúltima fila de forma aislada; utilice la pista circular de 2x3 para rotar las fichas en ciclos de 3 hasta su encaje definitivo.

## Capítulo 3: Duelos Multijugador Speed PK y Consejos Pro
- **Tablero Idéntico**: Todos los jugadores inician con el mismo estado de mezcla para una competencia 100% equitativa.
- **Desplazamiento Múltiple**: Al pulsar una ficha alineada con el espacio vacío, toda la hilera se desliza simultáneamente.
- **Atajos**: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> y flechas permiten jugar a gran velocidad sin levantar las manos del teclado.`,

  ja: `# スライドパズル（15パズル）完全攻略ガイド：置換群の数学と最速解法マスタークラス

Puzzle PKがお届けする**スライドパズル（15パズル / 数字華容道）**の決定版公式ガイドです。単なる指先のスピード勝負にとどまらず、離散数学や置換群論の美しい秩序を体験できる論理パズルの最高峰です。

## 第1章：数学的原理と1879年のパリティ定理
1874年にノイズ・パーマー・チャップマンによって発明され、サム・ロイドの賞金パズルでも知られる15パズルには、明確な数学的証明が存在します。
- **転倒数（Inversion Number）**：盤面の数字を一列に並べたとき、大小関係が逆転しているペアの総数です。
- **ジョンソン＆ストーリーの定理（1879年）**：
  - 奇数サイズ（3x3、5x5）：空きマスの移動は転倒数の偶奇性に影響を与えません。したがって転倒数が偶数の配置のみが解けます。
  - 偶数サイズ（4x4、6x6）：空きマスの垂直移動と転倒数の合計パリティが保存されます。
  - 純粋にランダムな配置の50%は絶対に解けない配置になりますが、**Puzzle PKでは合法手シミュレーションにより100%解答可能な盤面のみを生成**しています。

## 第2章：標準解法「層別攻略法（Layer-by-Layer）」
初心者と上級者の違いは「整列させた行を二度と崩さない」規則性にあります。
1. **第1行の完成**：1、2を配置した後、3と4は「コーナーペア挿入法」を用いて2枚1組で回転させて右上隅に流し込みます。
2. **第1列の完成**：同様のテクニックで5、9、13を揃え、4x4盤面を3x3盤面へと次元縮小します。
3. **最後の2行の循環置換**：残りの2x3エリアはベルトコンベア状の環状ルートとして扱い、3-サイクル置換で一気に揃えます。

## 第3章：リアルタイム対戦（Speed PK）と高速操作テクニック
- **完全公平な共通盤面**：対戦者全員に同一のシャッフル初期シードが配布されます。
- **複数コマ一括プッシュ**：空きマスと同じライン上にある離れたコマをタップすると、間の全コマが一気にスライドします。
- **キーボード完全対応**：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> および矢印キーで手元を見ずにブラインド操作が可能です。`,

  ko: `# 슬라이딩 퍼즐 (15 퍼즐) 궁극의 공략: 수학적 원리와 스피드 솔빙 마스터클래스

Puzzle PK의 **슬라이딩 퍼즐 (15 퍼즐 / 숫자 화용도)** 공식 공략 가이드입니다. 공간 지각력과 손가락 반응 속도뿐만 아니라 순열군론(Permutation Groups)과 패리티 불변량의 수학적 원리를 완벽하게 담았습니다.

## 제1장: 수학적 원리와 1879년 패리티 정리
1874년 발명된 이 퍼즐은 유명한 '14와 15가 뒤바뀐 불가능한 퍼즐'로 수학계의 주목을 받았습니다.
- **반전수 (Inversion Count)**: 숫자를 1차원 배열로 펼쳤을 때 순서가 뒤바뀐 쌍의 개수입니다.
- **Johnson & Story 정리 (1879)**: 
  - 홀수 크기 격자(3x3, 5x5)에서는 이동에 의해 반전수의 홀짝성(Parity)이 절대 변하지 않습니다.
  - 짝수 크기 격자(4x4, 6x6)에서는 반전수와 빈칸의 행 위치 합이 보존됩니다.
  - 임의로 타일을 섞으면 50% 확률로 풀 수 없는 불능 상태가 되지만, **Puzzle PK는 유효한 이동 시뮬레이션으로 100% 풀 수 있는 퍼즐만 생성**합니다.

## 제2장: 계층별 정복법 (Layer-by-Layer)
1. **첫 번째 행 완성**: 1과 2를 먼저 배치하고, 3과 4는 코너 페어 방식으로 묶어 회전시켜 안착시킵니다.
2. **첫 번째 열 완성**: 5, 9, 13을 차례로 정렬하여 4x4 퍼즐을 3x3 퍼즐로 차원 축소합니다.
3. **마지막 두 행 해결**: 마지막 2x3 영역은 단일 행이 아닌 궤도 루프 형태로 파악하여 3-사이클 치환으로 맞춥니다.

## 제3장: 실시간 스피드 PK 대전 팁
- **동일 시드 대결**: 모든 플레이어가 동일한 셔플 상태에서 시작하여 100% 실력으로 승부합니다.
- **다중 타일 동시 밀기**: 빈칸과 일직선상에 있는 먼 타일을 누르면 중간 타일들이 한 번에 이동합니다.
- **단축키**: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 및 방향키로 키보드 블라인드 플레이가 가능합니다.`,

  pt: `# Guia Definitivo do Quebra-Cabeça Deslizante (Jogo do 15): Matemática e Estratégia de Velocidade

Bem-vindo ao guia mestre oficial do **Quebra-Cabeça Deslizante (Sliding Puzzle / 15-Puzzle)** no Puzzle PK. Descubra os segredos matemáticos da paridade de permutações e o método profissional camada por camada.

## Capítulo 1: Fundamentos Matemáticos e Paridade de 1879
- **Contagem de Inversões**: Pares de números onde um número maior precede um menor.
- **Teorema de Johnson & Story**: Exatamente 50% das permutações aleatórias são impossíveis de resolver devido à conservação de paridade. No Puzzle PK, **todos os tabuleiros gerados são 100% solucionáveis**.

## Capítulo 2: Método Camada por Camada (Layer-by-Layer)
1. **Primeira Linha**: Posicione os primeiros números e use a técnica de inserção em canto para os dois últimos em conjunto.
2. **Primeira Coluna**: Reduza o tabuleiro de 4x4 para 3x3 alinhando a coluna esquerda.
3. **Últimas Duas Linhas**: Resolva o quadrante restante em rotações cíclicas de 3 elementos.

## Capítulo 3: Duelos Multijugador Speed PK
- Tabuleiro idêntico para todos os competidores.
- Deslizamento de múltiplas peças em linha com um único clique.
- Suporte a atalhos <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> e setas direcionais.`,

  fr: `# Guide Ultime du Jeu de Taquin (Sliding Puzzle / 15-Puzzle) : Mathématiques et Guide de Vitesse

Bienvenue sur le guide expert du **Jeu de Taquin** sur Puzzle PK. Maîtrisez les concepts mathématiques des groupes de permutation et la méthode de résolution par couches (Layer-by-Layer).

## Chapitre 1 : Principes Mathématiques et Parité (1879)
- **Nombre d'inversions** : Somme des paires où un nombre supérieur précède un nombre inférieur.
- **Théorème de Johnson & Story** : 50 % des mélanges purement aléatoires sont insolubles. **Puzzle PK garantit 100 % de grilles résolubles** par déplacements valides.

## Chapitre 2 : Méthode par Couches (Layer-by-Layer)
1. **Ligne 1** : Placez les tuiles 1 et 2, puis insérez le duo 3-4 en bloc par rotation de coin.
2. **Colonne 1** : Complétez la colonne de gauche pour réduire la grille 4x4 en une grille 3x3.
3. **Dernières Lignes** : Gérez les 6 dernières cases comme une boucle fermée pour résoudre les permutations finales.

## Chapitre 3 : Duels Multijoueur Speed PK
- Grille identique pour tous les participants en direct.
- Déplacement simultané de lignes entières en un clic.
- Raccourcis clavier <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> et flèches de direction ultra-réactifs.`,

  de: `# Ultimativer Leitfaden für das Schiebepuzzle (15-Puzzle): Mathematik und Speedcubing-Strategien

Willkommen zum offiziellen Puzzle PK Leitfaden für das **Schiebepuzzle (15-Puzzle / Sliding Puzzle)**. Lernen Sie die mathematischen Paritätssätze und die professionelle Schicht-für-Schicht-Methode (Layer-by-Layer) kennen.

## Kapitel 1: Mathematische Grundlagen & Paritätssatz (1879)
- **Fehlstandszahl (Inversion Count)**: Bestimmt, wie viele Zahlenpaare in umgekehrter Reihenfolge stehen.
- **Satz von Johnson & Story**: 50 % aller zufälligen Permutationen sind unlösbar. **Puzzle PK garantiert zu 100 % lösbare Bretter** durch gültige Zufallsschritte.

## Kapitel 2: Die Schicht-für-Schicht-Methode (Layer-by-Layer)
1. **Erste Reihe**: Ziffern 1 und 2 platzieren, Ziffern 3 und 4 paarweise über die Ecke hineindrehen.
2. **Erste Spalte**: Linke Spalte lösen, um das 4x4-Feld auf ein 3x3-Teilproblem zu reduzieren.
3. **Letzte zwei Reihen**: Als geschlossenen Kreis manipulieren und über 3er-Zyklen auflösen.

## Kapitel 3: Mehrspieler Speed PK
- Gleiches Ausgangsbrett für alle Spieler für fairen Wettbewerb.
- Mehrfachverschiebung ganzer Kachelreihen mit einem einzigen Klick.
- Volle Tastatursteuerung mit <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> und Pfeiltasten.`
};

// 3. Execution function
function run() {
  const root = path.resolve(__dirname, '../..');
  
  // Update i18n JSON files
  for (const [lang, seoDesc] of Object.entries(seoDescMap)) {
    const filePath = path.join(root, `frontend/src/assets/i18n/${lang}.json`);
    if (fs.existsSync(filePath)) {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      json['game.sliding.seo_desc'] = seoDesc;
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`Updated game.sliding.seo_desc in ${lang}.json`);
    }
  }

  // Update public/assets/games-docs.json
  const docsPath = path.join(root, 'frontend/public/assets/games-docs.json');
  if (fs.existsSync(docsPath)) {
    const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    const slidingDoc = docs.find(d => d.id === 'sliding');
    if (slidingDoc) {
      slidingDoc.rules = JSON.stringify(slidingDocsRules);
      fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2) + '\n', 'utf8');
      console.log(`Updated sliding.rules in games-docs.json`);
    } else {
      console.error('Could not find sliding in games-docs.json');
    }
  }
}

run();
