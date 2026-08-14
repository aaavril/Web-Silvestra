// ============================================================
// Prerender
// ------------------------------------------------------------
// Genera el HTML final. Antes el servidor entregaba 1.256 bytes con un
// <div id="root"> vacio y el navegador transpilaba JSX con
// @babel/standalone; ningun crawler sin JS veia contenido. Ahora el
// markup completo sale del build y el cliente solo hidrata.
// ============================================================

import { renderToString } from 'react-dom/server';

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const abs = (site, path = '') => {
  const base = site.url.replace(/\/$/, '');
  const clean = String(path).replace(/^\.?\//, '');
  return clean ? `${base}/${clean}` : `${base}/`;
};

/**
 * JSON-LD del negocio. Los campos sin dato se omiten en vez de emitirse
 * vacios: un schema incompleto es preferible a uno con datos inventados.
 */
export function businessSchema({ site, business }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${abs(site)}#business`,
    name: business.name,
    description: business.description,
    url: abs(site),
    telephone: business.telephone,
    email: business.email,
    image: abs(site, site.ogImage),
    areaServed: business.areaServed.map((name) => ({ '@type': 'Place', name })),
    address: {
      '@type': 'PostalAddress',
      addressRegion: business.addressRegion,
      addressCountry: business.addressCountry,
    },
    sameAs: business.sameAs,
  };

  if (business.legalName) schema.legalName = business.legalName;
  if (business.priceRange) schema.priceRange = business.priceRange;
  if (business.foundingDate) schema.foundingDate = business.foundingDate;
  if (business.openingHours) schema.openingHours = business.openingHours;
  if (business.address) {
    schema.address.streetAddress = business.address.street;
    schema.address.addressLocality = business.address.locality;
    if (business.address.postalCode) schema.address.postalCode = business.address.postalCode;
  }
  if (business.founder) {
    schema.founder = { '@type': 'Person', name: business.founder.name };
    if (business.founder.jobTitle) schema.founder.jobTitle = business.founder.jobTitle;
  }

  return schema;
}

/** Catalogo de servicios desde content.servicios, para rich results. */
export function servicesSchema({ site, business, content }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: content.servicios.title,
    itemListElement: content.servicios.items.map((item, index) => ({
      '@type': 'Offer',
      position: index + 1,
      itemOffered: {
        '@type': 'Service',
        name: item.title,
        description: item.text,
        provider: { '@id': `${abs(site)}#business` },
        areaServed: business.areaServed.map((name) => ({ '@type': 'Place', name })),
      },
    })),
  };
}

export function renderPage({ site, business, content, page, App, cssHref, jsHref }) {
  const body = renderToString(App);
  const canonical = abs(site, page.path);
  const ogImage = abs(site, site.ogImage);

  const schemas = [businessSchema({ site, business })];
  if (page.id === 'home') schemas.push(servicesSchema({ site, business, content }));

  const head = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escape(page.title)}</title>`,
    `<meta name="description" content="${escape(page.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta name="theme-color" content="${site.themeColor}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',

    // Open Graph: sin esto, compartir el link por WhatsApp — el canal
    // principal del negocio — no muestra ningun preview.
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escape(business.name)}" />`,
    `<meta property="og:locale" content="${site.locale}" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escape(content.hero.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escape(page.title)}" />`,
    `<meta name="twitter:description" content="${escape(page.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,

    // Google ignora favicons menores a 48x48 y muestra un globo genérico
    // en su lugar, asi que se declaran multiplos de 48.
    '<link rel="icon" href="favicon.ico" sizes="48x48" />',
    '<link rel="icon" href="icon-96.png" type="image/png" sizes="96x96" />',
    '<link rel="icon" href="icon-192.png" type="image/png" sizes="192x192" />',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',

    // Fuentes above-the-fold: Inter 300 para el cuerpo y Cormorant 300
    // italic para el "habitar" del H1. crossorigin es obligatorio en
    // preload de fuentes incluso en el mismo dominio.
    '<link rel="preload" href="assets/fonts/inter-300-normal-latin.woff2" as="font" type="font/woff2" crossorigin />',
    '<link rel="preload" href="assets/fonts/cormorant-garamond-300-italic-latin.woff2" as="font" type="font/woff2" crossorigin />',

    `<link rel="stylesheet" href="${cssHref}" />`,

    // Marca que JS esta activo. Sin esta clase, .reveal no se oculta y el
    // contenido prerenderizado queda visible en vez de con opacity: 0.
    '<script>document.documentElement.classList.add("js")</script>',

    ...schemas.map(
      (schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    ),
  ];

  return `<!DOCTYPE html>
<html lang="${site.lang}">
<head>
${head.map((line) => `  ${line}`).join('\n')}
</head>
<body>
  <div id="root">${body}</div>
  <script src="${jsHref}" defer></script>
</body>
</html>
`;
}

export function renderRobots({ site }) {
  return `# ${site.url}
User-agent: *
Allow: /

# Crawlers de buscadores con IA: se permiten explicitamente para poder
# aparecer citados en respuestas generadas.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
}

export function renderSitemap({ site, pages, lastmod }) {
  const urls = pages
    .map((page) => {
      const loc = abs(site, page.path);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <priority>${page.priority || '0.8'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
