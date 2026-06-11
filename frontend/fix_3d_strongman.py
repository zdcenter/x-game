import os

file_path = "src/app/features/games/sokoban/components/board/sokoban-board.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace CSS
css_start = content.find("      /* Walking Keyframes */")
css_end = content.find("    </style>", css_start)
if css_end == -1:
    css_end = content.find("    .facing-left", css_start)
    if css_end == -1:
        css_end = content.find("  `],", css_start)

# Notice I removed the `transition: transform 0.2s ease;` from `.player-wrapper` in the CSS replacement.
# Wait, `.player-wrapper` CSS is BEFORE `/* Walking Keyframes */`.
# Let's replace from `.player-wrapper` to the end of CSS.
css_start_full = content.find("    .player-wrapper {")
if css_start_full != -1:
    css_start = css_start_full

new_css = """    .player-wrapper {
      /* Removed transition on transform to prevent flip lag */
    }
    .player-wrapper.facing-left {
      transform: scaleX(-1);
    }
    
    /* Walking Keyframes */
    @keyframes walk-y-l { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes walk-y-r { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes walk-rot-l { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(35deg); } 75% { transform: rotate(-35deg); } }
    @keyframes walk-rot-r { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-35deg); } 75% { transform: rotate(35deg); } }
    
    .action-walk .view-down .leg-l, .action-walk .view-up .leg-l { animation: walk-y-l 0.25s ease-in-out infinite; }
    .action-walk .view-down .leg-r, .action-walk .view-up .leg-r { animation: walk-y-r 0.25s ease-in-out infinite 0.12s; }
    .action-walk .view-down .arm-l, .action-walk .view-up .arm-l { animation: walk-y-l 0.25s ease-in-out infinite 0.12s; }
    .action-walk .view-down .arm-r, .action-walk .view-up .arm-r { animation: walk-y-r 0.25s ease-in-out infinite; }

    .action-walk .view-side .leg-l { animation: walk-rot-l 0.25s ease-in-out infinite; }
    .action-walk .view-side .leg-r { animation: walk-rot-r 0.25s ease-in-out infinite; }
    .action-walk .view-side .arm-l { animation: walk-rot-r 0.25s ease-in-out infinite; }
    .action-walk .view-side .arm-r { animation: walk-rot-l 0.25s ease-in-out infinite; }

    /* Push DOWN */
    .action-push .view-down .arm-l { transform: scaleY(1.2) translateY(5px); }
    .action-push .view-down .arm-r { transform: scaleY(1.2) translateY(5px); }
    .action-push .view-down .body-core, .action-push .view-down .head { transform: translateY(8px); }

    /* Push UP */
    .action-push .view-up .arm-l, .action-push .view-up .arm-r { transform: scaleY(-1) translateY(10px); }
    .action-push .view-up .body-core, .action-push .view-up .head { transform: translateY(-8px); }

    /* Push SIDE */
    @keyframes side-push-arm {
      0%, 100% { transform: rotate(-80deg); }
      50% { transform: rotate(-95deg) scaleY(1.1); }
    }
    @keyframes side-push-body {
      0%, 100% { transform: rotate(10deg) translateX(4px); }
      50% { transform: rotate(18deg) translateX(10px); }
    }
    .action-push .view-side .arm-l, .action-push .view-side .arm-r { animation: side-push-arm 0.3s ease-in-out infinite; }
    .action-push .view-side .body-core, .action-push .view-side .head { animation: side-push-body 0.3s ease-in-out infinite; }
"""
if css_start != -1 and css_end != -1:
    content = content[:css_start] + new_css + content[css_end:]

# 2. Replace SVG
svg_start = content.find("<svg viewBox=\"0 0 100 100\" class=\"w-full h-full drop-shadow-xl overflow-visible\">")
svg_end = content.find("</svg>", svg_start)

new_svg = """<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl overflow-visible">
                      <defs>
                        <!-- 3D Gradients for Skin -->
                        <radialGradient id="headGrad" cx="35%" cy="35%" r="65%">
                          <stop offset="0%" stop-color="#fde047"/>
                          <stop offset="50%" stop-color="#fb923c"/>
                          <stop offset="100%" stop-color="#c2410c"/>
                        </radialGradient>
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#c2410c"/>
                          <stop offset="20%" stop-color="#fb923c"/>
                          <stop offset="50%" stop-color="#fde047"/>
                          <stop offset="80%" stop-color="#fb923c"/>
                          <stop offset="100%" stop-color="#c2410c"/>
                        </linearGradient>
                        <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#c2410c"/>
                          <stop offset="50%" stop-color="#fb923c"/>
                          <stop offset="100%" stop-color="#9a3412"/>
                        </linearGradient>
                        <radialGradient id="fistGrad" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stop-color="#fde047"/>
                          <stop offset="70%" stop-color="#fb923c"/>
                          <stop offset="100%" stop-color="#9a3412"/>
                        </radialGradient>
                        
                        <!-- 3D Gradients for Clothes -->
                        <linearGradient id="pantsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#1e3a8a"/>
                          <stop offset="50%" stop-color="#3b82f6"/>
                          <stop offset="100%" stop-color="#1e3a8a"/>
                        </linearGradient>
                        <linearGradient id="beltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stop-color="#334155"/>
                          <stop offset="50%" stop-color="#0f172a"/>
                          <stop offset="100%" stop-color="#020617"/>
                        </linearGradient>
                        <radialGradient id="buckleGrad" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stop-color="#fef08a"/>
                          <stop offset="50%" stop-color="#eab308"/>
                          <stop offset="100%" stop-color="#854d0e"/>
                        </radialGradient>
                        <linearGradient id="shoeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stop-color="#64748b"/>
                          <stop offset="100%" stop-color="#1e293b"/>
                        </linearGradient>
                        <!-- Hair Gradient -->
                        <radialGradient id="hairGrad" cx="40%" cy="20%" r="80%">
                          <stop offset="0%" stop-color="#3f3f46"/>
                          <stop offset="60%" stop-color="#09090b"/>
                          <stop offset="100%" stop-color="#000000"/>
                        </radialGradient>
                      </defs>

                      <!-- VIEW DOWN -->
                      <g class="view-down" [class.hidden]="playerDir() !== 'down'">
                        <g class="arm-l" style="transform-origin: 30px 45px;">
                          <path d="M 30 45 Q 15 50 20 75" fill="none" stroke="url(#armGrad)" stroke-width="14" stroke-linecap="round" />
                          <circle cx="20" cy="75" r="8" fill="url(#fistGrad)" />
                        </g>
                        <g class="arm-r" style="transform-origin: 70px 45px;">
                          <path d="M 70 45 Q 85 50 80 75" fill="none" stroke="url(#armGrad)" stroke-width="14" stroke-linecap="round" />
                          <circle cx="80" cy="75" r="8" fill="url(#fistGrad)" />
                        </g>
                        <g class="leg-l" style="transform-origin: 40px 80px;">
                          <path d="M 40 80 L 40 95" fill="none" stroke="url(#armGrad)" stroke-width="12" stroke-linecap="round" />
                          <path d="M 34 92 L 46 92 L 46 100 L 34 100 Z" fill="url(#shoeGrad)" rx="3" />
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 80px;">
                          <path d="M 60 80 L 60 95" fill="none" stroke="url(#armGrad)" stroke-width="12" stroke-linecap="round" />
                          <path d="M 54 92 L 66 92 L 66 100 L 54 100 Z" fill="url(#shoeGrad)" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <!-- Big muscular chest -->
                          <path d="M 25 40 Q 50 25 75 40 L 65 75 L 35 75 Z" fill="url(#bodyGrad)" />
                          <path d="M 35 55 Q 45 62 50 55 Q 55 62 65 55" fill="none" stroke="#9a3412" stroke-width="2" stroke-linecap="round" />
                          <!-- Abs -->
                          <line x1="50" y1="58" x2="50" y2="70" stroke="#9a3412" stroke-width="2" stroke-linecap="round" />
                          <line x1="43" y1="64" x2="57" y2="64" stroke="#9a3412" stroke-width="2" stroke-linecap="round" />
                          
                          <path d="M 35 75 L 65 75 L 65 85 L 55 85 L 50 78 L 45 85 L 35 85 Z" fill="url(#pantsGrad)" />
                          <rect x="33" y="72" width="34" height="7" fill="url(#beltGrad)" rx="2" />
                          <rect x="43" y="70" width="14" height="11" fill="url(#buckleGrad)" rx="3" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <!-- Round head -->
                          <circle cx="50" cy="25" r="16" fill="url(#headGrad)" />
                          <!-- Nice 3D hair (pompadour style) -->
                          <path d="M 34 25 Q 30 5 50 5 Q 70 5 66 25 Q 60 15 50 15 Q 40 15 34 25 Z" fill="url(#hairGrad)" />
                          <circle cx="43" cy="25" r="2.5" fill="#000" />
                          <circle cx="57" cy="25" r="2.5" fill="#000" />
                          <line x1="38" y1="21" x2="47" y2="23" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
                          <line x1="62" y1="21" x2="53" y2="23" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
                          <path d="M 45 33 Q 50 30 55 33" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" />
                          <!-- Rounded goatee -->
                          <path d="M 46 35 Q 50 42 54 35 Z" fill="url(#hairGrad)" />
                        </g>
                      </g>

                      <!-- VIEW UP -->
                      <g class="view-up" [class.hidden]="playerDir() !== 'up'">
                        <g class="arm-l" style="transform-origin: 30px 45px;">
                          <path d="M 30 45 Q 15 50 20 75" fill="none" stroke="url(#armGrad)" stroke-width="14" stroke-linecap="round" />
                          <circle cx="20" cy="75" r="8" fill="url(#fistGrad)" />
                        </g>
                        <g class="arm-r" style="transform-origin: 70px 45px;">
                          <path d="M 70 45 Q 85 50 80 75" fill="none" stroke="url(#armGrad)" stroke-width="14" stroke-linecap="round" />
                          <circle cx="80" cy="75" r="8" fill="url(#fistGrad)" />
                        </g>
                        <g class="leg-l" style="transform-origin: 40px 80px;">
                          <path d="M 40 80 L 40 95" fill="none" stroke="url(#armGrad)" stroke-width="12" stroke-linecap="round" />
                          <path d="M 34 92 L 46 92 L 46 100 L 34 100 Z" fill="url(#shoeGrad)" rx="3" />
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 80px;">
                          <path d="M 60 80 L 60 95" fill="none" stroke="url(#armGrad)" stroke-width="12" stroke-linecap="round" />
                          <path d="M 54 92 L 66 92 L 66 100 L 54 100 Z" fill="url(#shoeGrad)" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <path d="M 25 40 Q 50 25 75 40 L 65 75 L 35 75 Z" fill="url(#bodyGrad)" />
                          <path d="M 40 45 Q 50 55 50 70 M 60 45 Q 50 55 50 70" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" />
                          <path d="M 35 75 L 65 75 L 65 85 L 55 85 L 50 78 L 45 85 L 35 85 Z" fill="url(#pantsGrad)" />
                          <rect x="33" y="73" width="34" height="6" fill="url(#beltGrad)" rx="2" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <circle cx="50" cy="25" r="16" fill="url(#headGrad)" />
                          <!-- Full back hair -->
                          <path d="M 34 25 Q 34 5 50 5 Q 66 5 66 25 L 62 32 Q 50 38 38 32 Z" fill="url(#hairGrad)" />
                        </g>
                      </g>

                      <!-- VIEW SIDE -->
                      <g class="view-side" [class.hidden]="playerDir() !== 'left' && playerDir() !== 'right'">
                        <g class="arm-l" style="transform-origin: 45px 45px;">
                          <path d="M 45 45 L 45 75" fill="none" stroke="#c2410c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="45" cy="75" r="8" fill="#c2410c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 45px 80px;">
                          <path d="M 45 80 L 45 95" fill="none" stroke="#c2410c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 39 92 L 55 92 L 55 100 L 39 100 Z" fill="#1e293b" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <path d="M 35 45 Q 65 35 68 55 L 55 75 L 40 75 Z" fill="url(#bodyGrad)" />
                          <path d="M 68 55 Q 60 55 55 50" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" />
                          <path d="M 40 75 L 55 75 L 55 85 L 40 85 Z" fill="url(#pantsGrad)" />
                          <rect x="38" y="73" width="19" height="6" fill="url(#beltGrad)" rx="2" />
                          <rect x="53" y="71" width="6" height="10" fill="url(#buckleGrad)" rx="2" />
                        </g>
                        <g class="leg-r" style="transform-origin: 55px 80px;">
                          <path d="M 55 80 L 55 95" fill="none" stroke="url(#armGrad)" stroke-width="12" stroke-linecap="round" />
                          <path d="M 49 92 L 68 92 L 68 100 L 49 100 Z" fill="url(#shoeGrad)" rx="3" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <circle cx="50" cy="25" r="16" fill="url(#headGrad)" />
                          <!-- Rounded Nose -->
                          <path d="M 62 22 Q 72 25 64 28 Z" fill="url(#headGrad)" />
                          <!-- Proper 3D Rounded Hair instead of flat rect -->
                          <path d="M 35 25 Q 35 5 55 5 Q 65 5 65 18 Q 50 15 35 25 Z" fill="url(#hairGrad)" />
                          <!-- Sideburns -->
                          <path d="M 38 22 L 44 22 L 44 32 L 38 30 Z" fill="url(#hairGrad)" />
                          <circle cx="58" cy="23" r="2.5" fill="#000" />
                          <line x1="53" y1="19" x2="62" y2="21" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
                          <!-- Goatee -->
                          <path d="M 64 32 Q 66 36 58 38 Q 56 36 60 32 Z" fill="url(#hairGrad)" />
                        </g>
                        <g class="arm-r" style="transform-origin: 50px 45px;">
                          <path d="M 50 45 L 50 75" fill="none" stroke="url(#armGrad)" stroke-width="14" stroke-linecap="round" />
                          <circle cx="50" cy="75" r="8" fill="url(#fistGrad)" />
                        </g>
                      </g>
"""

if svg_start != -1 and svg_end != -1:
    content = content[:svg_start] + new_svg + content[svg_end:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied 3D Gradients and fixed flat head/lag.")
