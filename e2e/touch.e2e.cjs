/**
 * Real touch interaction tests (Chromium, iPhone emulation, genuine touch
 * events through the DevTools protocol → pointer events of type "touch").
 *
 *   npm run build && npm run preview   # in another terminal
 *   npm run e2e                        # BASE_URL defaults to http://localhost:4173/
 */
const path = require('node:path');
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require(require.resolve('playwright', { paths: (process.env.NODE_PATH || '/opt/node-tools/node_modules').split(path.delimiter) }));
}
const { chromium, devices } = pw;
const BASE = process.env.BASE_URL || 'http://localhost:4173/';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText('Nouvelle partie').click();
  await page.getByText('Facile', { exact: true }).click();
  await page.waitForSelector('[role=grid]');
  await sleep(400);

  const cdp = await ctx.newCDPSession(page);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('chatdoku.state.v1')).state.game);
  const { size: N, solution } = (await state()).puzzle;
  const box = await page.locator('[role=grid]').boundingBox();
  const inner = { x: box.x + 3, y: box.y + 3, w: box.width - 6, h: box.height - 6 };
  const xy = (r, c) => ({ x: inner.x + ((c + 0.5) * inner.w) / N, y: inner.y + ((r + 0.5) * inner.h) / N });
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  const tap = async (r, c) => {
    await touch('touchStart', xy(r, c));
    await sleep(40);
    await touch('touchEnd');
  };
  const doubleTap = async (r, c, gap = 90) => {
    await tap(r, c);
    await sleep(gap);
    await tap(r, c);
  };
  const drag = async (points, stepDelay = 16) => {
    await touch('touchStart', points[0]);
    for (const p of points.slice(1)) {
      await sleep(stepDelay);
      await touch('touchMove', p);
    }
    await sleep(stepDelay);
    await touch('touchEnd');
  };
  const mark = async (r, c) => (await state()).marks[r * N + c];
  const settle = () => sleep(380); // past the double tap window

  // Count stray click events and zoom/scroll changes during the whole run.
  // Registered on window (before the document-level guard) to see every click
  // and whether it was neutralised.
  await page.evaluate(() => {
    window.__clicks = [];
    window.addEventListener('click', (e) => {
      if (!e.defaultPrevented) window.__clicks.push(e.target.closest('button')?.textContent?.trim() || e.target.tagName);
    }, false);
  });

  // Free row/column for the tests: rows 1..3 of the grid, avoiding solution cells.
  const free = (r) => [...Array(N).keys()].find((c) => c !== solution[r]);

  // 1. Tap → cross
  await tap(1, free(1));
  await sleep(60);
  check('Tap simple : une croix apparaît', (await mark(1, free(1))) === 'cross');
  await settle();
  // 2. Tap on cross → removed
  await tap(1, free(1));
  await sleep(60);
  check('Tap sur une croix : elle disparaît', (await mark(1, free(1))) === 'empty');
  await settle();

  // 3. Double tap → cat (solution cell of row 0)
  await doubleTap(0, solution[0]);
  await sleep(120);
  let g = await state();
  check('Double tap : un chat apparaît', g.marks[solution[0]] === 'cat' && g.lives === 3, `croix restantes ${g.marks.filter((m) => m === 'cross').length}`);
  check('Double tap : aucune croix résiduelle', g.marks.filter((m) => m === 'cross').length === 0);
  await settle();

  // 4. Slow double tap → two simple taps (cross then removed)
  const sr = 2, sc = free(2);
  await tap(sr, sc);
  await sleep(450);
  await tap(sr, sc);
  await sleep(60);
  g = await state();
  check('Double tap trop lent : deux taps simples', g.marks[sr * N + sc] === 'empty' && g.marks.filter((m) => m === 'cat').length === 1);
  await settle();

  // 5. Drag over 3 cells → 3 crosses (row N-1, starting col 0..2) + single undo
  const rDrag = N - 1;
  await drag([xy(rDrag, 0), xy(rDrag, 1), xy(rDrag, 2)], 30);
  await sleep(80);
  g = await state();
  const three = [0, 1, 2].map((c) => g.marks[rDrag * N + c]);
  check('Glissement sur 3 cases : 3 croix', three.every((m) => m === 'cross'), three.join(','));
  await page.getByRole('button', { name: 'Annuler' }).click(); // right after a gesture: must not be swallowed
  await sleep(80);
  g = await state();
  check('Annuler retire tout le tracé d’un coup', [0, 1, 2].every((c) => g.marks[rDrag * N + c] === 'empty'));
  await settle();

  // 6. Fast drag over 8 cells: one single move event from first to last column.
  const rFast = N - 2;
  await drag([xy(rFast, 0), xy(rFast, N - 1)], 8);
  await sleep(80);
  g = await state();
  const fast = [...Array(N).keys()].map((c) => g.marks[rFast * N + c]);
  check(`Glissement rapide sur ${N} cases : aucune oubliée`, fast.every((m) => m === 'cross'), fast.map((m) => m[1]).join(''));
  await settle();

  // 7. Drag across the cat of row 0 → cat untouched
  const c0 = solution[0];
  const from = Math.max(0, c0 - 2), to = Math.min(N - 1, c0 + 2);
  await drag([xy(0, from), xy(0, to)], 16);
  await sleep(80);
  g = await state();
  check('Glissement sur un chat : pas de remplacement', g.marks[c0] === 'cat');
  await settle();

  // 8. Drag out of the grid → no error, no scroll
  await drag([xy(3, 2), { x: xy(3, 2).x, y: box.y - 120 }, { x: box.x + box.width + 80, y: box.y - 40 }, { x: 5, y: 5 }], 16);
  await sleep(80);
  const scroll = await page.evaluate(() => ({ y: window.scrollY, top: document.scrollingElement.scrollTop, scale: window.visualViewport.scale }));
  check('Glissement hors de la grille : aucune erreur', errors.length === 0);
  check('Aucun scroll pendant le tracé', scroll.y === 0 && scroll.top === 0, JSON.stringify(scroll));
  await settle();

  // 9. Invalid cat → exactly one life lost even if several rules are broken
  const bad = solution[0] === 0 ? 1 : solution[0] - 1; // row 0 + touching + maybe region
  g = await state();
  const livesBefore = g.lives;
  await doubleTap(0, bad === solution[0] ? bad + 1 : bad);
  await sleep(150);
  g = await state();
  check('Chat invalide (plusieurs règles) : une seule vie retirée', g.lives === livesBefore - 1, `${livesBefore} → ${g.lives}`);
  const heartsAria = await page.locator('[role=status][aria-label*="vie"]').getAttribute('aria-label');
  check('Compteur de vies mis à jour immédiatement', heartsAria.startsWith(`${g.lives} vie`), heartsAria);
  // Same invalid double tap again on the same cell: never charged twice.
  await settle();
  await doubleTap(0, bad === solution[0] ? bad + 1 : bad);
  await sleep(150);
  check('Même erreur répétée : pas de vie en plus', (await state()).lives === g.lives);
  await settle();

  // 10. Double tap on a (correct, locked) cat → stays, info message
  await doubleTap(0, solution[0]);
  await sleep(150);
  g = await state();
  const info = await page.getByText('il ne bouge plus').waitFor({ timeout: 1500 }).then(() => true, () => false);
  check('Double tap sur un chat : comportement cohérent (verrouillé en mode strict)', g.marks[solution[0]] === 'cat' && info);
  await settle();

  // 11. No zoom, no clicks leaking from the grid gestures
  const vp = await page.evaluate(() => ({ scale: window.visualViewport.scale, clicks: window.__clicks }));
  check('Aucun zoom involontaire', vp.scale === 1, `scale ${vp.scale}`);
  const gridClicks = vp.clicks.filter((c) => c !== 'Annuler');
  check('Aucun conflit pointer/click (aucun click émis par la grille)', gridClicks.length === 0, JSON.stringify(vp.clicks));

  // 12. Finish the grid with double taps → victory
  for (let r = 1; r < N; r++) {
    await doubleTap(r, solution[r]);
    await settle();
  }
  await sleep(600);
  g = await state();
  check('Victoire en double-tapant la solution', g.status === 'won', `vies ${g.lives}`);
  check('Aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} scénarios OK`);
  process.exit(failed.length ? 1 : 0);
})();
