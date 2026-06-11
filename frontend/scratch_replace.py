import os

file_path = "src/app/features/games/sokoban/components/board/sokoban-board.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace styles block
styles_start = content.find("styles: [`")
styles_end = content.find("  `],\n  template:")
if styles_start != -1 and styles_end != -1:
    new_styles = """styles: [`
    .player-wrapper {
      transition: transform 0.2s ease;
    }
    .player-wrapper.facing-left {
      transform: scaleX(-1);
    }
    
    /* ALL Limbs smooth transition */
    g, rect, path, circle, ellipse {
      transition: transform 0.15s ease-out;
    }

    /* Y-axis Walk (Down/Up) */
    @keyframes walk-y-l { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @keyframes walk-y-r { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

    /* Rotation Walk (Side) */
    @keyframes walk-rot-l { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(30deg); } 75% { transform: rotate(-30deg); } }
    @keyframes walk-rot-r { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-30deg); } 75% { transform: rotate(30deg); } }

    /* Push DOWN */
    .action-push .view-down .arm-l, .action-push .view-down .arm-r { transform: translateY(20px); }
    .action-push .view-down .body-core, .action-push .view-down .head { transform: translateY(5px); }

    /* Push UP */
    .action-push .view-up .arm-l, .action-push .view-up .arm-r { transform: translateY(-20px); }
    .action-push .view-up .body-core, .action-push .view-up .head { transform: translateY(-5px); }

    /* Push SIDE */
    @keyframes side-push-arm {
      0%, 100% { transform: rotate(-80deg) translate(5px, 0); }
      50% { transform: rotate(-90deg) translate(10px, 0); }
    }
    @keyframes side-push-body {
      0%, 100% { transform: rotate(10deg) translateX(2px); }
      50% { transform: rotate(15deg) translateX(5px); }
    }

    .action-push .view-side .arm-l, .action-push .view-side .arm-r { 
      animation: side-push-arm 0.4s ease-in-out infinite; 
    }
    .action-push .view-side .body-core, .action-push .view-side .head { 
      animation: side-push-body 0.4s ease-in-out infinite; 
    }

    /* Walk DOWN/UP */
    .action-walk .view-down .leg-l, .action-walk .view-up .leg-l { animation: walk-y-l 0.3s ease-in-out infinite; }
    .action-walk .view-down .leg-r, .action-walk .view-up .leg-r { animation: walk-y-r 0.3s ease-in-out infinite 0.15s; }

    /* Walk SIDE */
    .action-walk .view-side .leg-l { animation: walk-rot-l 0.3s ease-in-out infinite; }
    .action-walk .view-side .leg-r { animation: walk-rot-r 0.3s ease-in-out infinite; }
    .action-walk .view-side .arm-l { transform: rotate(20deg); }
    .action-walk .view-side .arm-r { transform: rotate(-20deg); }
"""
    content = content[:styles_start] + new_styles + content[styles_end:]

# 2. Replace SVG block
svg_start = content.find("<svg viewBox=\"0 0 100 100\"")
svg_end = content.find("</svg>")
if svg_start != -1 and svg_end != -1:
    new_svg = """<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl overflow-visible">
                      <!-- VIEW DOWN -->
                      <g class="view-down" [class.hidden]="playerDir() !== 'down'">
                        <g class="leg-l" style="transform-origin: 35px 65px;"><rect x="30" y="65" width="10" height="20" rx="4" fill="#0f172a"/><ellipse cx="35" cy="88" rx="8" ry="4" fill="#334155"/></g>
                        <g class="leg-r" style="transform-origin: 65px 65px;"><rect x="60" y="65" width="10" height="20" rx="4" fill="#0f172a"/><ellipse cx="65" cy="88" rx="8" ry="4" fill="#334155"/></g>
                        <g class="arm-l" style="transform-origin: 30px 45px;"><rect x="22" y="45" width="10" height="25" rx="5" fill="#ef4444"/><circle cx="27" cy="70" r="5" fill="#fcd34d"/></g>
                        <g class="arm-r" style="transform-origin: 70px 45px;"><rect x="68" y="45" width="10" height="25" rx="5" fill="#ef4444"/><circle cx="73" cy="70" r="5" fill="#fcd34d"/></g>
                        <g class="body-core" style="transform-origin: 50px 65px;"><rect x="30" y="40" width="40" height="30" rx="8" fill="#ef4444"/><path d="M 40 40 L 60 40 L 50 48 Z" fill="#fff"/></g>
                        <g class="head" style="transform-origin: 50px 40px;">
                          <path d="M 25 25 Q 50 -5 75 25 L 75 40 L 25 40 Z" fill="#111827"/>
                          <rect x="30" y="15" width="40" height="25" rx="8" fill="#fcd34d"/>
                          <circle cx="40" cy="25" r="3" fill="#000"/><circle cx="60" cy="25" r="3" fill="#000"/>
                          <rect x="35" y="22" width="30" height="6" rx="2" fill="none" stroke="#4b5563" stroke-width="2"/>
                          <line x1="48" y1="25" x2="52" y2="25" stroke="#4b5563" stroke-width="2"/>
                          <path d="M 25 25 Q 50 15 75 25 L 75 15 Q 50 5 25 15 Z" fill="#1f2937"/>
                        </g>
                      </g>

                      <!-- VIEW UP -->
                      <g class="view-up" [class.hidden]="playerDir() !== 'up'">
                        <g class="arm-l" style="transform-origin: 30px 45px;"><rect x="22" y="20" width="10" height="25" rx="5" fill="#b91c1c"/><circle cx="27" cy="20" r="5" fill="#fcd34d"/></g>
                        <g class="arm-r" style="transform-origin: 70px 45px;"><rect x="68" y="20" width="10" height="25" rx="5" fill="#b91c1c"/><circle cx="73" cy="20" r="5" fill="#fcd34d"/></g>
                        <g class="leg-l" style="transform-origin: 35px 65px;"><rect x="30" y="65" width="10" height="20" rx="4" fill="#0f172a"/><ellipse cx="35" cy="88" rx="8" ry="4" fill="#334155"/></g>
                        <g class="leg-r" style="transform-origin: 65px 65px;"><rect x="60" y="65" width="10" height="20" rx="4" fill="#0f172a"/><ellipse cx="65" cy="88" rx="8" ry="4" fill="#334155"/></g>
                        <g class="body-core" style="transform-origin: 50px 65px;"><rect x="30" y="40" width="40" height="30" rx="8" fill="#ef4444"/></g>
                        <g class="head" style="transform-origin: 50px 40px;"><rect x="28" y="15" width="44" height="28" rx="10" fill="#111827"/></g>
                      </g>

                      <!-- VIEW SIDE -->
                      <g class="view-side" [class.hidden]="playerDir() !== 'left' && playerDir() !== 'right'">
                        <g class="arm-l" style="transform-origin: 45px 45px;"><rect x="40" y="45" width="10" height="25" rx="5" fill="#b91c1c"/><circle cx="45" cy="70" r="5" fill="#eab308"/></g>
                        <g class="leg-l" style="transform-origin: 45px 65px;"><rect x="40" y="65" width="10" height="20" rx="4" fill="#0f172a"/><ellipse cx="45" cy="88" rx="8" ry="4" fill="#334155"/></g>
                        <g class="body-core" style="transform-origin: 50px 65px;"><rect x="35" y="40" width="30" height="30" rx="8" fill="#ef4444"/></g>
                        <g class="head" style="transform-origin: 50px 40px;">
                          <path d="M 35 15 Q 60 5 70 25 L 70 40 L 35 40 Z" fill="#111827"/>
                          <rect x="38" y="15" width="30" height="25" rx="8" fill="#fcd34d"/>
                          <circle cx="58" cy="25" r="3" fill="#000"/>
                          <rect x="48" y="22" width="20" height="6" rx="2" fill="none" stroke="#4b5563" stroke-width="2"/>
                          <line x1="68" y1="25" x2="72" y2="25" stroke="#4b5563" stroke-width="2"/>
                          <path d="M 35 15 Q 50 10 65 15 L 68 25 Q 50 15 35 25 Z" fill="#1f2937"/>
                        </g>
                        <g class="leg-r" style="transform-origin: 55px 65px;"><rect x="50" y="65" width="10" height="20" rx="4" fill="#1e293b"/><ellipse cx="55" cy="88" rx="8" ry="4" fill="#475569"/></g>
                        <g class="arm-r" style="transform-origin: 55px 45px;"><rect x="50" y="45" width="10" height="25" rx="5" fill="#ef4444"/><circle cx="55" cy="70" r="5" fill="#fcd34d"/></g>
                      </g>
"""
    content = content[:svg_start] + new_svg + content[svg_end:]

# 3. Modify triggerMove
content = content.replace("    triggerMove(dir: 'up' | 'down' | 'left' | 'right') {\n      if (dir === 'left' || dir === 'right') {\n        this.playerDir.set(dir);\n      }", "    triggerMove(dir: 'up' | 'down' | 'left' | 'right') {\n      this.playerDir.set(dir);")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("File updated completely.")
