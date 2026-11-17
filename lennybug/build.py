"""Builds the keychain site from src/template.html.

  python3 build.py            -> index.html (standalone page, what Vercel serves)
  python3 build.py --artifact -> artifact.html (body-only version for a Claude artifact)
"""
import json, os, sys
S = os.path.dirname(os.path.abspath(__file__))

# The interactive pieces that the charms open. Each is a self-contained page (body-only source from its
# Claude artifact) wrapped into <slug>/index.html with a link back to the keyring.
BACK = """
<style>
#lb-back{position:fixed;z-index:2147483000;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);
  display:inline-flex;align-items:center;gap:8px;padding:9px 16px 9px 12px;border-radius:999px;text-decoration:none;white-space:nowrap;
  font:600 13px/1 ui-rounded,"SF Pro Rounded","Segoe UI",system-ui,sans-serif;letter-spacing:.01em;color:#fff;
  background:linear-gradient(180deg,#4aa0f2,#1f6fd1);border:1px solid rgba(255,255,255,.55);
  box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 6px 18px rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent;transition:transform .15s ease}
#lb-back:hover{transform:translateX(-50%) translateY(-1px)}#lb-back:active{transform:translateX(-50%) scale(.96)}
#lb-back:focus-visible{outline:3px solid #fff;outline-offset:2px}
#lb-back svg{width:15px;height:15px;flex:none}
@media (prefers-reduced-motion:reduce){#lb-back{transition:none}}
</style>
<a id="lb-back" href="/" aria-label="Back to the LennyBug keyring"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 3 4.5 8l5 5"/></svg>LennyBug</a>
"""
def wrap_piece(slug, src):
    body = open(src).read()
    back = BACK
    if 'anywhere for sound' in body:   # these pages float a sound prompt at the top centre on wide screens
        back = back.replace('</style>', '@media (min-width:700px){#lb-back{top:calc(env(safe-area-inset-top,0px) + 66px)}}\n</style>')
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}'
            '[hidden]:not([hidden=until-found i]){display:none!important}</style>\n</head>\n<body>\n' + body + back + '</body>\n</html>\n')
    out = os.path.join(S, slug, 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(page)
    print(out, len(page))
if '--piece' in sys.argv:   # python3 build.py --piece <slug> <path to the piece's body-only html>
    i = sys.argv.index('--piece'); wrap_piece(sys.argv[i + 1], sys.argv[i + 2]); sys.exit()

t = open(os.path.join(S, 'src', 'template.html')).read()
clouds = json.load(open(os.path.join(S, 'src', 'assets', 'clouds.json')))
pick = [0, 3, 6, 9, 1, 12, 5, 14, 8]
t = t.replace('/*__CLOUDS__*/[]', json.dumps([clouds[i] for i in pick]))
t = t.replace('/*__FONT__*/{}', open(os.path.join(S, 'src', 'assets', 'font.json')).read())
t = t.replace('/*__PIECE_BASE__*/', 'https://lennybug.vercel.app' if '--artifact' in sys.argv else '')
if '--artifact' in sys.argv:
    out = os.path.join(S, 'artifact.html')
else:
    out = os.path.join(S, 'index.html')
    t = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
         '<meta name="theme-color" content="#1f6fd1">\n'
         '<meta name="description" content="LennyBug: a keychain of charms that opens Lenny\'s timeline and claw machine.">\n'
         '<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);box-sizing:border-box}img{max-width:100%}</style>\n'
         '</head>\n<body>\n' + t + '\n</body>\n</html>\n')
open(out, 'w').write(t)
print(out, len(t))
