// ============================================================
// Optimizacion de imagenes
// ------------------------------------------------------------
// GitHub Pages no transforma imagenes, y Polish/Image Resizing de
// Cloudflare son features de pago. Asi que la compresion se hace aca.
//
// Dos ideas centrales:
//
// 1. Dos variantes por foto. La grilla renderiza cards de ~304px de alto
//    y laminas en columnas de ~300px, pero ambas galerias abren un
//    lightbox a pantalla completa. Servir un solo archivo obliga a elegir
//    entre una grilla pesada o un lightbox borroso: se emite `card` para
//    la grilla y `full` solo para el lightbox, que carga al hacer click.
//
// 2. Art direction en el hero. El original es vertical (4284x5712) y el
//    CSS lo recorta con object-fit: cover. En un viewport horizontal eso
//    descarta la mayor parte de la imagen, asi que para desktop se
//    pre-recorta a 16:9 con el mismo punto focal que usa el CSS
//    (object-position: center 58%). Resultado visual identico, muchisimo
//    menos peso. Mobile sigue recibiendo la version vertical.
//
// Efecto secundario: al leer cada archivo obtenemos dimensiones reales,
// que van al manifest y alimentan width/height para eliminar el CLS.
// ============================================================

import { readdir, mkdir, writeFile, copyFile, stat } from 'node:fs/promises';
import { join, dirname, relative, basename, extname } from 'node:path';
import sharp from 'sharp';

const SRC = 'silvestra';
const OUT = 'dist';
const MANIFEST = join(SRC, 'image-manifest.json');

// El hero va detras de un overlay verde al 72% de opacidad, asi que
// tolera una compresion mucho mas agresiva sin diferencia perceptible.
const HERO = {
  portraitWidths: [480, 828],
  landscape: [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ],
  // Fraccion vertical del punto focal, igual a object-position: center 58%.
  focalY: 0.58,
  webp: 55,
  avif: 38,
};

// Borde largo de cada variante. `card` cubre 2x DPR en la grilla; `full`
// alcanza para verla a pantalla completa en el lightbox.
const CARD_EDGE = 700;
const CARD_QUALITY = 72;
const FULL_EDGE = 1600;
const FULL_QUALITY = 78;

const norm = (p) => p.split('\\').join('/').replace(/^\.\//, '');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function pool(items, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) await worker(items[cursor++]);
  });
  await Promise.all(runners);
}

const ensureDir = (file) => mkdir(dirname(file), { recursive: true });

function suffix(key, tag, ext) {
  const dir = dirname(key);
  const stem = basename(key, extname(key));
  return norm(join(dir === '.' ? '' : dir, `${stem}-${tag}.${ext}`));
}

// ---------- Hero ----------
async function buildHero(srcPath, key, manifest) {
  const meta = await sharp(srcPath).metadata();
  const stem = basename(srcPath, extname(srcPath));
  const emit = async (name, pipeline) => {
    const webpOut = norm(join('assets', `${name}.webp`));
    const avifOut = norm(join('assets', `${name}.avif`));
    await ensureDir(join(OUT, webpOut));
    await pipeline().webp({ quality: HERO.webp }).toFile(join(OUT, webpOut));
    await pipeline().avif({ quality: HERO.avif }).toFile(join(OUT, avifOut));
    return { webpOut, avifOut };
  };

  // Vertical, para viewports angostos (mobile en portrait).
  const portraitWebp = [];
  const portraitAvif = [];
  for (const width of HERO.portraitWidths) {
    const height = Math.round((meta.height / meta.width) * width);
    const { webpOut, avifOut } = await emit(`${stem}-p${width}`, () =>
      sharp(srcPath).resize({ width })
    );
    portraitWebp.push({ src: webpOut, w: width, h: height });
    portraitAvif.push({ src: avifOut, w: width, h: height });
  }

  // Horizontal 16:9 recortado en el mismo punto focal que el CSS.
  const cropHeight = Math.round(meta.width * (9 / 16));
  const top = Math.round((meta.height - cropHeight) * HERO.focalY);
  const landscapeWebp = [];
  const landscapeAvif = [];
  for (const { width, height } of HERO.landscape) {
    const { webpOut, avifOut } = await emit(`${stem}-l${width}`, () =>
      sharp(srcPath)
        .extract({ left: 0, top, width: meta.width, height: cropHeight })
        .resize({ width, height })
    );
    landscapeWebp.push({ src: webpOut, w: width, h: height });
    landscapeAvif.push({ src: avifOut, w: width, h: height });
  }

  const fallback = portraitWebp[portraitWebp.length - 1];
  manifest[key] = {
    width: fallback.w,
    height: fallback.h,
    out: fallback.src,
    hero: {
      portrait: { webp: portraitWebp, avif: portraitAvif },
      landscape: { webp: landscapeWebp, avif: landscapeAvif },
    },
  };
}

// ---------- Galeria y planos ----------
async function buildStandard(srcPath, key, manifest) {
  const meta = await sharp(srcPath).metadata();
  const outKey = norm(relative(SRC, srcPath)).replace(/\.(jpe?g|png)$/i, '.webp');

  const scaleTo = (edge) => {
    if (meta.width <= edge && meta.height <= edge) return { width: meta.width, height: meta.height };
    const ratio = meta.width >= meta.height ? edge / meta.width : edge / meta.height;
    return { width: Math.round(meta.width * ratio), height: Math.round(meta.height * ratio) };
  };

  const card = scaleTo(CARD_EDGE);
  const cardKey = suffix(outKey, 'card', 'webp');
  await ensureDir(join(OUT, cardKey));
  await sharp(srcPath).resize(card).webp({ quality: CARD_QUALITY }).toFile(join(OUT, cardKey));

  const full = scaleTo(FULL_EDGE);
  const fullKey = suffix(outKey, 'full', 'webp');
  await sharp(srcPath).resize(full).webp({ quality: FULL_QUALITY }).toFile(join(OUT, fullKey));

  manifest[key] = {
    width: card.width,
    height: card.height,
    out: cardKey,
    full: { src: fullKey, width: full.width, height: full.height },
  };
}

export async function optimizeImages({ log = console.log } = {}) {
  const files = await walk(join(SRC, 'assets'));
  const manifest = {};

  // hero-garden.jpg no esta referenciado en el codigo activo.
  const skip = new Set(['assets/hero-garden.jpg']);

  const raster = [];
  let copied = 0;
  let before = 0;

  for (const file of files) {
    const key = norm(relative(SRC, file));
    if (skip.has(key)) continue;
    before += (await stat(file)).size;

    // Los logos son PNG con transparencia y pesan poco: se copian tal cual
    // para no arriesgar artefactos en el trazo del logo.
    if (/\.(jpe?g|png|webp)$/i.test(file) && !/logo/i.test(key)) {
      raster.push({ file, key });
      continue;
    }

    const dest = join(OUT, key);
    await ensureDir(dest);
    await copyFile(file, dest);
    copied++;
    if (/logo/i.test(key)) {
      const meta = await sharp(file).metadata();
      manifest[key] = { width: meta.width, height: meta.height, out: key };
    }
  }

  log(`  ${raster.length} imagenes a optimizar, ${copied} copiadas sin cambios`);

  await pool(raster, 4, async ({ file, key }) => {
    if (key === 'assets/hero.jpg') await buildHero(file, key, manifest);
    else await buildStandard(file, key, manifest);
  });

  // `cards` es el total de las variantes de grilla, no lo que descarga una
  // visita: casi todas son loading="lazy". El peso real de la primera carga
  // lo mide scripts/verify.mjs contra el navegador.
  let cards = 0;
  let total = 0;
  for (const entry of Object.values(manifest)) {
    const add = async (src) => (await stat(join(OUT, src))).size;
    if (entry.hero) {
      const all = [
        ...entry.hero.portrait.webp,
        ...entry.hero.portrait.avif,
        ...entry.hero.landscape.webp,
        ...entry.hero.landscape.avif,
      ];
      for (const v of all) total += await add(v.src);
      cards += await add(entry.hero.landscape.avif.at(-1).src);
      continue;
    }
    const cardBytes = await add(entry.out);
    cards += cardBytes;
    total += cardBytes;
    if (entry.full) total += await add(entry.full.src);
  }

  await writeFile(MANIFEST, `${JSON.stringify({ images: manifest }, null, 2)}\n`, 'utf8');

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  log(`  origen ${mb(before)} | en disco ${mb(total)} | variantes card ${mb(cards)}`);

  return manifest;
}
