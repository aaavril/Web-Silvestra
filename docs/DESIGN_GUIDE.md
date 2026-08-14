# Silvestra Design Guide

Guia de diseno para mantener la web coherente, limpia y extensible.

Para lo que falta hacer en visibilidad y citabilidad por buscadores con IA,
ver [MEJORAS-FUTURAS.md](MEJORAS-FUTURAS.md).

## Como se construye el sitio

El sitio dejo de servirse como archivos sueltos: `silvestra/` es codigo
fuente y lo que se publica es `dist/`, generado por `npm run build`.

En este documento los nombres de archivo sueltos (`content.jsx`, `styles.css`,
`sections.css`) son relativos a `silvestra/`. Los comandos se corren desde la
raiz del repo.

```
npm install          una sola vez
npm run build        build completo (optimiza imagenes, ~15s)
npm run build:fast   reusa las imagenes ya optimizadas (~1s)
npm run serve        sirve dist/ en http://localhost:4173
node scripts/verify.mjs   verifica el build en Chrome headless
```

El build prerenderiza el HTML con `react-dom/server`. Antes el navegador
transpilaba JSX con `@babel/standalone` y el servidor entregaba un
`<div id="root">` vacio, asi que ningun buscador ni preview de WhatsApp
veia contenido.

Dos consecuencias a tener presentes al editar:

- **Nunca editar `dist/`**: se regenera entero en cada build.
- **`.reveal` se oculta solo bajo `.js`**, una clase que agrega un script
  inline en el `<head>`. Si se vuelve a `.reveal { opacity: 0 }` sin ese
  prefijo, todo el contenido prerenderizado queda invisible para quien no
  ejecute JavaScript, incluidos los buscadores.

## Direccion visual

Silvestra debe sentirse naturalista, sobria y cuidada. La estetica busca mostrar el jardin como protagonista: interfaz discreta, letras contenidas, mucho aire y detalles vegetales sutiles.

Principios:
- La fotografia manda; la UI acompana.
- Titulos chicos y elegantes, nunca heroicos salvo en la portada.
- Contenido claro, sin exceso de copy.
- Sin precios visibles en servicios.
- Portfolio como galeria atmosferica, sin especificar proyectos.
- Mobile primero: texto legible, botones tocables y grillas que no se rompen.

## Tokens

Los tokens viven en `styles.css`.

Color:
- Verde principal: `--verde-700`
- Verde oscuro: `--verde-900`, `--verde-950`
- Fondo claro: `--hueso`, `--crema`
- Acento baya: `--rosa-500`
- Texto: `--ink`, `--ink-soft`

Tipografia:
- Familia unica: `Inter`
- `--sans` y `--serif` apuntan a Inter para mantener una apariencia minimalista.
- `.display` se usa para titulares principales, con peso liviano y escala controlada.
- `.eyebrow` se usa para etiquetas cortas en uppercase.

Layout:
- Ancho maximo: `--max: 1180px`
- Padding lateral: `--pad`
- Secciones: `--section-y`
- Secciones compactas: `--section-y-compact`

Forma:
- Cards: `--radius-card: 8px`
- Controles pequenos: `--radius-field: 6px`
- Botones circulares/pill: `--radius-pill: 999px`
- Sombra comun: `--shadow-card`

## Componentes

Header:
- Logo visible y navegacion simple.
- En mobile se usa menu compacto con targets minimos de 48px.
- Header scrolled usa fondo claro translúcido.

Hero:
- Fondo fotografico desde `assets/hero.jpg`.
- Overlay suave para legibilidad.
- Un solo CTA: `Ver el portfolio`.
- No usar iconos decorativos grandes sobre la imagen.
- El H1 tiene dos lineas: `.hero-h-line` con el lema (peso visual) y
  `.hero-h-kw` con la propuesta de valor y la ubicacion. La segunda linea
  existe por SEO: un H1 con solo el lema no tenia ninguna keyword.
- El build recorta el hero a 16:9 para desktop y deja la version vertical
  para mobile. Si se cambia la foto, revisar `HERO.focalY` en
  `scripts/optimize-images.mjs` para que el recorte siga bien encuadrado.

Filosofia:
- En desktop entra completa en un frame.
- Texto y pilares compactos.
- En mobile se permite scroll para preservar legibilidad.

Servicios:
- Cards sobrias, sin precios.
- Radio de 8px.
- Hover muy sutil.

Planos y proceso creativo:
- Seccion para planos, representaciones graficas y piezas de proceso.
- Usa imagenes reales desde `assets/planos`.
- Usar laminas limpias, de borde fino, sin cards pesadas ni textos largos.
- Para cambiar las piezas, editar `planos.images` y `planos.steps` en `content.jsx`.
- Si se agregan mas imagenes reales de planos, mantener proporciones estables y labels cortos.

Portfolio:
- Galeria generica de imagenes.
- No incluir nombres de proyecto ni descripciones por item.
- La galeria visible se organiza en 3 filas animadas.
- Para sumar fotos, editar `portfolio.rows` en `content.jsx`.
- Cada fila acepta `speed: "slow" | "medium" | "fast"`. La direccion la
  define la posicion del mouse sobre la fila, no un campo de datos.
- Cada imagen acepta un campo `alt` con la descripcion de la foto. Sin `alt`
  se usa un texto generico. Completarlo es lo que hace que la fotografia
  aparezca en Google Imagenes; no cambia nada de lo que ve el visitante.
- La version anterior con proyectos nombrados esta archivada en:
  - `silvestra/archive/PortfolioProjects.jsx`
  - `silvestra/archive/PortfolioProjects.css`

CTA y Footer:
- CTA final pequeno y directo.
- Footer solo con navegacion y contacto esencial.
- Contacto: telefono, email e Instagram.

## Reglas aplicadas

Checklist de verificacion:
- [x] Tipografia unificada en Inter.
- [x] Titulos reducidos y consistentes.
- [x] Radios de cards normalizados a 8px.
- [x] Botones con altura minima tactil.
- [x] Portfolio actual sin proyectos especificos.
- [x] Portfolio anterior archivado como componente reutilizable.
- [x] Seccion de planos integrada como bloque extensible.
- [x] Servicios sin precios.
- [x] Contacto simplificado.
- [x] Hero usa imagen real y overlay ligero.
- [x] Mobile tiene menu dedicado y grillas adaptativas.
- [x] Sin `Placeholder`, `price`, `BotanicalMotif` o `scroll-cue` en archivos activos.
- [x] Recursos principales verificados por HTTP `200`.

## Como extender

Para agregar imagenes al portfolio:

```js
portfolio: {
  rows: [
    {
      direction: 'left',
      speed: 'medium',
      images: [
        { src: 'assets/nueva-imagen.jpg', size: 'wide', crop: 'crop-a' },
      ],
    },
  ],
}
```

Tamanos disponibles:
- `feature`
- `portrait`
- `square`
- `wide`

Clases de crop disponibles:
- `crop-a`
- `crop-b`
- `crop-c`
- `crop-d`
- `crop-e`
- `crop-f`

Para volver al portfolio con proyectos:
1. Copiar `silvestra/archive/PortfolioProjects.jsx` al flujo de componentes.
2. Copiar `silvestra/archive/PortfolioProjects.css` dentro de `sections.css`.
3. Restaurar datos de proyectos en `content.jsx`.
