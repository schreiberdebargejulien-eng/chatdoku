/**
 * Generates the app icons from the CatArt component.
 * Run with: npm run icons
 */
import { writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import { CatArt } from '../src/cats/CatArt';
import { CLASSIC_COLLECTION } from '../src/cats/collections';

function iconSvg({ maskable, rounded }: { maskable: boolean; rounded: boolean }): string {
  const cat = CLASSIC_COLLECTION.cats[0]!;
  const inner = renderToStaticMarkup(<CatArt cat={cat} />)
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
  const scale = maskable ? 0.62 : 0.78;
  const offset = (1 - scale) * 512 / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="#FFF8EE"/><stop offset="100%" stop-color="#F6E7D3"/></radialGradient></defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${offset} ${offset + 10}) scale(${(512 * scale) / 100})">${inner}</g>
</svg>`;
}

test('generate icons', async () => {
  writeFileSync('public/favicon.svg', iconSvg({ maskable: false, rounded: true }));
  writeFileSync('public/icon-source.svg', iconSvg({ maskable: false, rounded: false }));
  // Playwright may be installed globally (e.g. NODE_PATH); fall back to a dynamic require.
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  let pw: typeof import('playwright');
  try {
    pw = req('playwright');
  } catch {
    pw = req(req.resolve('playwright', { paths: (process.env.NODE_PATH ?? '/opt/node-tools/node_modules').split(':') }));
  }
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const shots: [string, number, boolean][] = [
    ['public/pwa-192.png', 192, false],
    ['public/pwa-512.png', 512, false],
    ['public/pwa-maskable-512.png', 512, true],
    ['public/apple-touch-icon.png', 180, false],
  ];
  for (const [file, size, maskable] of shots) {
    await page.setViewportSize({ width: size, height: size });
    const svg = iconSvg({ maskable, rounded: false }).replace('width="512" height="512"', `width="${size}" height="${size}"`);
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: file, omitBackground: false });
  }
  await browser.close();
}, 60_000);
