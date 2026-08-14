// ============================================================
// SILVESTRA — puente entre el manifest de imagenes y los componentes
// ------------------------------------------------------------
// El manifest lo genera scripts/optimize-images.mjs. Traduce la ruta
// original (la que se escribe en content.jsx) a la ruta optimizada y
// aporta width/height reales para evitar layout shift.
// ============================================================

import manifest from './image-manifest.json';

const images = manifest.images || {};

const norm = (src) => String(src).replace(/^\.\//, '');

const entryOf = (src) => images[norm(src)];

/**
 * Atributos para un <img> de grilla: variante `card`, liviana. Si el
 * manifest no conoce el archivo devuelve la ruta original, para que el
 * sitio nunca quede con imagenes rotas.
 */
export function img(src) {
  const entry = entryOf(src);
  if (!entry) return { src: norm(src) };
  return { src: entry.out, width: entry.width, height: entry.height };
}

/**
 * Atributos para el lightbox: variante `full`, en resolucion alta. Se
 * pide recien al abrir, asi que no afecta el peso de la primera carga.
 */
export function imgFull(src) {
  const entry = entryOf(src);
  if (!entry) return { src: norm(src) };
  if (!entry.full) return { src: entry.out, width: entry.width, height: entry.height };
  return { src: entry.full.src, width: entry.full.width, height: entry.full.height };
}

/**
 * Fuentes del hero para <picture>, con art direction: recorte horizontal
 * en desktop y vertical en mobile, AVIF antes que WebP en ambos casos.
 * Devuelve null si el hero no paso por el pipeline.
 */
export function heroPicture(src) {
  const entry = entryOf(src);
  if (!entry || !entry.hero) return null;

  const srcset = (list) => list.map((v) => `${v.src} ${v.w}w`).join(', ');
  const { portrait, landscape } = entry.hero;
  const fallback = portrait.webp[portrait.webp.length - 1];

  return {
    // El breakpoint coincide con el de la navegacion mobile en styles.css.
    desktopMedia: '(min-width: 821px)',
    landscapeAvif: srcset(landscape.avif),
    landscapeWebp: srcset(landscape.webp),
    portraitAvif: srcset(portrait.avif),
    portraitWebp: srcset(portrait.webp),
    src: fallback.src,
    width: fallback.w,
    height: fallback.h,
    sizes: '100vw',
  };
}
