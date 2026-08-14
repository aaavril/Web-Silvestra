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
// __BUILD_DATE__ va por `define` y no por props del componente: el cliente
// hidrata con <App /> sin props (ver entry.client.jsx), asi que la fecha tiene
// que ser la MISMA constante en los dos bundles o la hidratacion no coincide.
async function buildClient(lastmod) {
  const result = await esbuild.build({
    entryPoints: [join(SRC, 'entry.client.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2019'],
    jsx: 'automatic',
    loader: { '.jsx': 'jsx' },
    define: {
      'process.env.NODE_ENV': '"production"',
      __BUILD_DATE__: JSON.stringify(lastmod),
    },
    write: false,
  });

  const code = result.outputFiles[0].contents;
  const name = `silvestra.${hash(code)}.js`;
  await write(join(OUT, name), code);
  return { href: name, bytes: code.byteLength };
}

// ---------- Bundle del servidor ----------
// react y react-dom quedan external: los resuelve Node desde node_modules.
async function buildServer(lastmod) {
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
    define: { __BUILD_DATE__: JSON.stringify(lastmod) },
    outfile: out,
  });
  return out;
}

// ---------- Iconos ----------
// El logo es emblema (la mata con las bayas y los dos arcos) mas la palabra
// "SiLVesTra PAISAJISMO". A tamaño de favicon la palabra es ilegible, asi que
// se usa solo el emblema: se toma la franja superior del logo y se deja que
// sharp recorte al contenido real, para no depender de coordenadas fijas si
// algun dia cambia el archivo.
const EMBLEM_BAND = 0.64;

// Google no usa favicons menores a 48x48: los ignora y muestra el globo
// genérico al lado del resultado. Se emiten multiplos de 48.
const ICON_SIZES = [48, 96, 192];

// Fondo crema en vez de transparente: el emblema es verde oscuro y sobre
// una pestaña en tema oscuro quedaria casi invisible.
const ICON_BG = { r: 250, g: 248, b: 242, alpha: 1 };

async function buildIcons() {
  const logo = join(SRC, 'assets', 'logo-color-trim.png');
  const meta = await sharp(logo).metadata();

  const band = await sharp(logo)
    .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * EMBLEM_BAND) })
    .png()
    .toBuffer();
  // trim() en un pipeline aparte: encadenarlo al extract falla.
  const emblem = await sharp(band).trim().png().toBuffer();

  // Emblema centrado sobre un lienzo crema del tamaño pedido.
  const icon = async (size, padding = 0) => {
    const inner = await sharp(emblem)
      .resize(size - padding * 2, size - padding * 2, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    return sharp({ create: { width: size, height: size, channels: 4, background: ICON_BG } })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toBuffer();
  };

  for (const size of ICON_SIZES) {
    const png = await icon(size);
    await write(join(OUT, `icon-${size}.png`), png);
    // favicon.ico es el mismo PNG de 48: los navegadores actuales lo aceptan
    // con esa extension, y es el tamaño minimo que Google usa.
    if (size === 48) await write(join(OUT, 'favicon.ico'), png);
  }

  // apple-touch-icon lleva margen porque iOS le aplica esquinas redondeadas
  // y recorta un poco el borde.
  await write(join(OUT, 'apple-touch-icon.png'), await icon(180, 18));
}

// ---------- Imagen de Open Graph ----------
// 1200x630 recortado del hero con el logo encima. Es lo que se ve al
// compartir el link por WhatsApp o Instagram.
async function buildOgImage(site, og) {
  // Una imagen propia ya diseñada gana sobre la generada.
  const custom = join(SRC, 'assets', 'og-custom.jpg');
  if (await exists(custom)) {
    const meta = await sharp(custom).metadata();
    if (meta.width !== 1200 || meta.height !== 630) {
      log(`    aviso: og-custom.jpg mide ${meta.width}x${meta.height}, se espera 1200x630`);
    }
    await write(join(OUT, site.ogImage), await readFile(custom));
    return 'og-custom.jpg';
  }

  const source = join(SRC, og.source);
  if (!(await exists(source))) {
    log(`    aviso: no encontre ${og.source}, se omite la imagen de preview`);
    return null;
  }

  const base = await sharp(source)
    .resize(1200, 630, { fit: 'cover', position: og.crop })
    // Velo verde, el mismo criterio que el hero: sin el, el logo crema
    // no se lee sobre una foto clara.
    .composite([
      {
        input: {
          create: {
            width: 1200,
            height: 630,
            channels: 4,
            background: { r: 12, g: 54, b: 35, alpha: og.overlay },
          },
        },
      },
    ])
    .jpeg({ quality: 82 })
    .toBuffer();

  const logo = await sharp(join(SRC, 'assets', 'logo-cream-trim.png'))
    .resize({ width: og.logoWidth, fit: 'inside' })
    .png()
    .toBuffer();

  const composed = await sharp(base)
    .composite([{ input: logo, gravity: 'center' }])
    .jpeg({ quality: 82 })
    .toBuffer();

  await write(join(OUT, site.ogImage), composed);
  return og.source;
}

async function main() {
  const started = Date.now();
  log('\nSilvestra — build\n');

  // Fecha del build. La usan el sitemap, el dateModified del JSON-LD y el
  // "Actualizado en ..." del footer, asi que se calcula una sola vez y antes
  // de los bundles: los tres tienen que decir lo mismo.
  const lastmod = new Date().toISOString().slice(0, 10);

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
  const js = await buildClient(lastmod);
  log(`3/6 js: ${js.href} (${(js.bytes / 1024).toFixed(1)} KB)`);

  // 4. Servidor + prerender
  const serverPath = await buildServer(lastmod);
  const importAbs = (path) => import(pathToFileURL(join(process.cwd(), path)).href);
  const { App, content } = await importAbs(serverPath);
  const { site, business, pages, og } = await importAbs(join(SRC, 'site.mjs'));

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
      lastmod,
    });
    const file = page.path ? join(OUT, page.path, 'index.html') : join(OUT, 'index.html');
    await write(file, html);
    log(`    ${page.path || '/'} -> ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
  }

  // 5. robots + sitemap
  await write(join(OUT, 'robots.txt'), renderRobots({ site }));
  await write(join(OUT, 'sitemap.xml'), renderSitemap({ site, pages, lastmod }));
  log('5/6 robots.txt + sitemap.xml');

  // 6. Iconos, OG y CNAME
  await buildIcons();
  const ogFrom = await buildOgImage(site, og);
  await write(join(OUT, 'CNAME'), await readFile(join(SRC, 'CNAME')));
  log(`6/6 iconos + CNAME + og-image${ogFrom ? ` desde ${ogFrom}` : ''}`);

  await rm(TMP, { recursive: true, force: true });
  log(`\nlisto en ${((Date.now() - started) / 1000).toFixed(1)}s -> ${OUT}/\n`);
}

main().catch((error) => {
  console.error('\nbuild fallo:\n', error);
  process.exit(1);
});
