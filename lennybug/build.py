"""Builds the keychain site from src/template.html.

  python3 build.py            -> index.html (standalone page, what Vercel serves)
  python3 build.py --artifact -> artifact.html (body-only version for a Claude artifact)
"""
import json, os, sys
S = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(S, 'src', 'template.html')).read()
clouds = json.load(open(os.path.join(S, 'src', 'assets', 'clouds.json')))
pick = [0, 3, 6, 9, 1, 12, 5, 14, 8]
t = t.replace('/*__CLOUDS__*/[]', json.dumps([clouds[i] for i in pick]))
t = t.replace('/*__FONT__*/{}', open(os.path.join(S, 'src', 'assets', 'font.json')).read())
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
