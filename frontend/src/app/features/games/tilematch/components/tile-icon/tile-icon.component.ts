import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tile-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tile-icon-wrapper" [attr.data-tile-type]="type">
      @switch (type) {
        @case ('bell') {
          <!-- 🔔 1. 经典黄铜小铃铛：圆润饱满双曲钟身，温润金铜渐变，深铜小音舌，无死白生硬反光线 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmBellBody" x1="15%" y1="10%" x2="85%" y2="90%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="25%" stop-color="#fcd34d"/>
                <stop offset="65%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#b45309"/>
              </linearGradient>
              <linearGradient id="tmBellRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#92400e"/>
                <stop offset="25%" stop-color="#fbbf24"/>
                <stop offset="75%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#78350b"/>
              </linearGradient>
              <radialGradient id="tmBellClapper" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#b45309"/>
                <stop offset="100%" stop-color="#451a03"/>
              </radialGradient>
            </defs>
            <!-- 铃铛顶环扣 -->
            <ellipse cx="24" cy="7.5" rx="4.5" ry="4" stroke="#b45309" stroke-width="2.2" fill="none"/>
            <rect x="21" y="9.5" width="6" height="3" rx="1.5" fill="#92400e"/>

            <!-- 底部伸出的圆球铜锤音舌 -->
            <circle cx="24" cy="38" r="4.2" fill="url(#tmBellClapper)" stroke="#451a03" stroke-width="1.2"/>
            <circle cx="22.8" cy="36.8" r="1.2" fill="#f59e0b" opacity="0.65"/>

            <!-- 铃铛钟身（饱满双弧优雅钟型） -->
            <path d="M24 11 C18 11 15 17 14 24 C13 29.5 10 32 8.5 34 C7.2 35.5 8.2 37.2 10.2 37.2 L37.8 37.2 C39.8 37.2 40.8 35.5 39.5 34 C38 32 35 29.5 34 24 C33 17 30 11 24 11 Z"
                  fill="url(#tmBellBody)" stroke="#92400e" stroke-width="1.8" stroke-linejoin="round"/>

            <!-- 侧面温和漫反射柔光（半透明无死白） -->
            <path d="M16 19 C15 23 14 27.5 12.5 32" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>

            <!-- 底部外展加厚凸起铜圈口 -->
            <rect x="8" y="35" width="32" height="4.2" rx="2.1" fill="url(#tmBellRim)" stroke="#78350b" stroke-width="1.4"/>
            <ellipse cx="24" cy="37" rx="13" ry="1.2" fill="#451a03" opacity="0.35"/>
          </svg>
        }

        @case ('glove') {
          <!-- 🧤 2. 温暖冬日连指小手套：经典醒目的红绿保暖连指棉手套，大拇指自然外展，掌心立体饱满带雪花纹，厚绒罗纹口，100% 杜绝看成鞋子 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmGloveBody" x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stop-color="#4ade80"/>
                <stop offset="40%" stop-color="#22c55e"/>
                <stop offset="85%" stop-color="#16a34a"/>
                <stop offset="100%" stop-color="#15803d"/>
              </linearGradient>
              <linearGradient id="tmGloveThumb" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#86efac"/>
                <stop offset="60%" stop-color="#22c55e"/>
                <stop offset="100%" stop-color="#15803d"/>
              </linearGradient>
              <linearGradient id="tmGloveCuff" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#f1f5f9"/>
              </linearGradient>
            </defs>
            <!-- 独立饱满大拇指（左侧自然外张，经典手套特征） -->
            <path d="M16 26 C11 25.5 8 20.5 10 16 C12 12 17 14 18.5 18 L19 24 Z"
                  fill="url(#tmGloveThumb)" stroke="#14532d" stroke-width="1.8" stroke-linejoin="round"/>
            <!-- 拇指根部柔和阴影折痕 -->
            <path d="M17.5 19.5 C17 22.5 16 25 14.5 27" stroke="#14532d" stroke-width="1.2" stroke-linecap="round"/>

            <!-- 手套掌心主体（圆润饱满连指轮廓） -->
            <path d="M18 34 C14 34 13.5 30 13.5 24 C13.5 15 15.5 7 21 5 C26.5 3 32 7 34 12 C35.5 16 35.5 25 34.5 30 C34 34 29 34 26 34 Z"
                  fill="url(#tmGloveBody)" stroke="#14532d" stroke-width="1.8" stroke-linejoin="round"/>

            <!-- 掌心经典白色北欧冬日雪花刺绣印花 -->
            <g stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.9">
              <line x1="25" y1="14" x2="25" y2="24"/>
              <line x1="20" y1="19" x2="30" y2="19"/>
              <line x1="21.5" y1="15.5" x2="28.5" y2="22.5"/>
              <line x1="21.5" y1="22.5" x2="28.5" y2="15.5"/>
            </g>

            <!-- 柔和侧光面 -->
            <path d="M22 8 C25 6 30 9 31.5 14" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.45"/>

            <!-- 手腕处加厚羊羔绒白色罗纹卷边（彻底打破筒靴外形） -->
            <rect x="12" y="32" width="24" height="8" rx="4" fill="url(#tmGloveCuff)" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="18" y1="34" x2="18" y2="38" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="24" y1="34" x2="24" y2="38" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="30" y1="34" x2="30" y2="38" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        }

        @case ('fire') {
          <!-- 🔥 3. 真实生动跃动烈火：去除底座散乱火柴棍，纯正三维跳跃火羽，炽热红橙金黄多层火核，一眼即识烈火 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmFireOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#b91c1c"/>
                <stop offset="30%" stop-color="#dc2626"/>
                <stop offset="70%" stop-color="#ea580c"/>
                <stop offset="100%" stop-color="#f97316"/>
              </linearGradient>
              <linearGradient id="tmFireMid" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#f97316"/>
                <stop offset="55%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#fbbf24"/>
              </linearGradient>
              <linearGradient id="tmFireCore" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#fbbf24"/>
                <stop offset="100%" stop-color="#fef08a"/>
              </linearGradient>
            </defs>
            <!-- 外层烈火主轮廓（三维饱满舞动火羽） -->
            <path d="M24 4 C27 10 32 14 36 21 C40 28 39 36 33 41 C27 45 19 45 14 40 C9 35 9 27 13 20 C14 24 17 26 18 22 C19 17 23 11 24 4 Z"
                  fill="url(#tmFireOuter)" stroke="#991b1b" stroke-width="1.6" stroke-linejoin="round"/>

            <!-- 中层金黄跃动火苗 -->
            <path d="M24 15 C27 20 31 24 32 30 C33 36 29 40 24 40 C19 40 16 36 17 31 C17 26 21 23 21 19 C22 22 23 23 24 15 Z"
                  fill="url(#tmFireMid)" stroke="#d97706" stroke-width="1.2"/>

            <!-- 内层炽白金亮火核 -->
            <path d="M24 26 C26.5 29 28 32 27.5 35 C27 38 25.5 39 24 39 C22.5 39 21 38 20.5 35 C20 32 21.5 29 24 26 Z"
                  fill="url(#tmFireCore)"/>

            <!-- 升腾微火星 -->
            <circle cx="28" cy="6" r="1.3" fill="#fbbf24"/>
            <circle cx="15.5" cy="11.5" r="1.1" fill="#f97316"/>
          </svg>
        }

        @case ('carrot') {
          <!-- 🥕 4. 水灵鲜嫩胡萝卜：饱满橙红胡萝卜，表皮自然微凹环纹，顶部三叉羽状翠绿菜缨 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmCarrotBody" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stop-color="#fb923c"/>
                <stop offset="50%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="#c2410c"/>
              </linearGradient>
            </defs>
            <!-- 顶部翠绿分叉菜缨 -->
            <g transform="translate(29, 8)">
              <path d="M0 9 C-3 3 -3 -3 3 -5 C6 0 5 5 0 9 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
              <path d="M1 9 C4 2 9 -1 11 3 C9 7 4 8 1 9 Z" fill="#16a34a" stroke="#14532d" stroke-width="1.2"/>
              <path d="M-1 10 C-6 6 -6 2 -4 0 C-1 0 0 5 -1 10 Z" fill="#4ade80" stroke="#16a34a" stroke-width="1.2"/>
            </g>

            <!-- 倾斜饱满胡萝卜根身 -->
            <path d="M33 13 C37 17 35 22 31 25.5 L12 41 C9.5 43 7 41.5 7.5 38.5 L20 18 C23 13 28 9.5 33 13 Z"
                  fill="url(#tmCarrotBody)" stroke="#9a3412" stroke-width="1.8" stroke-linejoin="round"/>

            <!-- 柔和微凹表皮横纹 -->
            <path d="M28 17 C26 18 24 19.5 23 19.5" stroke="#7c2d12" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
            <path d="M24 23 C22 24 20 25.5 19 25.5" stroke="#7c2d12" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
            <path d="M19 29 C17 30 15 31.5 14 31.5" stroke="#7c2d12" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
            <!-- 顶部柔和微亮面 -->
            <path d="M30 14 C27 15 24 17 22 20" stroke="#fed7aa" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
          </svg>
        }

        @case ('grass') {
          <!-- 🌿 5. 自然治愈青翠小枝叶：饱满舒展嫩叶，清晰自然的细叶脉，生机盎然 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmLeafMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4ade80"/>
                <stop offset="60%" stop-color="#22c55e"/>
                <stop offset="100%" stop-color="#15803d"/>
              </linearGradient>
            </defs>
            <!-- 自然微弯小枝干 -->
            <path d="M10 39 C17 34 25 24 35 12" stroke="#4d7c0f" stroke-width="2.6" stroke-linecap="round"/>

            <!-- 顶端嫩叶 -->
            <path d="M35 12 C34 5.5 41 5 43 7.5 C43.5 12 39.5 15.5 35 12 Z"
                  fill="url(#tmLeafMain)" stroke="#15803d" stroke-width="1.4"/>
            <path d="M35 12 C37.5 9 40.5 8 42 8" stroke="#bbf7d0" stroke-width="1.1" stroke-linecap="round"/>

            <!-- 右侧饱满叶片 -->
            <path d="M28 20 C35 18 39 21.5 39 25.5 C34.5 29 29.5 25.5 28 20 Z"
                  fill="url(#tmLeafMain)" stroke="#15803d" stroke-width="1.4"/>
            <path d="M29 21 C33.5 21.5 36 23.5 37 25" stroke="#bbf7d0" stroke-width="1.1" stroke-linecap="round"/>

            <!-- 左侧侧展叶片 -->
            <path d="M22 27.5 C15.5 25.5 13.5 19.5 15.5 16.5 C21 15.5 23.5 21.5 22 27.5 Z"
                  fill="url(#tmLeafMain)" stroke="#15803d" stroke-width="1.4"/>
            <path d="M21 25.5 C19 22.5 17 19.5 17 17.5" stroke="#86efac" stroke-width="1.1" stroke-linecap="round"/>

            <!-- 底部小侧芽 -->
            <path d="M16 34.5 C11 32.5 11 26.5 14 25.5 C18.5 26.5 18.5 30.5 16 34.5 Z"
                  fill="#16a34a" stroke="#14532d" stroke-width="1.3"/>
          </svg>
        }

        @case ('wood') {
          <!-- 🪵 6. 3D 原木树段：立体斜卧小圆木，层层同心年轮横截面，自然裂纹与粗糙厚树皮，质感温润逼真 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tmBarkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#542505"/>
                <stop offset="35%" stop-color="#78350b"/>
                <stop offset="70%" stop-color="#92400e"/>
                <stop offset="100%" stop-color="#451a03"/>
              </linearGradient>
            </defs>
            <!-- 树桩圆柱身躯 -->
            <path d="M9 20 L9 32 C9 37 39 37 39 32 L39 20 Z" fill="url(#tmBarkGrad)" stroke="#451a03" stroke-width="1.8"/>
            <!-- 侧面树皮粗糙细纹 -->
            <line x1="17" y1="23" x2="17" y2="34" stroke="#451a03" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="27" y1="24" x2="27" y2="33" stroke="#451a03" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="33" y1="23" x2="33" y2="31" stroke="#451a03" stroke-width="1.2" stroke-linecap="round"/>

            <!-- 顶部倾斜年轮横截面 -->
            <ellipse cx="24" cy="19.5" rx="15" ry="8" fill="#d97706" stroke="#451a03" stroke-width="1.8"/>
            <!-- 年轮 1 -->
            <ellipse cx="24" cy="19.5" rx="11" ry="5.8" fill="#f59e0b" stroke="#78350b" stroke-width="1.2"/>
            <!-- 年轮 2 -->
            <ellipse cx="24" cy="19.5" rx="6.5" ry="3.4" fill="#fde68a" stroke="#92400e" stroke-width="1.1"/>
            <!-- 年轮中心与微木裂 -->
            <circle cx="24" cy="19.5" r="1.5" fill="#78350b"/>
            <path d="M24 19.5 L28.5 17 M24 19.5 L25 23" stroke="#78350b" stroke-width="1.1" stroke-linecap="round"/>
          </svg>
        }

        @case ('wool') {
          <!-- 🧶 7. 温暖毛线球：交叉缠绕的立体毛线纹理，散出的柔韧弯曲线头 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="tmWoolGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#fb7185"/>
                <stop offset="60%" stop-color="#e11d48"/>
                <stop offset="100%" stop-color="#9f1239"/>
              </radialGradient>
            </defs>
            <!-- 主球体 -->
            <circle cx="22" cy="23" r="15" fill="url(#tmWoolGrad)" stroke="#881337" stroke-width="1.8"/>
            <!-- 缠绕立体毛线弧（深浅呼应） -->
            <path d="M10 18 C15 13 27 13 33 20" stroke="#fecdd3" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M9 25 C15 22 28 23 35 27" stroke="#fda4af" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M13 31 C19 34 27 33 32 29" stroke="#881337" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M18 10 C23 16 23 28 20 36" stroke="#fda4af" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M25 10 C29 18 29 27 27 35" stroke="#881337" stroke-width="2" stroke-linecap="round" fill="none"/>
            <!-- 散出自然柔韧线头 -->
            <path d="M32 30 C37 34 40 37 40 41 C40 43 37 42 35 40" stroke="#e11d48" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            <circle cx="34" cy="40" r="1.5" fill="#f43f5e"/>
          </svg>
        }

        @case ('cabbage') {
          <!-- 🥬 8. 水灵圆白菜：多层层叠卷曲的菜叶与淡绿菜帮 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="24" cy="26" rx="14.5" ry="15" fill="#86efac" stroke="#15803d" stroke-width="1.8"/>
            <!-- 外层翻卷菜叶 -->
            <path d="M11 23 C13 13 35 13 37 23 C37 33 31 39 24 40 C17 39 11 33 11 23 Z" fill="#4ade80" stroke="#15803d" stroke-width="1.5"/>
            <!-- 内部紧实嫩叶 -->
            <path d="M17 20 C19 15 29 15 31 20 C31 29 27 35 24 36 C21 35 17 29 17 20 Z" fill="#bbf7d0" stroke="#16a34a" stroke-width="1.3"/>
            <!-- 中央主叶脉 -->
            <line x1="24" y1="18" x2="24" y2="36" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M24 24 L27 22 M24 28 L28 26 M24 24 L21 22 M24 28 L20 26" stroke="#16a34a" stroke-width="1.1" stroke-linecap="round"/>
          </svg>
        }

        @case ('bucket') {
          <!-- 🪣 9. 农家小水桶：金属小提梁、清澈碧蓝水光与双层箍圈 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 弧形小提把 -->
            <path d="M12 21 C12 11 36 11 36 21" stroke="#64748b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <!-- 桶身 -->
            <path d="M11 21 L15 39 C15 41 33 41 33 39 L37 21 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.8" stroke-linejoin="round"/>
            <!-- 桶口金属圈 -->
            <ellipse cx="24" cy="21" rx="13" ry="3.5" fill="#0284c7" stroke="#0369a1" stroke-width="1.3"/>
            <!-- 桶内水面微波 -->
            <ellipse cx="24" cy="22" rx="11" ry="2.5" fill="#7dd3fc"/>
            <ellipse cx="24" cy="22.5" rx="7" ry="1.2" fill="#e0f2fe" opacity="0.7"/>
            <!-- 桶身横梁铁箍 -->
            <line x1="13.5" y1="30" x2="34.5" y2="30" stroke="#0369a1" stroke-width="1.4"/>
          </svg>
        }

        @case ('scissors') {
          <!-- ✂️ 10. 园艺大剪刀：交错的银灰不锈钢刀刃、铆钉螺栓、大红双指环 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 上刀刃 -->
            <path d="M19 24 L35 9 C36.5 8 38 9 37 11 L23 27 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.3"/>
            <!-- 下刀刃 -->
            <path d="M19 24 L35 39 C36.5 40 38 39 37 37 L23 21 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.3"/>
            <!-- 轴心金属铆钉 -->
            <circle cx="21" cy="24" r="2.2" fill="#334155" stroke="#1e293b" stroke-width="0.8"/>
            <!-- 红色舒适双指环 -->
            <ellipse cx="13" cy="17" rx="5.5" ry="4.5" stroke="#dc2626" stroke-width="2.6" fill="none"/>
            <ellipse cx="13" cy="31" rx="5.5" ry="4.5" stroke="#dc2626" stroke-width="2.6" fill="none"/>
          </svg>
        }

        @case ('milk') {
          <!-- 🍼 11. 经典牧场牛奶瓶：纯净玻璃奶瓶，天蓝瓶塞，香浓牛奶 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 顶部蓝色瓶塞 -->
            <rect x="18" y="9" width="12" height="4.5" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="1.2"/>
            <!-- 玻璃瓶身 -->
            <path d="M21 13.5 L27 13.5 L30 19 L30 38 C30 40.5 18 40.5 18 38 L18 19 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.8" stroke-linejoin="round"/>
            <!-- 纯白牛奶液面 -->
            <path d="M19 23 C23 25 25 22 29 24 L29 38 C29 39.5 19 39.5 19 38 Z" fill="#e2e8f0"/>
            <!-- 牧场天蓝标签 -->
            <rect x="19.5" y="27" width="9" height="7" rx="1.5" fill="#bae6fd" stroke="#0284c7" stroke-width="0.8"/>
            <circle cx="24" cy="30.5" r="1.8" fill="#0284c7"/>
          </svg>
        }

        @case ('brush') {
          <!-- 🧹 12. 稻草小扫帚：结实木长柄、扎红绳、金黄分丝扫帚头 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 倾斜原木长柄 -->
            <line x1="10" y1="10" x2="27" y2="27" stroke="#78350b" stroke-width="3.5" stroke-linecap="round"/>
            <!-- 扎红绳部分 -->
            <line x1="25" y1="28" x2="28" y2="25" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
            <!-- 稻草扫帚头 -->
            <path d="M27 27 L39 35 C40 38 37 41 33 40 L25 29 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.6" stroke-linejoin="round"/>
            <!-- 扫帚丝分线 -->
            <line x1="28" y1="30" x2="35" y2="39" stroke="#b45309" stroke-width="1" stroke-linecap="round"/>
            <line x1="31" y1="29" x2="37" y2="36" stroke="#b45309" stroke-width="1" stroke-linecap="round"/>
          </svg>
        }

        @case ('sheep') {
          <!-- 🐑 13. 软萌白云小绵羊：圆滚滚毛绒身，小黑蹄，可爱呆萌小脸 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 四只黑色小羊蹄 -->
            <line x1="16" y1="33" x2="16" y2="40" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="21" y1="33" x2="21" y2="40" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="28" y1="33" x2="28" y2="40" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="33" y1="33" x2="33" y2="40" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>
            <!-- 蓬松白云羊毛身躯 -->
            <ellipse cx="25" cy="25" rx="14.5" ry="11.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
            <!-- 可爱深黑羊头 -->
            <ellipse cx="14" cy="22" rx="5.5" ry="6.5" fill="#1e293b"/>
            <!-- 萌萌小羊耳 -->
            <ellipse cx="10" cy="18" rx="2.5" ry="1.6" fill="#fb7185" transform="rotate(-25 10 18)"/>
            <!-- 灵动白眼球 -->
            <circle cx="13" cy="21" r="1.3" fill="#ffffff"/>
            <circle cx="13" cy="21" r="0.6" fill="#0f172a"/>
          </svg>
        }

        @case ('corn') {
          <!-- 🌽 14. 饱满金黄玉米：翻卷淡青苞叶，金灿饱满玉米粒列阵 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 两侧翻卷的绿玉米苞叶 -->
            <path d="M14 40 C15 29 13 19 10 14 C17 19 20 28 20 40 Z" fill="#86efac" stroke="#16a34a" stroke-width="1.3"/>
            <path d="M34 40 C33 29 35 19 38 14 C31 19 28 28 28 40 Z" fill="#86efac" stroke="#16a34a" stroke-width="1.3"/>
            <!-- 金黄玉米穗主体 -->
            <path d="M24 9 C19 13 19 32 21 40 L27 40 C29 32 29 13 24 9 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.6"/>
            <!-- 玉米粒网格线 -->
            <line x1="24" y1="13" x2="24" y2="39" stroke="#d97706" stroke-width="1.2" stroke-dasharray="2.5 2"/>
            <line x1="20" y1="21" x2="28" y2="21" stroke="#d97706" stroke-width="1.2"/>
            <line x1="20" y1="27" x2="28" y2="27" stroke="#d97706" stroke-width="1.2"/>
            <line x1="21" y1="33" x2="27" y2="33" stroke="#d97706" stroke-width="1.2"/>
          </svg>
        }

        @case ('apple') {
          <!-- 🍎 15. 鲜红大苹果：圆润果身、棕色果柄、微翘小绿叶、柔和漫射面 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 棕色小果柄 -->
            <path d="M24 15 C24 9 27 6 30 5" stroke="#78350b" stroke-width="2.2" stroke-linecap="round"/>
            <!-- 顶端小嫩叶 -->
            <path d="M26 10 C31 8 33 11 32 13 C28 14 26 12 26 10 Z" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
            <!-- 饱满苹果果身 -->
            <path d="M24 16 C19.5 13.5 11.5 15.5 11.5 25 C11.5 34.5 18.5 39.5 24 37 C29.5 39.5 36.5 34.5 36.5 25 C36.5 15.5 28.5 13.5 24 16 Z"
                  fill="#ef4444" stroke="#b91c1c" stroke-width="1.8" stroke-linejoin="round"/>
            <!-- 柔和月牙光晕 -->
            <ellipse cx="18" cy="21" rx="2.5" ry="4.5" fill="#f87171" transform="rotate(-22 18 21)" opacity="0.8"/>
          </svg>
        }

        @case ('mushroom') {
          <!-- 🍄 16. 童话波点小红菇：圆滚红白波点伞盖，胖乎乎米白菇柄 -->
          <svg viewBox="0 0 48 48" class="tile-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 胖圆菇柄 -->
            <path d="M19 25 L16.5 38 C16.5 40.5 31.5 40.5 31.5 38 L29 25 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.8"/>
            <!-- 伞盖下沿阴影 -->
            <ellipse cx="24" cy="26" rx="14" ry="2" fill="#cbd5e1"/>
            <!-- 半球形红色大伞盖 -->
            <path d="M9 26 C9 15 39 15 39 26 C39 28 9 28 9 26 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.8"/>
            <!-- 伞面圆白点 -->
            <circle cx="24" cy="20" r="3" fill="#ffffff"/>
            <circle cx="15.5" cy="22.5" r="2.2" fill="#ffffff"/>
            <circle cx="32.5" cy="22.5" r="2.2" fill="#ffffff"/>
          </svg>
        }

        @default {
          <span class="tile-fallback-emoji">{{ fallbackEmoji }}</span>
        }
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .tile-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 2px;
    }

    .tile-svg {
      width: 100%;
      height: 100%;
      max-width: 48px;
      max-height: 48px;
      object-fit: contain;
      filter: drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.16));
    }

    @media (max-width: 639px) {
      .tile-svg {
        max-width: 42px;
        max-height: 42px;
      }
    }

    .tile-fallback-emoji {
      font-size: 32px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    @media (max-width: 639px) {
      .tile-fallback-emoji {
        font-size: 26px;
      }
    }
  `]
})
export class TileIconComponent {
  @Input({ required: true }) type!: string;
  @Input() fallbackEmoji: string = '❓';
}

