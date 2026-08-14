// ============================================================
// SILVESTRA — Configuracion de sitio y SEO
// Todo lo que no es contenido visible de la pagina vive aca:
// URLs canonicas, metadatos por pagina y datos del negocio
// que alimentan el JSON-LD.
// ============================================================

export const site = {
  url: 'https://silvestrapaisajismo.com',
  lang: 'es',
  locale: 'es_UY',
  themeColor: '#0c3623',
  // Ruta de salida. No cambiarla: es la URL que ya conocen WhatsApp,
  // Instagram y Facebook.
  ogImage: 'assets/og-image.jpg',
};

// Imagen de preview al compartir el link (WhatsApp, Instagram, Facebook).
// El build la arma solo: recorta la foto a 1200x630, le aplica un velo
// verde y le compone el logo crema al centro.
//
// Para cambiar la foto: poner en `source` cualquier ruta de assets, por
// ejemplo 'assets/images/image35.webp'.
//
// Para usar una imagen propia ya diseñada: guardarla como
// silvestra/assets/og-custom.jpg en 1200x630 y el build la usa tal cual,
// sin recortarla ni ponerle el logo.
export const og = {
  source: 'assets/hero.jpg',
  // Recorte: 'center' usa el medio de la foto. Tambien sirven 'top',
  // 'bottom', 'left', 'right' o 'attention' (Sharp elige la zona con
  // mas detalle visual).
  crop: 'center',
  // Opacidad del velo verde, de 0 a 1. Sin velo el logo crema no se lee
  // sobre una foto clara.
  overlay: 0.55,
  // Ancho del logo en pixeles, sobre un lienzo de 1200.
  logoWidth: 460,
};

// Datos del negocio para structured data (ProfessionalService).
// Los campos en null se omiten del JSON-LD en vez de emitirse vacios:
// un schema incompleto es mejor que un schema con datos inventados.
//
// PENDIENTE DE CONFIRMAR CON EL NEGOCIO:
//   - address:      hay direccion fisica o es solo a domicilio?
//   - openingHours: horarios de atencion
//   - foundingDate: año de fundacion
//   - founder:      nombre y credenciales de quien diseña (alimenta E-E-A-T)
//   - priceRange:   rango orientativo, ej. '$$'
export const business = {
  name: 'Silvestra Paisajismo',
  legalName: null,
  description:
    'Estudio de paisajismo que diseña y construye jardines naturalistas en la costa de Maldonado, con especies nativas y manejo sin agroquímicos.',
  telephone: '+59897236903',
  email: 'hola@silvestra.uy',
  areaServed: ['Punta del Este', 'La Barra', 'Manantiales', 'José Ignacio', 'Maldonado'],
  addressRegion: 'Maldonado',
  addressCountry: 'UY',
  address: null,
  openingHours: null,
  foundingDate: null,
  founder: null,
  priceRange: null,
  sameAs: ['https://www.instagram.com/silvestra.paisajismo'],
};

// Metadatos por pagina. Cada entrada genera un archivo en dist/.
// `path` define la URL final; '' es la home.
export const pages = [
  {
    id: 'home',
    path: '',
    title: 'Paisajismo y Diseño de Jardines en Punta del Este | Silvestra',
    description:
      'Diseñamos y construimos jardines naturalistas en Punta del Este, La Barra, Manantiales y José Ignacio. Especies nativas, sin agroquímicos. Consultá tu proyecto.',
    priority: '1.0',
  },
];
