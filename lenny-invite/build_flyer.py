#!/usr/bin/env python3
"""Static 8.5 x 11 in flyer from the invite's own styles and pieces.
Run build.py first, then: python3 build_flyer.py  -> flyer.html ; render with tools/render_flyer.js -> flyer.jpg"""
import pathlib, re
here = pathlib.Path(__file__).parent
page = (here / 'index.html').read_text()
style = re.search(r'<style>.*?</style>', page, re.S).group(0)
link = re.search(r'<link rel="stylesheet"[^>]+>', page).group(0)
stage = page[page.index('<div class="stage" id="stage">'):page.index('<div class="say">')]
tail = re.search(r'<svg class="tail-svg".*?</svg>', page, re.S).group(0)
wave = lambda c: ("url('data:image/svg+xml," + ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" preserveAspectRatio="none">'
        f'<path fill="{c}" d="M0 100V20Q10 0 26 6T56 14Q70 22 80 20V100Z"/></svg>').replace('#', '%23').replace('<', '%3C').replace('>', '%3E') + "')")
html = f'''<!doctype html><html><head><meta charset="utf-8"><title>Lenny's Mermaid Fifth flyer</title>{link}{style}
<style>
*,*::before,*::after{{animation:none!important;transition:none!important}}
html,body{{margin:0;padding:0;width:850px;height:1100px;overflow:hidden}}
.fly{{position:relative;width:850px;height:1100px;overflow:hidden;isolation:isolate;background:var(--paper) var(--tex);background-size:256px}}
.fly::after{{content:"";position:absolute;inset:0;z-index:-1;background:var(--grain) 0 0/420px;mix-blend-mode:overlay}}
.fly .stage{{position:absolute;left:185px;top:22px;width:470px}}
.fly .glint{{display:none}}
.fly .hat{{opacity:1}}
.fly .xb{{position:absolute}}
.fly .hand{{position:absolute;left:84px;top:650px;font-size:64px;line-height:.9;padding:0;transform:rotate(-3deg)}}
.fly .hand span{{clip-path:none}}
.fl{{position:absolute;left:104px;top:790px;margin:0;font-family:var(--hand);color:var(--ink);transform:rotate(-2deg)}}
.fl p{{margin:0 0 6px;font-size:50px;line-height:1}}
.fl div{{display:flex;align-items:baseline;gap:12px;font-size:44px;line-height:1.08}}
.fl dt{{font-size:44px}}
.fl dd{{margin:0;border-bottom:3px solid var(--ink);padding:0 16px 0 6px;line-height:.9}}
.fly .tailwrap{{left:auto;right:40px;bottom:-22px;width:236px;margin:0;transform:rotate(7deg);filter:drop-shadow(0 6px 8px rgba(60,35,30,.35))}}
.fly .wave{{position:absolute;left:-20px;right:-20px}}
.fly .w1{{top:auto;bottom:0;height:84px;background-image:{wave('#6ff0e4')};background-size:132px 100%}}
.fly .w2{{top:auto;bottom:0;height:60px;background-image:{wave('#8fb4ff')};background-size:104px 100%;background-position:30px 0}}
.fly .w3{{top:auto;bottom:0;height:36px;background:{wave('#b9a6ff')} 12px 0/84px 100% repeat-x}}
</style></head><body><div class="fly">
  <div class="ht" style="right:0;top:0;--c:var(--pink);--o:.6;--f:scaleX(-1);--w:560px"></div>
  <div class="ht" style="left:0;bottom:0;--c:var(--engrave);--o:.34;--f:scaleY(-1);--w:520px"></div>
  <span class="bub xb" style="--s:150px;left:-40px;top:250px"><i></i></span>
  <span class="bub xb" style="--s:60px;left:70px;top:470px"><i></i></span>
  <span class="bub xb" style="--s:120px;left:735px;top:330px"><i></i></span>
  <span class="bub xb" style="--s:46px;left:700px;top:520px"><i></i></span>
  <span class="bub xb" style="--s:84px;left:752px;top:610px"><i></i></span>
  <span class="star xb" style="--s:34px;left:60px;top:150px"></span>
  <span class="star xb" style="--s:24px;left:770px;top:250px;--c:var(--engrave)"></span>
  <span class="star xb" style="--s:26px;left:560px;top:860px;--c:var(--lilac)"></span>
  <span class="star xb" style="--s:20px;left:40px;top:640px;--c:var(--engrave)"></span>
  {stage}
  <h1 class="hand"><span>a mermaid birthday party</span><span>for Lenny’s fifth</span></h1>
  <div class="fl"><p>december 30, 2026</p>
    <div><dt>time:</dt><dd>10:00 AM</dd></div><div><dt>place:</dt><dd>Once Upon an Island</dd></div><div><dt>rsvp:</dt><dd>by 12/15</dd></div></div>
  <div class="wave w1"></div>
  <div class="tailwrap">{tail}</div>
  <div class="wave w2"></div><div class="wave w3"></div>
</div><script>document.fonts.ready.then(function(){{var ts=document.querySelectorAll('.num5 text'),c=document.createElement('canvas').getContext('2d');
if(!ts.length)return;c.font='900 100px '+getComputedStyle(ts[0]).fontFamily;var m=c.measureText('5'),k=1.28;
var x=60-(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2*k,y=72-(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2*k;
ts.forEach(function(t){{t.setAttribute('text-anchor','start');t.setAttribute('x',x);t.setAttribute('y',y);}});}});</script></body></html>'''
(here / 'flyer.html').write_text(html)
print('flyer.html', len(html) // 1024, 'KB')
