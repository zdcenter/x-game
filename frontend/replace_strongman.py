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

new_css = """      /* Walking Keyframes */
    @keyframes walk-y-l { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes walk-y-r { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes walk-rot-l { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(35deg); } 75% { transform: rotate(-35deg); } }
    @keyframes walk-rot-r { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-35deg); } 75% { transform: rotate(35deg); } }
    
    .action-walk .view-down .leg-l, .action-walk .view-up .leg-l { animation: walk-y-l 0.3s ease-in-out infinite; }
    .action-walk .view-down .leg-r, .action-walk .view-up .leg-r { animation: walk-y-r 0.3s ease-in-out infinite 0.15s; }
    .action-walk .view-down .arm-l, .action-walk .view-up .arm-l { animation: walk-y-l 0.3s ease-in-out infinite 0.15s; }
    .action-walk .view-down .arm-r, .action-walk .view-up .arm-r { animation: walk-y-r 0.3s ease-in-out infinite; }

    .action-walk .view-side .leg-l { animation: walk-rot-l 0.3s ease-in-out infinite; }
    .action-walk .view-side .leg-r { animation: walk-rot-r 0.3s ease-in-out infinite; }
    .action-walk .view-side .arm-l { animation: walk-rot-r 0.3s ease-in-out infinite; }
    .action-walk .view-side .arm-r { animation: walk-rot-l 0.3s ease-in-out infinite; }

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
    .action-push .view-side .arm-l, .action-push .view-side .arm-r { animation: side-push-arm 0.4s ease-in-out infinite; }
    .action-push .view-side .body-core, .action-push .view-side .head { animation: side-push-body 0.4s ease-in-out infinite; }
"""
if css_start != -1 and css_end != -1:
    content = content[:css_start] + new_css + content[css_end:]

# 2. Replace SVG
svg_start = content.find("<svg viewBox=\"0 0 100 100\" class=\"w-full h-full drop-shadow-xl overflow-visible\">")
svg_end = content.find("</svg>", svg_start)

new_svg = """<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl overflow-visible">
                      <!-- VIEW DOWN -->
                      <g class="view-down" [class.hidden]="playerDir() !== 'down'">
                        <g class="arm-l" style="transform-origin: 30px 45px;">
                          <path d="M 30 45 Q 15 50 20 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="20" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="arm-r" style="transform-origin: 70px 45px;">
                          <path d="M 70 45 Q 85 50 80 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="80" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 40px 80px;">
                          <path d="M 40 80 L 40 95" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 34 92 L 46 92 L 46 100 L 34 100 Z" fill="#334155" rx="3" />
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 80px;">
                          <path d="M 60 80 L 60 95" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 54 92 L 66 92 L 66 100 L 54 100 Z" fill="#334155" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <path d="M 25 45 Q 50 35 75 45 L 65 75 L 35 75 Z" fill="#fb923c" />
                          <path d="M 35 55 Q 45 60 50 55 Q 55 60 65 55" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <line x1="50" y1="55" x2="50" y2="70" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <line x1="42" y1="62" x2="58" y2="62" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <line x1="44" y1="68" x2="56" y2="68" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <path d="M 35 75 L 65 75 L 65 85 L 55 85 L 50 78 L 45 85 L 35 85 Z" fill="#1e40af" />
                          <rect x="33" y="73" width="34" height="6" fill="#0f172a" rx="2" />
                          <rect x="44" y="71" width="12" height="10" fill="#facc15" rx="2" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <circle cx="50" cy="25" r="16" fill="#fb923c" />
                          <path d="M 34 25 Q 34 8 50 8 Q 66 8 66 25 Q 66 15 50 15 Q 34 15 34 25 Z" fill="#171717" />
                          <circle cx="43" cy="25" r="2.5" fill="#000" />
                          <circle cx="57" cy="25" r="2.5" fill="#000" />
                          <line x1="38" y1="21" x2="47" y2="23" stroke="#000" stroke-width="2" stroke-linecap="round" />
                          <line x1="62" y1="21" x2="53" y2="23" stroke="#000" stroke-width="2" stroke-linecap="round" />
                          <path d="M 45 33 Q 50 30 55 33" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" />
                          <path d="M 47 36 L 53 36 L 50 40 Z" fill="#171717" />
                        </g>
                      </g>

                      <!-- VIEW UP -->
                      <g class="view-up" [class.hidden]="playerDir() !== 'up'">
                        <g class="arm-l" style="transform-origin: 30px 45px;">
                          <path d="M 30 45 Q 15 50 20 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="20" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="arm-r" style="transform-origin: 70px 45px;">
                          <path d="M 70 45 Q 85 50 80 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="80" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 40px 80px;">
                          <path d="M 40 80 L 40 95" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 34 92 L 46 92 L 46 100 L 34 100 Z" fill="#334155" rx="3" />
                        </g>
                        <g class="leg-r" style="transform-origin: 60px 80px;">
                          <path d="M 60 80 L 60 95" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 54 92 L 66 92 L 66 100 L 54 100 Z" fill="#334155" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <path d="M 25 45 Q 50 35 75 45 L 65 75 L 35 75 Z" fill="#fb923c" />
                          <path d="M 40 45 Q 50 55 50 70 M 60 45 Q 50 55 50 70" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <path d="M 35 75 L 65 75 L 65 85 L 55 85 L 50 78 L 45 85 L 35 85 Z" fill="#1e40af" />
                          <rect x="33" y="73" width="34" height="6" fill="#0f172a" rx="2" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <circle cx="50" cy="25" r="16" fill="#fb923c" />
                          <path d="M 34 25 Q 34 5 50 5 Q 66 5 66 25 L 62 30 Q 50 35 38 30 Z" fill="#171717" />
                        </g>
                      </g>

                      <!-- VIEW SIDE -->
                      <g class="view-side" [class.hidden]="playerDir() !== 'left' && playerDir() !== 'right'">
                        <g class="arm-l" style="transform-origin: 45px 45px;">
                          <path d="M 45 45 L 45 75" fill="none" stroke="#ea580c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="45" cy="75" r="8" fill="#ea580c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 45px 80px;">
                          <path d="M 45 80 L 45 95" fill="none" stroke="#ea580c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 39 92 L 55 92 L 55 100 L 39 100 Z" fill="#1e293b" rx="3" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 60px;">
                          <path d="M 35 45 Q 65 35 68 55 L 55 75 L 40 75 Z" fill="#fb923c" />
                          <path d="M 68 55 Q 60 55 55 50" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" />
                          <path d="M 40 75 L 55 75 L 55 85 L 40 85 Z" fill="#1e40af" />
                          <rect x="38" y="73" width="19" height="6" fill="#0f172a" rx="2" />
                          <rect x="53" y="71" width="6" height="10" fill="#facc15" rx="2" />
                        </g>
                        <g class="leg-r" style="transform-origin: 55px 80px;">
                          <path d="M 55 80 L 55 95" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" />
                          <path d="M 49 92 L 68 92 L 68 100 L 49 100 Z" fill="#334155" rx="3" />
                        </g>
                        <g class="head" style="transform-origin: 50px 25px;">
                          <circle cx="50" cy="25" r="16" fill="#fb923c" />
                          <path d="M 62 23 L 70 25 L 64 28 Z" fill="#fb923c" />
                          <path d="M 34 25 Q 34 8 50 8 Q 66 8 66 18 Q 50 18 34 25 Z" fill="#171717" />
                          <path d="M 38 22 L 42 22 L 42 32 L 38 30 Z" fill="#171717" />
                          <circle cx="58" cy="23" r="2.5" fill="#000" />
                          <line x1="53" y1="19" x2="62" y2="21" stroke="#000" stroke-width="2" stroke-linecap="round" />
                          <path d="M 64 34 L 58 38 L 54 35 Z" fill="#171717" />
                        </g>
                        <g class="arm-r" style="transform-origin: 50px 45px;">
                          <path d="M 50 45 L 50 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="50" cy="75" r="8" fill="#fb923c" />
                        </g>
                      </g>
"""

if svg_start != -1 and svg_end != -1:
    content = content[:svg_start] + new_svg + content[svg_end:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied Bare-Chested Burly Strongman")
