// ============================================================
// Descarga de fuentes para autohospedarlas
// ------------------------------------------------------------
// styles.css usaba @import de fonts.googleapis.com, que serializa
// cuatro round trips bloqueantes antes de pintar texto:
//   HTML -> styles.css -> CSS de Google -> archivos .woff2
// Autohospedando queda un solo salto, desde el mismo dominio.
//
// Se corre a mano cuando cambian las familias o los pesos:
//   node scripts/fetch-fonts.mjs
// El resultado se commitea; el build no depende de la red.
// ============================================================

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const GOOGLE_CSS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap';

// UA moderno: sin esto Google devuelve TTF en vez de WOFF2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const OUT_DIR = join('silvestra', 'assets', 'fonts');
const OUT_CSS = join('silvestra', 'fonts.css');

// El sitio es en español: alcanza con latin y latin-ext. Los subsets
// cirilico, griego y vietnamita se descartan (de 48 archivos a 12).
const KEEP_SUBSETS = {
  'U+0000-00FF': 'latin',
  'U+0100-02BA': 'latin-ext',
};

const subsetOf = (unicodeRange) => {
  for (const [prefix, name] of Object.entries(KEEP_SUBSETS)) {
    if (unicodeRange.trim().startsWith(prefix)) return name;
  }
  return null;
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const css = await (await fetch(GOOGLE_CSS, { headers: { 'User-Agent': UA } })).text();

  const blocks = css.match(/@font-face\s*{[^}]+}/g) || [];
  await mkdir(OUT_DIR, { recursive: true });

  const out = [
    '/* ============================================================',
    '   SILVESTRA — fuentes autohospedadas',
    '   Generado por scripts/fetch-fonts.mjs. No editar a mano.',
    '   ============================================================ */',
    '',
  ];
  let kept = 0;

  for (const block of blocks) {
    const pick = (re) => (block.match(re) || [])[1];
    const family = pick(/font-family:\s*'([^']+)'/);
    const style = pick(/font-style:\s*(\w+)/) || 'normal';
    const weight = pick(/font-weight:\s*(\d+)/) || '400';
    const range = pick(/unicode-range:\s*([^;]+)/);
    const url = pick(/url\((https:[^)]+\.woff2)\)/);
    if (!family || !range || !url) continue;

    const subset = subsetOf(range);
    if (!subset) continue;

    const file = `${slug(family)}-${weight}-${style}-${subset}.woff2`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(join(OUT_DIR, file), bytes);
    kept++;

    out.push(
      '@font-face {',
      `  font-family: '${family}';`,
      `  font-style: ${style};`,
      `  font-weight: ${weight};`,
      // swap: el texto se ve de inmediato con la fuente de sistema y
      // se reemplaza al cargar. Evita bloquear el render.
      '  font-display: swap;',
      `  src: url('assets/fonts/${file}') format('woff2');`,
      `  unicode-range: ${range.trim()};`,
      '}',
      ''
    );
    console.log(`  ${file} (${(bytes.length / 1024).toFixed(1)} KB)`);
  }

  await writeFile(OUT_CSS, `${out.join('\n')}`, 'utf8');
  console.log(`\n${kept} archivos woff2 -> ${OUT_DIR}`);
  console.log(`CSS -> ${OUT_CSS}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
