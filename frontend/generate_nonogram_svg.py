def generate_svg():
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <!-- Background Tray Shadow -->
    <filter id="board-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="15" stdDeviation="15" flood-color="#000" flood-opacity="0.6"/>
    </filter>
    <pattern id="grid8" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="translate(26, 26)">
      <rect width="50" height="50" rx="8" fill="#0f172a" opacity="0.6" />
    </pattern>
  </defs>

  <!-- Base Tray -->
  <g filter="url(#board-shadow)">
    <rect x="20" y="20" width="460" height="460" rx="30" fill="#1e293b" stroke="#334155" stroke-width="5" />
    <rect x="26" y="26" width="448" height="448" fill="url(#grid8)" opacity="0.3" />
  </g>

  <!-- Nonogram Board Background -->
  <rect x="80" y="80" width="320" height="320" fill="#ffffff" rx="8" />
"""

    pattern = [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0],
    ]

    row_hints = ["1 1", "5", "5", "3", "1"]
    col_hints = ["2", "4", "5", "4", "2"]

    # Top hints
    for i, hint in enumerate(col_hints):
        x = 150 + i * 50 + 25
        y = 135
        svg += f'  <text x="{x}" y="{y}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="middle">{hint}</text>\n'

    # Left hints
    for i, hint in enumerate(row_hints):
        parts = hint.split()
        y = 150 + i * 50 + 33
        if len(parts) == 1:
            svg += f'  <text x="130" y="{y}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="end">{parts[0]}</text>\n'
        else:
            svg += f'  <text x="100" y="{y}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="end">{parts[0]}</text>\n'
            svg += f'  <text x="130" y="{y}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="end">{parts[1]}</text>\n'

    # Grid (cells are 50x50 contiguous with borders)
    for r in range(5):
        for c in range(5):
            x = 150 + c * 50
            y = 150 + r * 50
            is_filled = pattern[r][c] == 1
            
            # Base cell with normal border #cbd5e1 (slate-300)
            fill_color = "#111827" if is_filled else "#ffffff"
            
            svg += f'  <rect x="{x}" y="{y}" width="50" height="50" fill="{fill_color}" stroke="#cbd5e1" stroke-width="2" />\n'
            
            # Cross if empty
            if not is_filled:
                if r == 0 and c == 0 or r == 0 and c == 4 or r == 4 and c == 0 or r == 4 and c == 4:
                    svg += f'  <text x="{x+25}" y="{y+34}" font-family="sans-serif" font-size="28" font-weight="bold" fill="#94a3b8" text-anchor="middle">✕</text>\n'

    # Thick borders for the grid (like slate-800 #1e293b)
    # The grid outline
    svg += f'  <rect x="150" y="150" width="250" height="250" fill="none" stroke="#1e293b" stroke-width="4" />\n'
    # Also top-left corner hints border
    svg += f'  <line x1="80" y1="150" x2="400" y2="150" stroke="#1e293b" stroke-width="4" />\n'
    svg += f'  <line x1="150" y1="80" x2="150" y2="400" stroke="#1e293b" stroke-width="4" />\n'

    svg += "</svg>"
    
    with open("/home/zd/x-game/frontend/public/assets/games/icons/nonogram.svg", "w") as f:
        f.write(svg)

generate_svg()
