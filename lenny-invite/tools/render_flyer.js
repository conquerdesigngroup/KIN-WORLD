// node tools/render_flyer.js  -> flyer.jpg (2550 x 3300 px, 8.5 x 11 in at 300 dpi)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 850, height: 1100 }, deviceScaleFactor: 3 });
  const p = await c.newPage();
  await p.goto('file://' + dir + '/flyer.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await p.screenshot({ path: dir + '/flyer.png' });
  await b.close();
})();
