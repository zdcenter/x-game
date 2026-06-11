import os

file_path = "src/app/features/games/sokoban/components/board/sokoban-board.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace CSS
css_start = content.find("      /* Walking Keyframes */")
css_end = content.find("    </style>", css_start)
if css_end == -1:
    css_end = content.find("    .facing-left", css_start) # if any
    if css_end == -1:
        css_end = content.find("  `],", css_start)

new_css = """      /* Walking Keyframes */
    @keyframes walk-y-l { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes walk-y-r { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes walk-rot-l { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(30deg); } 75% { transform: rotate(-30deg); } }
    @keyframes walk-rot-r { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-30deg); } 75% { transform: rotate(30deg); } }
    
    .action-walk .view-down .leg-l, .action-walk .view-up .leg-l { animation: walk-y-l 0.3s ease-in-out infinite; }
    .action-walk .view-down .leg-r, .action-walk .view-up .leg-r { animation: walk-y-r 0.3s ease-in-out infinite 0.15s; }
    .action-walk .view-down .arm-l, .action-walk .view-up .arm-l { animation: walk-y-l 0.3s ease-in-out infinite 0.15s; }
    .action-walk .view-down .arm-r, .action-walk .view-up .arm-r { animation: walk-y-r 0.3s ease-in-out infinite; }

    .action-walk .view-side .leg-l { animation: walk-rot-l 0.3s ease-in-out infinite; }
    .action-walk .view-side .leg-r { animation: walk-rot-r 0.3s ease-in-out infinite; }
    .action-walk .view-side .arm-l { transform: rotate(35deg); }
    .action-walk .view-side .arm-r { transform: rotate(-35deg); }

    /* Push DOWN */
    .action-push .view-down .arm-l, .action-push .view-down .arm-r { transform: translateY(12px) scaleY(1.1); }
    .action-push .view-down .body-core, .action-push .view-down .head { transform: translateY(4px); }

    /* Push UP */
    .action-push .view-up .arm-l, .action-push .view-up .arm-r { transform: rotate(180deg) translateY(12px); }
    .action-push .view-up .body-core, .action-push .view-up .head { transform: translateY(-4px); }

    /* Push SIDE */
    @keyframes side-push-arm {
      0%, 100% { transform: rotate(-75deg) translate(5px, 0); }
      50% { transform: rotate(-85deg) translate(10px, 0); }
    }
    @keyframes side-push-body {
      0%, 100% { transform: rotate(10deg) translateX(2px); }
      50% { transform: rotate(15deg) translateX(6px); }
    }
    .action-push .view-side .arm-l, .action-push .view-side .arm-r { animation: side-push-arm 0.4s ease-in-out infinite; }
    .action-push .view-side .body-core, .action-push .view-side .head { animation: side-push-body 0.4s ease-in-out infinite; }
"""
if css_start != -1 and css_end != -1:
    content = content[:css_start] + new_css + content[css_end:]

# Replace SVG
svg_start = content.find("<svg viewBox=\"0 0 100 100\" class=\"w-full h-full drop-shadow-xl overflow-visible\">")
svg_end = content.find("</svg>", svg_start)

new_svg = """<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl overflow-visible">
                      <!-- VIEW DOWN -->
                      <g class="view-down" [class.hidden]="playerDir() !== 'down'">
                        <g class="leg-l" style="transform-origin: 38px 65px;">
                          <rect x="32" y="65" width="12" height="22" rx="6" fill="#fdba74" />
                          <path d="M 30 80 L 46 80 L 46 92 L 30 92 Z" fill="#475569" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="leg-r" style="transform-origin: 62px 65px;">
                          <rect x="56" y="65" width="12" height="22" rx="6" fill="#fdba74" />
                          <path d="M 54 80 L 70 80 L 70 92 L 54 92 Z" fill="#475569" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="arm-l" style="transform-origin: 25px 40px;">
                          <path d="M 30 38 Q 10 38 10 55 Q 10 70 25 75" fill="none" stroke="#fdba74" stroke-width="14" stroke-linecap="round" />
                          <circle cx="25" cy="75" r="8" fill="#fdba74" />
                        </g>
                        <g class="arm-r" style="transform-origin: 75px 40px;">
                          <path d="M 70 38 Q 90 38 90 55 Q 90 70 75 75" fill="none" stroke="#fdba74" stroke-width="14" stroke-linecap="round" />
                          <circle cx="75" cy="75" r="8" fill="#fdba74" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 65px;">
                          <path d="M 20 35 Q 50 25 80 35 L 68 65 L 32 65 Z" fill="#dc2626" />
                          <path d="M 35 35 Q 50 55 65 35 Z" fill="#fdba74" />
                          <rect x="30" y="60" width="40" height="10" rx="2" fill="#0f172a" />
                          <rect x="42" y="58" width="16" height="14" rx="2" fill="#fbbf24" />
                        </g>
                        <g class="head" style="transform-origin: 50px 35px;">
                          <path d="M 35 15 L 65 15 L 62 38 Q 50 45 38 38 Z" fill="#fdba74" />
                          <rect x="33" y="10" width="34" height="10" rx="4" fill="#0f172a" />
                          <path d="M 38 22 L 46 24 L 46 28 L 38 28 Z" fill="#000" />
                          <path d="M 62 22 L 54 24 L 54 28 L 62 28 Z" fill="#000" />
                          <path d="M 45 34 Q 50 30 55 34 L 55 36 Q 50 32 45 36 Z" fill="#000" />
                        </g>
                      </g>

                      <!-- VIEW UP -->
                      <g class="view-up" [class.hidden]="playerDir() !== 'up'">
                        <g class="arm-l" style="transform-origin: 25px 40px;">
                          <path d="M 30 38 Q 10 38 10 55 Q 10 70 25 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="25" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="arm-r" style="transform-origin: 75px 40px;">
                          <path d="M 70 38 Q 90 38 90 55 Q 90 70 75 75" fill="none" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="75" cy="75" r="8" fill="#fb923c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 38px 65px;">
                          <rect x="32" y="65" width="12" height="22" rx="6" fill="#fb923c" />
                          <path d="M 30 80 L 46 80 L 46 92 L 30 92 Z" fill="#334155" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="leg-r" style="transform-origin: 62px 65px;">
                          <rect x="56" y="65" width="12" height="22" rx="6" fill="#fb923c" />
                          <path d="M 54 80 L 70 80 L 70 92 L 54 92 Z" fill="#334155" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 65px;">
                          <path d="M 20 35 Q 50 25 80 35 L 68 65 L 32 65 Z" fill="#b91c1c" />
                          <rect x="30" y="60" width="40" height="10" rx="2" fill="#0f172a" />
                        </g>
                        <g class="head" style="transform-origin: 50px 35px;">
                          <path d="M 35 15 L 65 15 L 62 38 Q 50 45 38 38 Z" fill="#fb923c" />
                          <path d="M 30 10 Q 50 0 70 10 L 72 25 Q 50 35 28 25 Z" fill="#0f172a" />
                        </g>
                      </g>

                      <!-- VIEW SIDE -->
                      <g class="view-side" [class.hidden]="playerDir() !== 'left' && playerDir() !== 'right'">
                        <g class="arm-l" style="transform-origin: 50px 40px;">
                          <path d="M 50 38 L 50 68" stroke="#fb923c" stroke-width="14" stroke-linecap="round" />
                          <circle cx="50" cy="68" r="8" fill="#fb923c" />
                        </g>
                        <g class="leg-l" style="transform-origin: 45px 65px;">
                          <rect x="39" y="65" width="12" height="22" rx="6" fill="#fb923c" />
                          <path d="M 37 80 L 53 80 L 53 92 L 37 92 Z" fill="#334155" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="body-core" style="transform-origin: 50px 65px;">
                          <path d="M 35 35 L 65 35 L 55 65 L 45 65 Z" fill="#dc2626" />
                          <path d="M 60 35 Q 65 45 55 55 Z" fill="#fdba74" />
                          <rect x="42" y="60" width="16" height="10" fill="#0f172a" />
                        </g>
                        <g class="head" style="transform-origin: 50px 35px;">
                          <rect x="40" y="8" width="25" height="10" rx="5" fill="#0f172a" />
                          <path d="M 40 15 L 65 15 L 65 30 Q 55 35 40 30 Z" fill="#fdba74" />
                          <path d="M 55 22 L 62 24 L 62 28 L 55 28 Z" fill="#000" />
                          <path d="M 60 30 Q 65 30 68 34" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
                        </g>
                        <g class="leg-r" style="transform-origin: 55px 65px;">
                          <rect x="49" y="65" width="12" height="22" rx="6" fill="#fdba74" />
                          <path d="M 47 80 L 63 80 L 63 92 L 47 92 Z" fill="#475569" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
                        </g>
                        <g class="arm-r" style="transform-origin: 50px 40px;">
                          <path d="M 50 38 L 50 68" stroke="#fdba74" stroke-width="14" stroke-linecap="round" />
                          <circle cx="50" cy="68" r="8" fill="#fdba74" />
                        </g>
                      </g>
"""

if svg_start != -1 and svg_end != -1:
    content = content[:svg_start] + new_svg + content[svg_end:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced CSS and SVG")
