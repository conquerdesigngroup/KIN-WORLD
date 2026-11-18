#!/usr/bin/env python3
"""Inline assets into src/template.html -> index.html (body-only page for the Claude artifact;
also opens fine as a plain file). Run: python3 build.py"""
import base64, math, pathlib, re
here = pathlib.Path(__file__).parent
MIME = {'.webp': 'image/webp', '.png': 'image/png'}

HAT = ('<svg viewBox="0 0 100 124" aria-hidden="true"><defs>'
       '<linearGradient id="hg{n}" x1="0" x2="1"><stop offset="0" stop-color="#f6b4c4"/><stop offset=".55" stop-color="#ee96ad"/><stop offset="1" stop-color="#dd7f99"/></linearGradient>'
       '<pattern id="hp{n}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><circle cx="1.2" cy="1.2" r=".7" fill="#fff" opacity=".55"/><circle cx="3.7" cy="3.6" r=".5" fill="#c9607f" opacity=".5"/></pattern></defs>'
       '<path d="M50 3 97 106Q50 124 3 106Z" fill="url(#hg{n})"/><path d="M50 3 97 106Q50 124 3 106Z" fill="url(#hp{n})"/></svg>')

def shell():
    ribs = []
    n = 9
    for i in range(n):
        a = -72 + 144 * i / (n - 1)
        ry = 74 - abs(a) * 0.16
        fill = '#ff9ccb' if i % 2 else '#ffb3d6'
        ribs.append(f'<ellipse cx="100" cy="{150 - ry:.1f}" rx="19" ry="{ry:.1f}" transform="rotate({a:.1f} 100 150)" fill="{fill}" stroke="#fff" stroke-width="2"/>')
    # draw outer ribs first so the middle ones overlap
    order = sorted(range(n), key=lambda i: -abs(i - n // 2))
    body = ''.join(ribs[i] for i in order)
    return ('<svg viewBox="-22 0 244 174" aria-hidden="true"><defs><radialGradient id="sg" cx=".5" cy="1" r="1">'
            '<stop offset="0" stop-color="#ff5fa8" stop-opacity=".75"/><stop offset=".7" stop-color="#ff5fa8" stop-opacity="0"/></radialGradient></defs>'
            + body +
            '<path d="M58 150Q100 132 142 150L134 170Q100 160 66 170Z" fill="#ff8fc4" stroke="#fff" stroke-width="2"/></svg>')

def tail():
    """Paper-cutout mermaid tail: S-curved body covered in overlapping scales, ribbed fluke, sticker outline."""
    import random
    rnd = random.Random(7)
    def spine(u):
        x = 150 - 30 * math.sin(u * math.pi) + 34 * u * u
        y = 440 - 285 * u
        return x, y
    def half(u):
        return 62 * (1 - u) ** 1.25 + 12
    def frame(u):
        x, y = spine(u); x2, y2 = spine(u + 0.001)
        dx, dy = x2 - x, y2 - y; L = math.hypot(dx, dy)
        return x, y, dx / L, dy / L
    left, right = [], []
    for i in range(41):
        u = i / 40; x, y, tx, ty = frame(u); w = half(u)
        left.append((x + ty * w, y - tx * w)); right.append((x - ty * w, y + tx * w))
    body = 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in left + right[::-1]) + 'Z'
    nx, ny, tx, ty = frame(1.0)
    ang = math.degrees(math.atan2(tx, -ty)) * 0.35
    fl = (f'M{nx-13:.1f} {ny+10:.1f}C{nx-46:.1f} {ny-4:.1f} {nx-104:.1f} {ny-22:.1f} {nx-128:.1f} {ny-112:.1f}'
          f'C{nx-84:.1f} {ny-98:.1f} {nx-34:.1f} {ny-70:.1f} {nx:.1f} {ny-26:.1f}'
          f'C{nx+34:.1f} {ny-70:.1f} {nx+84:.1f} {ny-98:.1f} {nx+128:.1f} {ny-112:.1f}'
          f'C{nx+104:.1f} {ny-22:.1f} {nx+46:.1f} {ny-4:.1f} {nx+13:.1f} {ny+10:.1f}Z')
    ribs = ''
    for sx in (-1, 1):
        for k, (ex, ey) in enumerate([(118, -98), (100, -70), (84, -46), (66, -26)]):
            ribs += (f'<path d="M{nx+sx*4:.1f} {ny:.1f}Q{nx+sx*ex*.45:.1f} {ny+ey*.25:.1f} {nx+sx*ex:.1f} {ny+ey:.1f}" '
                     f'fill="none" stroke="#fff" stroke-width="{2.2-k*.3:.1f}" stroke-linecap="round" opacity=".7"/>')
    pal = [(0.0, (255, 122, 184)), (0.35, (255, 160, 214)), (0.6, (196, 160, 255)), (0.82, (140, 200, 255)), (1.0, (120, 240, 226))]
    def col(u):
        for (a, ca), (c, cb) in zip(pal, pal[1:]):
            if u <= c:
                f = (u - a) / (c - a); break
        else:
            ca = cb = pal[-1][1]; f = 0
        j = rnd.uniform(-16, 16)
        return '#%02x%02x%02x' % tuple(max(0, min(255, int(ca[i] + (cb[i] - ca[i]) * f + j))) for i in range(3))
    scales = ''
    rows = []
    u = 1.02; k = 0
    while u > -0.12:
        w = half(max(0, min(1, u))); r = max(7.5, min(15, w * 0.36))
        rows.append((u, w, r, k)); u -= r * 1.02 / 285; k += 1
    for u, w, r, k in rows:            # tip first, so each row tucks under the next one down
        x, y, tx, ty = frame(max(-0.1, min(1, u)))
        n = int(w / r) + 2
        for i in range(-n, n + 1):
            o = (i + (k % 2) * .5) * r * 1.72
            cx, cy = x - ty * o, y + tx * o
            c = col(max(0, min(1, u)))
            scales += (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{c}" stroke="#fff" stroke-opacity=".75" stroke-width="1.1"/>'
                       f'<path d="M{cx-r*.55:.1f} {cy-r*.45:.1f}A{r*.72:.1f} {r*.72:.1f} 0 0 1 {cx+r*.2:.1f} {cy-r*.7:.1f}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>')
    return ('<svg class="tail-svg" viewBox="0 0 300 450" aria-hidden="true"><defs>'
            f'<clipPath id="tb"><path d="{body}"/></clipPath><clipPath id="tf"><path d="{fl}"/></clipPath>'
            '<linearGradient id="tfg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b9a6ff"/><stop offset=".45" stop-color="#8fe9f0"/><stop offset="1" stop-color="#ffb3dc"/></linearGradient>'
            '<linearGradient id="tsh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            '<linearGradient id="tsd" x1="0" x2="1"><stop offset="0" stop-color="#2a1680" stop-opacity=".38"/><stop offset=".3" stop-color="#2a1680" stop-opacity="0"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient></defs>'
            f'<g class="fluke" style="transform-origin:{nx:.1f}px {ny:.1f}px"><g transform="rotate({ang:.1f} {nx:.1f} {ny:.1f})">'
            f'<path d="{fl}" fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="{fl}" fill="url(#tfg)"/>{ribs}'
            f'<g clip-path="url(#tf)"><rect class="shine" x="-120" y="0" width="70" height="450" fill="url(#tsh)" transform="skewX(-20)"/></g></g></g>'
            f'<path d="{body}" fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round"/>'
            f'<g clip-path="url(#tb)">{scales}<rect x="0" y="0" width="300" height="450" fill="url(#tsd)"/>'
            '<rect class="shine" x="-120" y="0" width="70" height="450" fill="url(#tsh)" transform="skewX(-20)"/></g>'
            f'<ellipse cx="{nx:.1f}" cy="{ny+6:.1f}" rx="15" ry="7" fill="#fff"/><ellipse cx="{nx:.1f}" cy="{ny+6:.1f}" rx="11" ry="4" fill="#ff8fc7"/>'
            '</svg>')

html = (here / 'src/template.html').read_text()
for _k, _f in (('INTRO_CSS', 'intro.css'), ('INTRO_HTML', 'intro.html'), ('INTRO_JS', 'intro.js')):
    html = html.replace('{{' + _k + '}}', (here / 'src' / _f).read_text())
def img(m):
    p = here / 'src/assets' / m.group(1)
    return f'data:{MIME[p.suffix]};base64,' + base64.b64encode(p.read_bytes()).decode()
html = re.sub(r'\{\{IMG:([^}]+)\}\}', img, html)
k = [0]
def hat(_):
    k[0] += 1
    return HAT.replace('{n}', str(k[0]))
html = re.sub(r'\{\{HAT\}\}', hat, html)
html = html.replace('{{SHELL}}', shell()).replace('{{TAIL}}', tail())
(here / 'index.html').write_text(html)
print('index.html', len(html) // 1024, 'KB')
