import sys

def get_bulb(is_on, cx, cy):
    # Base shapes
    scale = 1.25 if is_on else 1.0
    # Original bulb is 64x64. Center is 32,32.
    # Target center is cx, cy
    dx = cx - 32 * scale
    dy = cy - 32 * scale
    
    bulb_shapes = f"""
      <g transform="translate({dx},{dy}) scale({scale})">
        <path d="M 32 4 A 18 18 0 0 0 14 22 C 14 31 22 36 25 42 L 39 42 C 42 36 50 31 50 22 A 18 18 0 0 0 32 4 Z" stroke-width="1.5" fill="{'#fbbf24' if is_on else '#334155'}" stroke="{'#f59e0b' if is_on else '#475569'}" />
        <path d="M 25 42 L 39 42 L 37 54 L 27 54 Z" fill="#94a3b8" stroke="none" />
        <path d="M 39 42 L 37 54 L 32 54 L 32 42 Z" fill="#64748b" fill-opacity="0.4" stroke="none" />
        <path d="M 24 45 Q 32 48 40 45 M 25 49 Q 32 52 39 49 M 26 53 Q 32 56 38 53" stroke="#64748b" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M 28 54 L 36 54 C 36 58 34 60 32 60 C 30 60 28 58 28 54 Z" fill="#334155" stroke="none" />
        
        <!-- Details -->
        {f'<circle cx="32" cy="22" r="26" fill="#fbbf24" opacity="0.4" filter="url(#glowBlur)" />' if is_on else ''}
        {f'<path d="M 32 4 A 18 18 0 0 0 14 22 C 14 31 22 36 25 42 L 39 42 C 42 36 50 31 50 22 A 18 18 0 0 0 32 4 Z" fill="url(#glassGlow)" stroke="none" />' if is_on else ''}
        
        <path d="M 18 20 A 12 12 0 0 1 28 8" stroke="#ffffff" opacity="{0.7 if is_on else 0.15}" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <path d="M 29 42 L 29 28 M 35 42 L 35 28" stroke="{'#d97706' if is_on else '#1e293b'}" stroke-width="1.5" stroke-linecap="round" fill="none" />
        <path d="M 29 28 L 30 21 L 31 25 L 32 21 L 33 25 L 34 21 L 35 28" stroke="{'#fef3c7' if is_on else '#64748b'}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" fill="none" />
      </g>
    """
    return bulb_shapes

def get_cell(is_on, x, y):
    cx = x + 50
    cy = y + 45
    
    if is_on:
        bg = f"""
        <!-- 3D Shadow/Bevel -->
        <rect x="{x}" y="{y+8}" width="100" height="92" rx="20" fill="#9a3412" />
        <!-- Top Surface -->
        <rect x="{x}" y="{y}" width="100" height="92" rx="20" fill="url(#onCellBg)" stroke="#fcd34d" stroke-width="2" />
        <!-- Inner glow/highlight for top surface -->
        <rect x="{x+2}" y="{y+2}" width="96" height="88" rx="18" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.3" />
        """
    else:
        bg = f"""
        <!-- 3D Shadow/Bevel -->
        <rect x="{x}" y="{y+8}" width="100" height="92" rx="20" fill="#020617" />
        <!-- Top Surface -->
        <rect x="{x}" y="{y}" width="100" height="92" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2" />
        <!-- Inner cavity -->
        <rect x="{x+10}" y="{y+10}" width="80" height="72" rx="16" fill="#000000" fill-opacity="0.5" />
        <!-- Inner highlight -->
        <rect x="{x+2}" y="{y+2}" width="96" height="88" rx="18" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.05" />
        """
    
    return bg + get_bulb(is_on, cx, cy)

cells = []
for row in range(3):
    for col in range(3):
        # Cross pattern: center + top/bottom/left/right are ON
        is_on = (row == 1 or col == 1)
        x = col * 110
        y = row * 110
        cells.append(get_cell(is_on, x, y))

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 340 340" width="100%" height="100%">
  <defs>
    <filter id="glowBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
    <radialGradient id="glassGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#fef3c7" stop-opacity="1" />
      <stop offset="40%" stop-color="#fde68a" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="onCellBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>

  <!-- Drop shadow for the entire board -->
  <g filter="drop-shadow(0px 15px 15px rgba(0,0,0,0.5))">
    {''.join(cells)}
  </g>
</svg>"""

with open('/home/zd/x-game/frontend/public/assets/games/icons/lightsout.svg', 'w') as f:
    f.write(svg)

print("SVG generated")
