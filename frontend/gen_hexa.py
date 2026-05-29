import math

size = 7
w = math.sqrt(3) * size
h = 1.5 * size

print('<svg width="80" height="80" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">')
print('  <defs>')
print(f'    <polygon id="hx" points="0,-{size} {w/2},-{size/2} {w/2},{size/2} 0,{size} -{w/2},{size/2} -{w/2},-{size/2}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />')
print('  </defs>')
print('  <g fill="rgba(255,255,255,0.25)">')

for r in range(-2, 3):
    q1 = max(-2, -r - 2)
    q2 = min(2, -r + 2)
    for q in range(q1, q2 + 1):
        x = 50 + w * (q + r/2.0)
        y = 50 + h * r
        print(f'    <use href="#hx" x="{x:.1f}" y="{y:.1f}" />')

print('  </g>')

print('  <!-- highlight some pieces -->')
print('  <g fill="#fde047" stroke="rgba(250,204,21,0.5)">')
# A V-shape piece
print(f'    <use href="#hx" x="{50 + w * (-1 + 1/2.0):.1f}" y="{50 + h * 1:.1f}" />')
print(f'    <use href="#hx" x="{50 + w * (0 + 1/2.0):.1f}" y="{50 + h * 1:.1f}" />')
print(f'    <use href="#hx" x="{50 + w * (0 + 2/2.0):.1f}" y="{50 + h * 2:.1f}" />')
print('  </g>')

print('  <g fill="#34d399" stroke="rgba(52,211,153,0.5)">')
# A line of 3
print(f'    <use href="#hx" x="{50 + w * (-1 - 1/2.0):.1f}" y="{50 + h * -1:.1f}" />')
print(f'    <use href="#hx" x="{50 + w * (0 - 1/2.0):.1f}" y="{50 + h * -1:.1f}" />')
print(f'    <use href="#hx" x="{50 + w * (1 - 1/2.0):.1f}" y="{50 + h * -1:.1f}" />')
print('  </g>')

print('</svg>')
