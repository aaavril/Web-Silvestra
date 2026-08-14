// ============================================================
// Verificacion del build en un navegador real
// ------------------------------------------------------------
//   node scripts/verify.mjs
//
// El riesgo principal del prerender es que la hidratacion falle: el HTML
// se veria bien pero nada seria interactivo, y los .reveal quedarian con
// opacity: 0 para siempre. Esto lo comprueba de verdad, manejando Chrome
// headless por CDP (sin dependencias: Node 22 trae WebSocket global).
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const URL_BASE = process.argv[2] || 'http://localhost:4173';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const findChrome = () => CHROME_CANDIDATES.find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForJson(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`no respondio: ${url}`);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text || 'error al evaluar');
    return result.value;
  }
}

const checks = [];
const record = (ok, label, detail = '') => {
  checks.push({ ok, label, detail });
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error('no encontre Chrome ni Edge');

  const profile = await mkdtemp(join(tmpdir(), 'silvestra-verify-'));
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ]);
  proc.on('error', (e) => console.error(e));

  try {
    const targets = await waitForJson('http://localhost:9222/json/list');
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    const cdp = new CDP(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');

    console.log(`\nVerificando ${URL_BASE}\n`);
    await cdp.send('Page.navigate', { url: `${URL_BASE}/` });
    await sleep(3500);

    // --- Errores de consola e hidratacion ---
    const consoleErrors = cdp.events
      .filter((e) => e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type))
      .map((e) => e.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    const logErrors = cdp.events
      .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
      .map((e) => e.params.entry.text);
    const exceptions = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params.exceptionDetails.text);

    const allErrors = [...consoleErrors, ...logErrors, ...exceptions];
    const hydrationErrors = allErrors.filter((t) => /hydrat|did not match|Minified React error/i.test(t));

    record(hydrationErrors.length === 0, 'sin errores de hidratacion', hydrationErrors[0] || '');
    record(exceptions.length === 0, 'sin excepciones JS', exceptions[0] || '');

    // --- Requests fallidos ---
    const failed = cdp.events
      .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
      .map((e) => `${e.params.response.status} ${e.params.response.url}`);
    record(failed.length === 0, 'sin requests fallidos', failed.slice(0, 3).join(', '));

    // --- Hidratacion efectiva: React monta y el reveal se activa ---
    const revealActive = await cdp.eval(
      "document.querySelectorAll('.reveal.in').length"
    );
    record(revealActive > 0, 'reveal activado por JS', `${revealActive} elementos con .in`);

    const jsClass = await cdp.eval("document.documentElement.classList.contains('js')");
    record(jsClass === true, 'clase .js aplicada al <html>');

    // --- Estructura on-page ---
    const h1 = await cdp.eval("document.querySelectorAll('h1').length");
    record(h1 === 1, 'un solo H1', `encontrados: ${h1}`);

    const h1Text = await cdp.eval("document.querySelector('h1').textContent.trim()");
    record(/Punta del Este|jardines/i.test(h1Text), 'H1 con keyword', h1Text);

    const h4 = await cdp.eval("document.querySelectorAll('h4').length");
    record(h4 === 0, 'sin saltos de nivel (h4)', `h4: ${h4}`);

    // --- Señales para buscadores con IA ---
    // El JSON-LD es lo unico del sitio que un modelo lee como dato duro en vez
    // de prosa. Un nodo mal formado no se nota a la vista pero anula la señal
    // entera, asi que se parsea de verdad en vez de solo chequear que exista.
    const schemas = await cdp.eval(`(() => {
      const out = { total: 0, invalidos: 0, tipos: [], founder: null, dateModified: null };
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        out.total++;
        let data;
        try { data = JSON.parse(el.textContent); } catch { out.invalidos++; continue; }
        out.tipos.push(data['@type']);
        if (data.founder && data.founder.name) out.founder = data.founder.name;
        if (data.dateModified) out.dateModified = data.dateModified;
      }
      return out;
    })()`);
    record(
      schemas.total > 0 && schemas.invalidos === 0,
      'JSON-LD parsea',
      `${schemas.total} nodos: ${schemas.tipos.join(', ')}`
    );

    // Sin una persona con formacion declarada, un estudio de una sola persona
    // no tiene ninguna señal de autoridad que Google o un modelo puedan usar.
    record(Boolean(schemas.founder), 'schema con founder (E-E-A-T)', schemas.founder || 'ausente');

    // Un dateModified de mas de 18 meses equivale a no tenerlo: los motores
    // deprioritizan contenido viejo, y Perplexity es el mas estricto de todos.
    const meses = schemas.dateModified
      ? (Date.now() - Date.parse(schemas.dateModified)) / (1000 * 60 * 60 * 24 * 30.44)
      : Infinity;
    record(
      meses >= 0 && meses < 18,
      'dateModified vigente',
      schemas.dateModified ? `${schemas.dateModified} (${meses.toFixed(1)} meses)` : 'ausente'
    );

    // La frase definicional es lo que un modelo levanta tal cual para responder
    // "que es Silvestra". Tiene que empezar por el nombre completo: si arranca
    // con un pronombre o una abreviatura deja de ser autocontenida.
    const definicion = await cdp.eval(
      "(document.querySelector('.filo-definition') || {}).textContent || ''"
    );
    record(
      /^\s*Silvestra Paisajismo es /.test(definicion),
      'frase definicional extraible',
      definicion.trim().slice(0, 64) || 'ausente'
    );

    const fecha = await cdp.eval(
      "(document.querySelector('.footer-foot time') || {}).dateTime || ''"
    );
    record(/^\d{4}-\d{2}-\d{2}$/.test(fecha), 'fecha visible en el footer', fecha || 'ausente');

    // --- Metricas ---
    // Se miden ANTES de cualquier interaccion: abrir un lightbox pinta una
    // imagen a pantalla completa que pasaria a ser el candidato a LCP y
    // ensuciaria la medicion.
    const lcp = await cdp.eval(`new Promise((resolve) => {
      let value = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) value = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve(Math.round(value)), 600);
    })`);
    record(lcp > 0 && lcp < 2500, 'LCP local bajo 2.5s', `${lcp} ms`);

    const cls = await cdp.eval(`new Promise((resolve) => {
      let total = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => resolve(Number(total.toFixed(4))), 600);
    })`);
    record(cls < 0.1, 'CLS bajo 0.1', String(cls));

    // --- Peso real de la primera carga ---
    // Lo que el navegador efectivamente descargo, con lazy loading activo.
    // Es el numero honesto: el total de archivos en disco es mucho mayor.
    const transfer = await cdp.eval(`(() => {
      const res = performance.getEntriesByType('resource');
      const by = (re) => res.filter(r => re.test(r.name))
        .reduce((sum, r) => sum + (r.encodedBodySize || 0), 0);
      const doc = performance.getEntriesByType('navigation')[0];
      return {
        html: Math.round((doc?.encodedBodySize || 0) / 1024),
        css: Math.round(by(/\\.css/) / 1024),
        js: Math.round(by(/\\.js$/) / 1024),
        fonts: Math.round(by(/\\.woff2/) / 1024),
        img: Math.round(by(/\\.(webp|avif|png|jpg)/) / 1024),
        total: Math.round((res.reduce((s, r) => s + (r.encodedBodySize || 0), 0) + (doc?.encodedBodySize || 0)) / 1024),
        imgCount: res.filter(r => /\\.(webp|avif)/.test(r.name)).length,
      };
    })()`);
    console.log(
      `       html ${transfer.html} KB · css ${transfer.css} KB · js ${transfer.js} KB · ` +
      `fuentes ${transfer.fonts} KB · imagenes ${transfer.img} KB (${transfer.imgCount} archivos)`
    );
    record(transfer.total < 1500, 'primera carga bajo 1.5 MB', `${transfer.total} KB`);

    // React 18 batchea los setState, asi que hay que esperar el re-render
    // antes de leer el DOM. Sin esto el test lee el estado anterior.
    const tick = 'await new Promise(r => setTimeout(r, 120));';

    // --- Interactividad: menu mobile ---
    const menuWorks = await cdp.eval(`(async () => {
      const btn = document.querySelector('.nav-toggle');
      if (!btn) return 'sin boton';
      btn.click();
      ${tick}
      const open = document.querySelector('.site-header').classList.contains('menu-open');
      btn.click();
      ${tick}
      const closed = !document.querySelector('.site-header').classList.contains('menu-open');
      return open && closed ? 'ok' : \`abrio: \${open}, cerro: \${closed}\`;
    })()`);
    record(menuWorks === 'ok', 'menu mobile abre y cierra', menuWorks);

    // --- Interactividad: lightbox del portfolio ---
    const lightboxWorks = await cdp.eval(`(async () => {
      const btn = document.querySelector('.gallery-open:not([disabled])');
      if (!btn) return 'sin boton';
      btn.click();
      ${tick}
      const box = document.querySelector('.portfolio-lightbox');
      if (!box) return 'no abrio';
      const src = box.querySelector('img').getAttribute('src') || '';
      document.querySelector('.portfolio-lightbox-close').click();
      ${tick}
      const closed = !document.querySelector('.portfolio-lightbox');
      if (!closed) return 'no cerro';
      // El lightbox debe pedir la variante full, no la de la grilla.
      return src.includes('-full') ? 'ok' : \`variante incorrecta: \${src}\`;
    })()`);
    record(lightboxWorks === 'ok', 'lightbox abre, cierra y usa variante full', lightboxWorks);

    // --- Interactividad: lightbox de planos ---
    const planosWorks = await cdp.eval(`(async () => {
      const piece = document.querySelector('.plan-piece');
      if (!piece) return 'sin lamina';
      piece.click();
      ${tick}
      const box = document.querySelector('.plan-lightbox');
      if (!box) return 'no abrio';
      const src = box.querySelector('img').getAttribute('src') || '';
      document.querySelector('.plan-lightbox-close').click();
      ${tick}
      return src.includes('-full') ? 'ok' : \`variante incorrecta: \${src}\`;
    })()`);
    record(planosWorks === 'ok', 'lightbox de planos abre y usa variante full', planosWorks);

    // --- Imagenes: dimensiones declaradas y sin roturas ---
    const imgStats = await cdp.eval(`(() => {
      const imgs = [...document.querySelectorAll('img')];
      return {
        total: imgs.length,
        broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
        sinDims: imgs.filter(i => !i.getAttribute('width') && !i.closest('picture')).length,
      };
    })()`);
    record(imgStats.broken === 0, 'ninguna imagen rota', `${imgStats.total} imagenes`);
    record(imgStats.sinDims === 0, 'todas con width/height', `sin dims: ${imgStats.sinDims}`);

    // --- Deformacion ---
    // Poner width/height en el <img> evita el layout shift, pero si el CSS
    // fija solo una dimension el navegador usa el ancho del atributo y
    // deforma la imagen. Compara proporcion renderizada contra la real.
    const distorted = await cdp.eval(`(() => {
      return [...document.querySelectorAll('img')]
        .filter(i => i.naturalWidth > 0 && i.clientWidth > 0 && i.clientHeight > 0)
        .filter(i => getComputedStyle(i).objectFit === 'fill')
        .map(i => ({
          src: i.currentSrc.split('/').pop(),
          real: i.naturalWidth / i.naturalHeight,
          shown: i.clientWidth / i.clientHeight,
        }))
        .filter(i => Math.abs(i.real - i.shown) / i.real > 0.02)
        .map(i => \`\${i.src} (\${i.real.toFixed(2)} vs \${i.shown.toFixed(2)})\`);
    })()`);
    record(distorted.length === 0, 'ninguna imagen deformada', distorted.slice(0, 3).join(', '));

    // --- Estilos que dependen del nivel de encabezado ---
    // Al pasar los titulos de servicios de h4 a h3 el selector de CSS quedo
    // apuntando al nivel viejo y los titulos perdieron su estilo.
    const stepStyle = await cdp.eval(`(() => {
      const el = document.querySelector('.step h3');
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      return { found: true, weight: cs.fontWeight, size: cs.fontSize };
    })()`);
    record(
      stepStyle.found && stepStyle.weight === '500',
      'titulos de servicios con su estilo',
      stepStyle.found ? `peso ${stepStyle.weight}, ${stepStyle.size}` : 'no encontrado'
    );

    // --- Alt text del portfolio ---
    // 52 fotos compartian el mismo alt, lo que las volvia invisibles para
    // Google Imagenes y sumaba una señal de contenido duplicado.
    const altStats = await cdp.eval(`(() => {
      const imgs = [...document.querySelectorAll('.gallery-set:not([aria-hidden]) img')];
      const alts = imgs.map(i => i.getAttribute('alt') || '');
      return {
        total: alts.length,
        vacios: alts.filter(a => !a.trim()).length,
        unicos: new Set(alts).size,
        genericos: alts.filter(a => a === 'Jardín naturalista diseñado por Silvestra Paisajismo').length,
      };
    })()`);
    record(
      altStats.vacios === 0 && altStats.unicos === altStats.total && altStats.genericos === 0,
      'portfolio con alt unico y descriptivo',
      `${altStats.unicos}/${altStats.total} unicos, ${altStats.genericos} genericos`
    );

    // --- Hero: variante elegida y LCP ---
    const heroSrc = await cdp.eval("document.querySelector('.hero-bg-img').currentSrc");
    record(/hero-l1920|hero-l1280/.test(heroSrc), 'hero usa recorte horizontal en desktop', heroSrc.split('/').pop());

    // --- Sin JS: el contenido tiene que quedar visible ---
    await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
    await cdp.send('Page.navigate', { url: `${URL_BASE}/` });
    await sleep(1500);
    const noJs = await cdp.eval(`(() => {
      const el = document.querySelector('.filo-intro .body-lg');
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      return { found: true, opacity: cs.opacity, text: el.textContent.trim().length };
    })()`);
    record(noJs.found && noJs.opacity === '1', 'contenido visible sin JS', `opacity: ${noJs.opacity}, ${noJs.text} chars`);
    await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });

    ws.close();
  } finally {
    proc.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  const failedChecks = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failedChecks.length}/${checks.length} verificaciones OK\n`);
  if (failedChecks.length) process.exit(1);
}

main().catch((error) => {
  console.error('\nverificacion fallo:\n', error);
  process.exit(1);
});
