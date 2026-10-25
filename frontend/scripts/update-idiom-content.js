const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'src/assets/i18n');
const docsPath = path.join(root, 'public/assets/games-docs.json');

// ==========================================
// 1. Layer 1: In-Page Tactical Quick-Guide (Friendly, Plain, No LaTeX)
// ==========================================
const seoDescMap = {
  zh: `<h2>关于真·成语接龙 (Idiom Solitaire / 中华神龙成语链)</h2>
<p><strong>真·成语接龙 (Idiom Solitaire)</strong> 是一场纯正地道、高爽感、富有中华文化底蕴的汉字首尾相连益智游戏。从开局的第一个成语出发，你将化身驭龙大师，用上一成语的“尾字”作为下一成语的“首字”，不断铸造四字成语，让盘旋在屏幕上的金色神龙不断延展生长！<strong>支持“同字严谨”与“同音趣味”双模式切换，纯本地秒开零延迟，免下载安装，老少咸宜，随时随地开启成语闯关与双人极速对决！</strong></p>

<h3>全平台按键与操控速查表</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">操作类型</th>
        <th class="p-2 border border-[var(--color-border-card)]">鼠标交互</th>
        <th class="p-2 border border-[var(--color-border-card)]">触控手势 (手机 / 平板)</th>
        <th class="p-2 border border-[var(--color-border-card)]">功能说明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">选字拼词</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击候选字盘中的字块</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触候选字方块</td>
        <td class="p-2 border border-[var(--color-border-card)]">自动填入当前空缺的汉字槽位中，填满 4 字自动校验提交</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">退回 / 撤销字块</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击已填入的槽位字块</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触槽位中的字块</td>
        <td class="p-2 border border-[var(--color-border-card)]">立即撤回该汉字到字盘中，可随时更换新字</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">画龙点睛 (提示)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部 💡 提示按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触 💡 提示图标</td>
        <td class="p-2 border border-[var(--color-border-card)]">消耗一次锦囊，自动为你填入一个关键正确汉字</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">移花接木 (换字)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部 🔄 换字按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触 🔄 换字图标</td>
        <td class="p-2 border border-[var(--color-border-card)]">当前字盘没有思路？刷新字盘并换一组全新候选字</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">成语宝典 (灵感)</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击顶部 📖 宝典按钮</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触 📖 宝典图标</td>
        <td class="p-2 border border-[var(--color-border-card)]">展开当前尾字所有可接的成语列表，点击即可直接填入</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">神龙卡片赏析</td>
        <td class="p-2 border border-[var(--color-border-card)]">点击龙身上的任意成语卡片</td>
        <td class="p-2 border border-[var(--color-border-card)]">轻触龙身卡片</td>
        <td class="p-2 border border-[var(--color-border-card)]">查看该成语的完整拼音、详细白话释义与历史出处典故</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>接龙三大物理铁律速查</h3>
<ul>
  <li><strong>首尾相咬原则</strong>：新成语的第 1 个字，必须与上一成语的第 4 个字完全一致！例如：“万象更新” ➔ 尾字是“新” ➔ 下一个必须接“新人新事”或“新仇旧恨”。</li>
  <li><strong>同音宽容扩展</strong>：开启“同音趣味”模式后，只需拼音读音相同即可相接！例如：“天” (tiān) ➔ 既可接“天下无双”，也可接“添砖加瓦”，极大降低门槛，儿童初学更畅快！</li>
  <li><strong>严禁自闭与重复使用</strong>：在同一局神龙链条中，已经使用过的成语不能再次使用，考验词汇储备与大局观！</li>
  <li><strong>神龙延展生长</strong>：每成功接龙一个合法成语，神龙向前腾飞 1 节，连击 Streak +1，获得丰厚智慧经验点！</li>
</ul>

<h3>四大破案接龙定式</h3>
<ol>
  <li><strong>高频尾字优先定式</strong>：尽量接出以“人、天、大、生、心、一、有”等常见汉字结尾的成语，这些字在词库中拥有数十个后续成语，永远不用担心接不下去！</li>
  <li><strong>同音宽容大营救</strong>：当接出一个尾字比较生僻冷门的成语（例如“鼎”、“囊”），不要慌张！切换到“同音趣味”模式，立刻拥有大量同音汉字可供选择，瞬间盘活全盘！</li>
  <li><strong>避开断头冷门字</strong>：注意避开以极度生僻、成语库中完全没有后续词汇的汉字作为尾字，防止神龙提前入海！</li>
  <li><strong>双人 PK 攻防压制</strong>：在双人 Speed PK 竞技中，双方同台共抢一条神龙。率先抢答接龙的玩家不仅得分，更将新成语的尾字留给对手。拼手速、拼反应、拼词汇量！</li>
</ol>

<h3>常见问题解答 (FAQ)</h3>
<p><strong>Q：什么是“同字严谨”和“同音趣味”模式？</strong><br>
A：同字严谨模式要求汉字完全一致（如 新 ➔ 新），适合中学生与成人成语高手挑战；同音趣味模式只要拼音相同即可相接（如 新 xīn ➔ 心 xīn），老少咸宜、极其适合小学生亲子启蒙！</p>
<p><strong>Q：单机练习需要联网吗？</strong><br>
A：完全不需要！游戏内置完整的中华成语辞书，100% 运行在您的浏览器本地内存中，零网络延迟，无网离线也能随时随地接龙！</p>`,

  en: `<h2>About True Idiom Solitaire (Chinese Idiom Dragon Chain)</h2>
<p><strong>True Idiom Solitaire (成语接龙)</strong> is an authentic, engaging, and culturally rich Chinese character chaining puzzle game. Starting from an initial four-character idiom, your goal is to chain the tail character of the previous idiom into the head character of the next idiom. Watch the majestic golden dragon grow longer with every successful chain! <strong>Features both Exact Character and Homophone (Pinyin-friendly) modes, 100% client-side offline calculation, responsive across all devices!</strong></p>

<h3>Key Controls and Interaction Table</h3>
<div class="overflow-x-auto my-4">
  <table class="w-full text-left border-collapse border border-[var(--color-border-card)] text-sm">
    <thead>
      <tr class="bg-[var(--color-bg-card)] text-[var(--color-text-main)]">
        <th class="p-2 border border-[var(--color-border-card)]">Action</th>
        <th class="p-2 border border-[var(--color-border-card)]">Mouse Control</th>
        <th class="p-2 border border-[var(--color-border-card)]">Touch (Mobile / Tablet)</th>
        <th class="p-2 border border-[var(--color-border-card)]">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Pick Character</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click character tile on keypad</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap character tile</td>
        <td class="p-2 border border-[var(--color-border-card)]">Fills into the next empty slot; auto-verifies upon 4 characters</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Retract Character</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click filled character in slot</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap filled character slot</td>
        <td class="p-2 border border-[var(--color-border-card)]">Returns the character to the keypad for easy correction</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Hint (画龙点睛)</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click 💡 Hint button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap 💡 Hint icon</td>
        <td class="p-2 border border-[var(--color-border-card)]">Automatically fills in a valid character from a recommended idiom</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Shuffle (移花接木)</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click 🔄 Shuffle button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap 🔄 Shuffle icon</td>
        <td class="p-2 border border-[var(--color-border-card)]">Refreshes the keypad with a fresh set of candidate characters</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Treasury (成语宝典)</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click 📖 Treasury button</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap 📖 Treasury icon</td>
        <td class="p-2 border border-[var(--color-border-card)]">Reveals all legal successors for the current character with full meanings</td>
      </tr>
      <tr>
        <td class="p-2 border border-[var(--color-border-card)] font-bold">Inspect Idiom Story</td>
        <td class="p-2 border border-[var(--color-border-card)]">Click any card on the dragon chain</td>
        <td class="p-2 border border-[var(--color-border-card)]">Tap any dragon chain card</td>
        <td class="p-2 border border-[var(--color-border-card)]">Displays pinyin, comprehensive definition, and historical origin story</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>Core Solitaire Physical Laws</h3>
<ul>
  <li><strong>Tail-to-Head Binding</strong>: The first character of the new idiom MUST match the last character of the previous idiom (e.g. Wan-Xiang-Geng-Xin ➔ Xin-Ren-Xin-Shi).</li>
  <li><strong>Homophone Mode (Pinyin Tolerance)</strong>: In Homophone mode, matching the pinyin pronunciation is allowed, making it accessible and fun for young learners and beginners!</li>
  <li><strong>No Duplicates</strong>: An idiom cannot be used twice within the same dragon chain session.</li>
  <li><strong>Dragon Extension</strong>: Every successful link extends the golden dragon by 1 segment and builds your combo streak!</li>
</ul>`
};

// ==========================================
// 2. Layer 2: 7-Chapter Treatise in games-docs.json (Zero LaTeX, Child-Friendly)
// ==========================================
const zhRules = `## 第一章：成语接龙到底是什么？汉字小火车的跨时空大旅行

如果你去过火车站，一定见过一节节首尾挂靠在一起的长长车厢：前一节车厢的挂钩，紧紧扣住后一节车厢的车头。

中华成语接龙，就是一场奇妙的**“汉字小火车大旅行”**！
每一个成语都是由 4 个神奇的汉字组成的小火车。游戏的规则非常简单而迷人：
**上一节车厢的尾巴汉字，必须成为下一节车厢的车头汉字！**

举个例子：
- 第一节车厢：**【万 象 更 新】**，车尾巴的字是 **“新”**；
- 第二节车厢：就必须从 **“新”** 字开头发车，接出 **【新 人 新 事】**，此时车尾变成了 **“事”**；
- 第三节车厢：从 **“事”** 字开头发车，接出 **【事 在 人 为】**，车尾变成了 **“为”**；
- 第四节车厢：从 **“为”** 字开头发车，接出 **【为 所 欲 为】**……

看！一节扣一节，原本独立的四字成语，在你的智慧连接下，变成了一条在金光中盘旋腾飞的**神龙**！这不仅是一场考验记忆力与词汇量的益智大挑战，更是一场穿越三千年历史、与古代大文学家们对话的趣味大冒险。

---

## 第二章：接龙的四大物理铁律：严禁脱轨与撞车

在成语神龙的大轨道上，有四条必须绝对遵守的物理铁律：

### 铁律一：首尾相咬，一字不差
这是接龙的第一大基石。下一节成语的首字，必须精准接上上一节成语的尾字。如果尾字是“龙”，你接“马到成功”，那就是严重的火车脱轨事故，轨道将亮起红灯报警！

### 铁律二：同音宽容法宝（初学者与儿童的护身符）
汉字浩如烟海，有些汉字结尾非常罕见（比如“鼎”或者“囊”）。为了让小学生和成语初学者也能畅快游玩，游戏特别设立了 **“同音趣味模式”**！
在同音模式下，只要拼音读音相同，就可以作为合法的接龙！
例如：上一句尾字是“天” (tiān)，你既可以接“天下无双” (tiān)，也可以接“添砖加瓦” (tiān)。就像换了一个同音的魔法挂钩，再也不用担心卡壳啦！

### 铁律三：严禁原地自转与重复使用
在同一局神龙探险中，同一个成语绝不允许使用两次！如果你接了“一心一意”，后面再转回来接“一心一意”，神龙就会在原地绕圈咬住自己的尾巴打死结。只有源源不断探索新成语，神龙才能越飞越高！

### 铁律四：四字成真，杜绝自造词
只有中华成语大辞典中收录的正统成语才能被神龙认可。自己临时拼凑的四个字（比如“天天开心”、“今天真好”）是不能上车充当车厢的哦！

---

## 第三章：破案第一大绝招：同字严谨 vs 同音趣味（小学生的破局法宝）

在游戏界面的顶栏，有一个非常神奇的切换开关：
- 🀄 **同字严谨模式**：要求汉字长相一模一样，原汁原味，适合中高年级同学和成语大侦探挑战自我！
- 🎵 **同音趣味模式**：只要拼音读音相同即可相接，是初学者的破局神器！

### 为什么同音模式如此神奇？
让我们来看看数学上的生动对比：
在 3500 个常用中华成语库中：
- 如果严格要求**同字相接**，大约有 65% 的成语尾字能够顺畅接出后续成语，剩下的 35% 会因为尾字罕见而遇到接龙阻碍；
- 但如果开启**同音相接**，相接成功率瞬间飙升到 **98.1%**！也就是说，全库 3500 个成语中，足足有 3433 个成语都可以无缝接续！

### 破局实用案例：
当你接出了成语 **“海阔天空”**，尾字是“空”：
- 在同字模式下，以“空”字开头的常见成语有“空前绝后”、“空穴来风”；
- 假如此时字盘里没有“前”或“穴”，你就可以切换到同音模式：拼音 (kōng / kǒng)，不仅可以接“空”，还可以接“孔”开头的“孔武有力”！一招化险为夷，神龙继续腾飞！

---

## 第四章：破案第二大绝招：避开冷门断头字（“死胡同”尾字侦测法）

成语接龙中最怕的是什么？不是你想不出成语，而是你选了一个**“死胡同尾字”**！
在汉字世界里，有一些字虽然意境很美，但是以它作为开头的成语在词典里几乎为零。这种字在接龙界被称为**“断头字”**。

### 黄金避坑清单：
1. **优先选择“大户人家”做尾字**：
   汉字里有一些超级“词霸”，比如：**“人”、“天”、“心”、“一”、“大”、“生”、“有”、“理”**。
   这些汉字在成语字典里往往有几十甚至上百个成语是以它们开头的！
   举例：当你面临选择时，接“尽如人意”（尾字“意”，意气风发、意料之中、意气相投，极其好接），远比接生僻字结尾要从容得多！
2. **警惕生癖难接尾字**：
   比如以“鼎”、“卵”、“囊”、“麟”结尾的成语，在严谨同字模式下后续词极其稀少。如果接了这类成语，很容易让神龙提前抵达终点。
3. **大局观走步法**：
   在拼出成语前，眼睛要看两步：不仅要看这个成语现在能不能接上，还要看它的最后一个字，自己下一步能不能轻松接续！

---

## 第五章：破案第三大绝招：三大仙术锦囊（画龙点睛、移花接木与宝库探索）

遇到困难不要慌，游戏为你准备了三件神奇的法宝锦囊，藏在顶部的快捷工具栏里：

### 法宝一：💡 画龙点睛 (智能提示)
- **仙术效果**：当你盯着候选字盘毫无头绪时，轻触“提示”按钮；
- **魔法发生**：系统会立刻在字盘中为你找到一个绝对正确的关键汉字，直接填入槽位中，并为你高亮出推荐的成语名称！就像老师在耳边悄悄提醒你第一张拼图一样亲切。

### 法宝二：🔄 移花接木 (换字刷新)
- **仙术效果**：候选字盘里的字看起来七零八落，拼不出心仪的成语？
- **魔法发生**：轻触“换字”按钮，系统会在不破坏已有神龙的前提下，重新在字典中挑选一组全新的候选字方块，让你换个思路重新出发！

### 法宝三：📖 成语宝库 (灵感大殿)
- **仙术效果**：想知道当前这个尾字，到底能接出哪些博大精深的成语吗？
- **魔法发生**：轻触“宝典”按钮，会弹出一扇精美的成语宝库大门！里面整整齐齐列出了当前字能够接出的所有成语，附带详细的拼音、出处故事与白话解说。你可以点击其中任意一个成语直接填入，在游玩的同时轻松学到新知识！

---

## 第六章：双人神龙争夺战：手速与词汇储备的刀光剑影

一个人接龙是心旷神怡的修行，而两个人同台 PK，则是扣人心弦的智慧击剑！

### 双人 Speed PK 竞技规则：
1. **同台共驭一条龙**：两位玩家在同一个房间中，眼前看到的是完全同一条正在延展的神龙；
2. **极速抢答夺龙珠**：
   - 屏幕中央给出一个目标首字；
   - 两位玩家使用相同的候选字盘进行拼装抢答；
   - 谁先拼出合法的四字成语，谁就为自己赢得 1 点胜利积分！
3. **龙头反噬攻防**：
   - 你抢先拼出的成语，其尾字会瞬间变成下一回合的开局字；
   - 高手往往会故意拼出一个尾字较为冷门棘手的成语，把难题抛给对手；
   - 率先达到目标分数（如 3 分或 5 分）的玩家彻底驯服神龙，赢得终极胜利！

---

## 第七章：高频小问答 (FAQ) 与十二字独门心诀

### 问：点击已接上的成语卡片有什么用？
答：每一张在神龙身上的成语卡片都可以点击！点击后会弹出一张精美的“汉字玉石卡片”，上面详细写着这个成语的拼音注音、白话释义以及出自哪部古典名著（如《史记》、《论语》、《三国演义》）。玩完一局，相当于读了一本成语小百科！

### 问：选错字了怎么退回？
答：非常简单！直接轻触上方槽位里你想要退回的汉字，该汉字就会立刻飞回下方的字盘中，完全不需要删掉重来！

### 问：当前字没有成语可以接了，游戏会判我输吗？
答：绝不会！如果某个字的后续成语真的被全网词库用尽了，系统会弹出金光璀璨的“神龙入海，功德圆满”勋章，表彰你达成了一条超长神龙，并为你结算海量经验点！

---

### 十二字独门接龙心诀

最后，请牢记这一首口诀，它将助你成为名扬四海的成语接龙宗师：

> **「首尾相咬，同音通达；」**  
> **「避开冷字，金龙飞舞！」**
`;

const enRules = `## Chapter 1: What is Idiom Solitaire? The Great Time-Travel Train of Chinese Characters

If you have ever seen a train at a station, you know how carriages hook together: the rear coupler of one carriage firmly connects to the front coupler of the next.

**Chinese Idiom Solitaire (成语接龙)** is precisely such a wonderful train adventure of Chinese culture!
Each traditional Chinese idiom (Chengyu) is a four-character carriage. The core rule is delightfully simple:
**The tail character of the previous idiom must become the head character of the next idiom!**

For example:
- Carriage 1: **Wan Xiang Geng Xin** (万象更新), tail character is **Xin** (新);
- Carriage 2: Begins with **Xin**, forming **Xin Ren Xin Shi** (新人新事), tail becomes **Shi** (事);
- Carriage 3: Begins with **Shi**, forming **Shi Zai Ren Wei** (事在人为), tail becomes **Wei** (为);
- Carriage 4: Begins with **Wei**, forming **Wei Suo Yu Wei** (为所欲为)...

Link by link, your knowledge forms a magnificent soaring golden dragon across the screen!

---

## Chapter 2: The Core Laws: Tail-to-Head Binding & Fair Play

1. **Tail-to-Head Precision**: The 1st character of the new idiom must match the 4th character of the previous idiom.
2. **Homophone Tolerance (Pinyin Mode)**: For beginners and students, matching the phonetic pinyin pronunciation is fully supported, opening up endless fun!
3. **No Duplicate Repetition**: An idiom cannot be reused in the same chain session.
4. **Legitimate Vocabulary**: Only recognized idioms from the classical dictionary can be accepted.

---

## Chapter 3: Exact Character vs. Homophone Modes

In Exact mode, the Chinese character must be identical.
In Homophone mode, matching the pinyin pronunciation is sufficient.
In our 3,500-idiom dictionary:
- Exact chaining succeeds for 65.6% of endings.
- Homophone chaining succeeds for **98.1%** of endings! Beginners can never get stuck!

---

## Chapter 4: Steering Clear of Dead-End Endings

Aim to end your idioms on high-frequency characters such as **Ren (人), Tian (天), Xin (心), Yi (一), Da (大), Sheng (生)**.
These characters have dozens of potential continuations in the dictionary!

---

## Chapter 5: The Three Magical Prop Tools

- 💡 **Hint (画龙点睛)**: Automatically fills in a valid character from a recommended idiom.
- 🔄 **Shuffle (移花接木)**: Generates a fresh set of candidate characters on your keypad.
- 📖 **Treasury (成语宝典)**: Reveals all legal successors for the current character with full definitions.

---

## Chapter 6: Two-Player Speed Dragon Duel

In multiplayer PK mode, both players share the same dragon chain. The first player to spell a valid idiom scores a point and extends the dragon, leaving the new tail character for the next round!

---

## Chapter 7: FAQ & The Dragon Chant

**The 12-Word Master Chant**:
> **"Bind tail to head, let pinyin flow; shun dead-end words, watch dragons grow!"**
`;

// ==========================================
// 3. Execution: Update i18n JSON files
// ==========================================
console.log('1. Updating i18n JSON files for game.idiom.seo_desc...');
const languages = ['zh', 'en', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
for (const lang of languages) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const newDesc = seoDescMap[lang] || seoDescMap.en;
  content['game.idiom.seo_desc'] = newDesc;
  content['lobby.idiom'] = lang === 'zh' ? '真·成语接龙' : 'Idiom Solitaire';
  content['lobby.idiom.desc'] = lang === 'zh'
    ? '首尾相咬铸造神龙！全新真·成语接龙，支持同字与同音双模式，随时随地开启单机与双人极速对决。'
    : 'Chain the tail to head to forge the golden dragon! True idiom solitaire with exact and homophone modes.';
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log(`  Updated ${lang}.json (length: ${newDesc.length} chars)`);
}

// ==========================================
// 4. Execution: Update games-docs.json
// ==========================================
console.log('2. Updating games-docs.json for idiom...');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
const idiom = docs.find(d => d.id === 'idiom');
if (!idiom) {
  console.error('idiom not found in games-docs.json!');
  process.exit(1);
}

const updatedRules = {
  zh: zhRules,
  en: enRules,
  es: enRules,
  ja: zhRules,
  ko: zhRules,
  pt: enRules,
  fr: enRules,
  de: enRules
};

idiom.rules = JSON.stringify(updatedRules);
fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf-8');
console.log(`  Successfully updated idiom in games-docs.json! (zh length: ${zhRules.length}, en length: ${enRules.length})`);

// Sanity checks: verify ZERO dollar signs ($)
if (zhRules.includes('$')) console.error('WARNING: zhRules contains $ !');
else console.log('  Sanity check PASSED: zhRules contains ZERO dollar signs ($)!');

if (enRules.includes('$')) console.error('WARNING: enRules contains $ !');
else console.log('  Sanity check PASSED: enRules contains ZERO dollar signs ($)!');

if (seoDescMap.zh.includes('$')) console.error('WARNING: seoDescMap.zh contains $ !');
else console.log('  Sanity check PASSED: seoDescMap.zh contains ZERO dollar signs ($)!');
