// ============================================================
// Build
// ------------------------------------------------------------
//   node scripts/build.mjs               build completo
//   node scripts/build.mjs --skip-images reusa dist/assets e image-manifest
//
// Pipeline: imagenes -> CSS -> bundle cliente -> bundle servidor ->
// prerender -> robots/sitemap/iconos.
// ============================================================

import { rm, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import esbuild from 'esbuild';
import sharp from 'sharp';

import { optimizeImages } from './optimize-images.mjs';
import { renderPage, renderRobots, renderSitemap } from './prerender.mjs';

const SRC = 'silvestra';
const OUT = 'dist';
const TMP = '.build';

const skipImages = process.argv.includes('--skip-images');
const log = (message) => console.log(message);
const hash = (content) => createHash('sha256').update(content).digest('hex').slice(0, 8);

async function write(file, content) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

const exists = (path) => stat(path).then(() => true, () => false);

// ---------- CSS ----------
// Un solo archivo en vez de tres requests. El orden importa: las
// @font-face primero, despues tokens y base, despues secciones.
async function buildCss() {
  const parts = [];
  for (const file of ['fonts.css', 'styles.css', 'sections.css']) {
    parts.push(await readFile(join(SRC, file), 'utf8'));
  }
  const { code } = await esbuild.transform(parts.join('\n'), {
    loader: 'css',
    minify: true,
  });
  const name = `silvestra.${hash(code)}.css`;
  await write(join(OUT, name), code);
  return { href: name, bytes: Buffer.byteLength(code) };
}

// ---------- Bundle del cliente ----------
async function buildClient() {
  const result = await esbuild.build({
    entryPoints: [join(SRC, 'entry.client.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2019'],
    jsx: 'automatic',
    loader: { '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' },
    write: false,
  });

  const code = result.outputFiles[0].contents;
  const name = `silvestra.${hash(code)}.js`;
  await write(join(OUT, name), code);
  return { href: name, bytes: code.byteLength };
}

// ---------- Bundle del servidor ----------
// react y react-dom quedan external: los resuelve Node desde node_modules.
async function buildServer() {
  const out = join(TMP, 'server.mjs');
  await esbuild.build({
    entryPoints: [join(SRC, 'entry.server.jsx')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: ['node20'],
    jsx: 'automatic',
    loader: { '.jsx': 'jsx' },
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outfile: out,
  });
  return out;
}

// ---------- Iconos ----------
// El favicon sale del logo existente. /favicon.ico daba 404, y el icono
// aparece en la pestaña del navegador y en algunos layouts de resultados.
async function buildIcons() {
  const logo = join(SRC, 'assets', 'logo-color-trim.png');

  // ICO no lo genera sharp: se usa un PNG de 32x32 servido como .ico,
  // que todos los navegadores actuales aceptan.
  const png32 = await sharp(logo)
    .resize(32, 32, { fit: 'contain', background: { r: 250, g: 248, b: 242, alpha: 1 } })
    .png()
    .toBuffer();
  await write(join(OUT, 'favicon.ico'), png32);

  const touch = await sharp(logo)
    .resize(180, 180, { fit: 'contain', background: { r: 250, g: 248, b: 242, alpha: 1 } })
    .png()
    .toBuffer();
  await write(join(OUT, 'apple-touch-icon.png'), touch);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0c3623"/><text x="16" y="23" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#faf8f2" text-anchor="middle">S</text></svg>`;
  await write(join(OUT, 'icon.svg'), svg);
}

// ---------- Imagen de Open Graph ----------
// 1200x630 recortado del hero con el logo encima. Es lo que se ve al
// compartir el link por WhatsApp o Instagram.
async function buildOgImage(site) {
  const hero = join(SRC, 'assets', 'hero.jpg');
  if (!(await exists(hero))) return;

  const base = await sharp(hero)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    // Mismo overlay verde que el hero, para que el logo crema se lea.
    .composite([{ input: { create: { width: 1200, height: 630, channels: 4, background: { r: 12, g: 54, b: 35, alpha: 0.55 } } } }])
    .jpeg({ quality: 82 })
    .toBuffer();

  const logo = await sharp(join(SRC, 'assets', 'logo-cream-trim.png'))
    .resize({ width: 460, fit: 'inside' })
    .png()
    .toBuffer();

  const composed = await sharp(base)
    .composite([{ input: logo, gravity: 'center' }])
    .jpeg({ quality: 82 })
    .toBuffer();

  await write(join(OUT, site.ogImage), composed);
}

async function main() {
  const started = Date.now();
  log('\nSilvestra — build\n');

  if (skipImages && !(await exists(join(SRC, 'image-manifest.json')))) {
    throw new Error('--skip-images requiere un image-manifest.json ya generado');
  }

  // 1. Imagenes. Genera image-manifest.json, que importan los componentes,
  //    asi que va antes de cualquier bundle.
  if (skipImages) {
    log('1/6 imagenes: omitido (--skip-images)');
  } else {
    log('1/6 imagenes');
    await rm(OUT, { recursive: true, force: true });
    await optimizeImages({ log });
  }
  await mkdir(OUT, { recursive: true });

  // 2. CSS
  const css = await buildCss();
  log(`2/6 css: ${css.href} (${(css.bytes / 1024).toFixed(1)} KB)`);

  // 3. Cliente
  const js = await buildClient();
  log(`3/6 js: ${js.href} (${(js.bytes / 1024).toFixed(1)} KB)`);

  // 4. Servidor + prerender
  const serverPath = await buildServer();
  const importAbs = (path) => import(pathToFileURL(join(process.cwd(), path)).href);
  const { App, content } = await importAbs(serverPath);
  const { site, business, pages } = await importAbs(join(SRC, 'site.mjs'));

  log('4/6 prerender');
  for (const page of pages) {
    const html = renderPage({
      site,
      business,
      content,
      page,
      App: React.createElement(App),
      cssHref: css.href,
      jsHref: js.href,
    });
    const file = page.path ? join(OUT, page.path, 'index.html') : join(OUT, 'index.html');
    await write(file, html);
    log(`    ${page.path || '/'} -> ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
  }

  // 5. robots + sitemap
  const lastmod = new Date().toISOString().slice(0, 10);
  await write(join(OUT, 'robots.txt'), renderRobots({ site }));
  await write(join(OUT, 'sitemap.xml'), renderSitemap({ site, pages, lastmod }));
  log('5/6 robots.txt + sitemap.xml');

  // 6. Iconos, OG y CNAME
  await buildIcons();
  await buildOgImage(site);
  await write(join(OUT, 'CNAME'), await readFile(join(SRC, 'CNAME')));
  log('6/6 iconos + og-image + CNAME');

  await rm(TMP, { recursive: true, force: true });
  log(`\nlisto en ${((Date.now() - started) / 1000).toFixed(1)}s -> ${OUT}/\n`);
}

main().catch((error) => {
  console.error('\nbuild fallo:\n', error);
  process.exit(1);
});
