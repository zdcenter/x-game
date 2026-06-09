svg = """<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="t-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>
    <linearGradient id="t-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
    <linearGradient id="t-yellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient>
    <linearGradient id="t-cyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/></linearGradient>
    <linearGradient id="t-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>
    <linearGradient id="t-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#9333ea"/></linearGradient>
    <linearGradient id="t-orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fb923c"/><stop offset="100%" stop-color="#ea580c"/></linearGradient>
    <filter id="t-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <g filter="url(#t-shadow)">
    <!-- Dark board -->
    <rect x="25" y="10" width="50" height="80" rx="3" fill="#0f172a" stroke="#334155" stroke-width="2" />
    
    <!-- Grid -->
    <g stroke="#334155" stroke-width="0.3" opacity="0.5">
"""

# Add grid lines
for x in range(30, 75, 5):
    svg += f'      <line x1="{x}" y1="10" x2="{x}" y2="90" />\n'
for y in range(15, 90, 5):
    svg += f'      <line x1="25" y1="{y}" x2="75" y2="{y}" />\n'
    
svg += """    </g>

    <!-- 3D Tetris Pieces -->
"""

blocks = [
    # blue J
    ('url(#t-blue)', [(25, 85), (30, 85), (35, 85), (25, 80)]),
    # orange L
    ('url(#t-orange)', [(40, 85), (45, 85), (50, 85), (50, 80)]),
    # yellow O
    ('url(#t-yellow)', [(55, 85), (60, 85), (55, 80), (60, 80)]),
    # red Z
    ('url(#t-red)', [(30, 80), (35, 80), (35, 75), (40, 75)]),
    # green S
    ('url(#t-green)', [(65, 85), (70, 85), (60, 75), (65, 75)]),
    # cyan I (falling)
    ('url(#t-cyan)', [(45, 25), (45, 30), (45, 35), (45, 40)]),
    # purple T (falling)
    ('url(#t-purple)', [(30, 45), (35, 45), (40, 45), (35, 50)])
]

for color, coords in blocks:
    for (x, y) in coords:
        svg += f"""
    <g transform="translate({x},{y})">
      <rect x="0" y="0.8" width="5" height="4.5" rx="0.5" fill="#000000" fill-opacity="0.6" />
      <rect x="0" y="0" width="5" height="4.5" rx="0.5" fill="{color}" />
      <rect x="0.5" y="0.5" width="4" height="3.5" rx="0.5" fill="none" stroke="#ffffff" stroke-width="0.4" stroke-opacity="0.5" />
    </g>"""

svg += """
  </g>
</svg>"""

with open('/home/zd/x-game/frontend/public/assets/games/icons/tetris.svg', 'w') as f:
    f.write(svg)

print("tetris.svg updated")
