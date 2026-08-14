# Mejoras futuras — visibilidad del sitio

Hoja de ruta de lo pendiente en tres frentes: aparecer **citada** en respuestas
de ChatGPT, Perplexity, Claude y los AI Overviews de Google (Mejoras 1 a 5),
completar señales de confianza y arrastre técnico (Mejoras 6 y 7), y medir si
algo de esto funciona.

El grueso del trabajo de SEO técnico ya está hecho y desplegado: prerender,
pipeline de imágenes, schema, Open Graph, robots, sitemap, iconos, Cloudflare.
Lo que queda acá es contenido, presencia fuera del sitio y medición.

Los nombres de archivo sueltos son relativos a `silvestra/`. Para la guía de
diseño visual, ver [DESIGN_GUIDE.md](DESIGN_GUIDE.md).

---

## Por qué la parte de IA

El SEO tradicional busca que el sitio **aparezca en una lista** de resultados.
Los buscadores con IA no devuelven listas: redactan una respuesta y citan las
fuentes de las que la sacaron. Para entrar ahí no alcanza con posicionar: el
contenido tiene que ser *extraíble* — que un modelo pueda levantar una frase y
usarla como dato.

Auditoría de agosto de 2026, sobre cinco dimensiones:

| Dimensión | Score | Qué mide | Estado |
|---|---|---|---|
| Extractability | 4/10 | Si se puede levantar una respuesta directa | Sin frases autocontenidas, sin tablas, sin resumen arriba |
| Quotability | 1.5/10 | Si hay afirmaciones que valga la pena citar | Cero números en todo el sitio |
| Authority | 0/10 | Si hay señales de quién sabe del tema | Resuelto (ver abajo) |
| Freshness | 3/10 | Si el contenido está fechado y vigente | Resuelto (ver abajo) |
| Entity Clarity | 6/10 | Si se entiende qué entidad es Silvestra | Parcial: falta ampliar `sameAs` |

**Score general: 2.9/10.**

Lo que ya estaba bien y no hay que tocar: el prerender entrega HTML completo sin
JavaScript, `robots.txt` permite explícitamente GPTBot, ClaudeBot, PerplexityBot
y Google-Extended, el `ProfessionalService` de JSON-LD está bien armado, y las
52 fotos del portfolio tienen `alt` único y descriptivo.

### La tensión con la voz de marca

La copy del sitio es voz de marca pura, y está bien que lo sea. *"Silvestra
surge del deseo de co-crear con la naturaleza"* es hermoso — y completamente
inextraíble: no afirma nada verificable, así que ningún modelo lo va a citar.

**La solución no es reescribir esa voz.** Es agregar una capa factual al lado.
Todo lo que sigue suma contenido nuevo; nada reemplaza la copy existente.

Si retomás esto más adelante: los textos poéticos de `content.jsx` no son un
descuido de SEO. Son una decisión. No los "corrijas".

---

## Ya implementado (agosto 2026)

- **`founder` y `foundingDate` en `site.mjs`** — Carolina Martinez, Técnica en
  Paisajismo y Diseñadora Gráfica (Universidad ORT Uruguay), 2025. Sale como
  `Person` con `jobTitle` y `alumniOf` en el JSON-LD. Es la señal de autoridad
  del negocio: sin una persona con formación detrás, un modelo no tiene motivo
  para citar a Silvestra antes que a cualquier otro.
- **Frase definicional** en la sección filosofía (`filosofia.definition`) —
  *"Silvestra Paisajismo es un estudio de diseño de paisaje con base en
  Maldonado, Uruguay..."*. Sujeto, categoría, lugar y especialidad en una
  oración. Es lo primero que un modelo copia.
- **Fecha de actualización** — nodo `WebPage` con `dateModified` en el JSON-LD y
  un `<time datetime>` visible en el footer. Se actualiza sola en cada deploy,
  porque el CI reconstruye en cada push a `main`.

---

## Mejora 1 — FAQ para IA

**Prioridad: máxima.** Es el formato que los motores extraen más directo y hoy
no existe en el sitio.

Una FAQ bien escrita resuelve las dos dimensiones peores de una sola vez: cada
respuesta es una frase autocontenida (Extractability) y lleva un número
(Quotability).

### La regla de redacción

**La primera oración es la respuesta, y tiene un número.** El contexto, los
matices y la poesía van después.

Mal — no se puede citar:

> Los precios varían según el proyecto, ¡escribinos y lo charlamos!

Bien — un modelo puede levantar esto tal cual:

> Un proyecto de paisajismo en Punta del Este parte de USD X para un jardín de
> hasta N m², e incluye relevamiento, planos a escala, listado de especies y
> guía de manejo. El precio final depende de la superficie, el acceso al terreno
> y si incluye hardscape (decks, estanques, fogones).

### Las preguntas

Elegidas porque son las que la gente realmente busca y nadie en el mercado
uruguayo responde con estructura:

1. **¿Cuánto cuesta un proyecto de paisajismo en Punta del Este?** — La más
   buscada y la que el sitio hoy no roza. Un rango, aunque sea amplio, vale
   mucho más que no decir nada.
2. **¿Cuánto demora diseñar y construir un jardín?** — Semanas para el proyecto,
   semanas para la obra, y el año de seguimiento.
3. **¿Qué especies funcionan en suelo arenoso con viento salino?** — Enlaza con
   la Mejora 2 y es la pregunta técnica más frecuente de la costa.
4. **¿Se puede mantener un jardín sin agroquímicos con niños y mascotas?** — Ya
   es un pilar de la filosofía; solo falta decirlo en formato pregunta.
5. **¿Trabajan fuera de Maldonado?** — Define el `areaServed` en lenguaje
   natural.
6. **¿Qué incluye un proyecto completo?** — Convierte la lista de servicios en
   una respuesta citable.

### Cómo implementarla

Tres piezas. El patrón ya existe en el repo para todas.

**1. `content.jsx`** — entrada nueva al mismo nivel que `servicios`:

```js
faq: {
  eyebrow: 'Preguntas frecuentes',
  title: 'Lo que más nos preguntan',
  items: [
    {
      q: '¿Cuánto cuesta un proyecto de paisajismo en Punta del Este?',
      a: 'Un proyecto parte de USD X para un jardín de hasta N m² e incluye...',
    },
  ],
},
```

**2. `sections.jsx`** — componente `Faq`, reusando `SectionHeading` que ya está
definido arriba del archivo:

```jsx
export function Faq() {
  return (
    <section className="section faq tex-dots" id="faq">
      <div className="wrap">
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} />
        {faq.items.map((item, index) => (
          <article className={`faq-item reveal d${index + 1}`} key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Cuidado con dos cosas: la pregunta tiene que ir en `h3` (`verify.mjs` falla si
aparece un `h4` en la página), y hay que sumar `Faq` al `<main>` de `app.jsx` y
una entrada al array `nav` de `content.jsx`.

Que la respuesta esté siempre visible, no colapsada tras un click. Un `<details>`
cerrado igual se indexa, pero el texto visible pesa más.

**3. `scripts/prerender.mjs`** — `faqSchema()` copiando la forma de
`servicesSchema()`, y sumarlo al array `schemas` de `renderPage()`, que ya emite
schemas condicionales por página:

```js
export function faqSchema({ content }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
```

### Lo que falta para poder hacerlo

Las respuestas reales. Sobre todo el rango de precios y los plazos: son datos
del negocio y no se pueden inventar.

---

## Mejora 2 — Guía de especies nativas

**Prioridad: alta.** Es la de mayor techo a largo plazo.

Sería una segunda página con una tabla de especies nativas de la costa de
Maldonado. Tres razones por las que es la jugada más fuerte disponible:

- **Es dato original.** No existe publicado en Uruguay. Los modelos prefieren
  fuentes primarias, y acá Silvestra sería la fuente.
- **Las tablas son el formato más citado.** Un modelo las extrae entera.
- **Captura toda la cola larga que el sitio hoy no toca.** Hoy Silvestra solo
  puede aparecer en búsquedas de marca o de servicio. Esto abre *"qué plantar
  en un jardín en José Ignacio"*, *"plantas nativas costa de Maldonado"*,
  *"arbustos que aguanten viento salino"* — decenas de consultas donde alguien
  todavía no sabe que necesita un paisajista.

### Estructura de la tabla

Una fila por especie, en `<table>` de HTML real (no divs con estilo: los
modelos leen la semántica):

| Especie | Nombre científico | Floración | Salinidad | Suelo arenoso | Atrae | Uso en el jardín |
|---|---|---|---|---|---|---|

Con 15-25 especies alcanza. Cada columna es un dato que un modelo puede cruzar
con la pregunta que le hicieron.

### La materia prima ya está escrita

Los 52 `alt` del portfolio en `content.jsx` son descripciones botánicas
específicas y correctas — gramíneas, salicaria, stipa, verbena, aquilea,
formio, cortaderas, palmera pindó. Sirven de punto de partida para la lista.

### Cómo implementarla

El build ya soporta varias páginas, solo que hoy hay una sola:

- `pages` en `site.mjs` es un array. Cada entrada define `path`, `title`,
  `description` y `priority`.
- El loop de `main()` en `scripts/build.mjs` itera sobre `pages` y escribe
  `dist/<path>/index.html`. El `sitemap.xml` también se genera desde ese array.

Lo que falta escribir:

1. Entrada nueva en `pages`, por ejemplo
   `path: 'especies-nativas-costa-maldonado'`.
2. Un componente de página aparte — hoy `renderPage()` recibe siempre el mismo
   `App`, así que hay que pasarle el componente según `page.id`.
3. Schema `Article` con `author: { '@id': '...#carolina' }` y `dateModified`.
   Que el artículo tenga autora identificada es lo que lo hace citable; sin eso
   es una tabla anónima más.
4. Link desde la home, para que la página no quede huérfana.

---

## Mejora 3 — Datos del negocio pendientes

`site.mjs` tiene campos en `null` a propósito: `businessSchema()` en
`prerender.mjs` los omite en vez de emitirlos vacíos, porque un schema
incompleto es mejor que uno con datos inventados.

Lo que falta y qué desbloquea cada uno:

| Campo | Qué poner | Para qué sirve |
|---|---|---|
| `priceRange` | `'$$'`, o mejor un rango real | *"¿cuánto cuesta un paisajista en Punta del Este?"* es una de las consultas más frecuentes |
| `openingHours` | Horarios de atención | Señal de negocio local real; alimenta el panel de Google |
| `address` | Dirección, o confirmar que es solo a domicilio | Sin esto el schema solo tiene región y país |
| `legalName` | Razón social, si existe | Ayuda a desambiguar la entidad |

---

## Mejora 4 — Entidad fuera del sitio

Los modelos cruzan fuentes: reconocen a una marca como entidad cuando la ven
descrita igual en varios lugares. Hoy `business.sameAs` tiene **un solo perfil**
(Instagram), y eso es poca evidencia.

En orden de rendimiento:

1. ~~**Google Business Profile**~~ — **creado en agosto de 2026.** Queda
   pendiente terminarlo y engancharlo con el sitio:
   - Sumar la URL del perfil al array `sameAs` de `site.mjs`. Hoy sigue con un
     solo perfil y por eso `Entity Clarity` no sube.
   - Si la verificación quedó a mitad de camino, completar el video. Google la
     pide para negocios a domicilio y sin eso el perfil no se muestra.
   - Cargar 15-20 fotos y los cuatro servicios de la landing.
   - Agregar `geo` y `hasMap` al schema una vez que el perfil esté público.
   - Publicar novedades cada 2-4 semanas.
2. **Pinterest** — es donde vive el paisajismo, y los modelos lo indexan.
3. **Facebook y LinkedIn** — perfiles de bajo esfuerzo que suman consistencia.
4. **Wikidata** — una entrada con las propiedades básicas y sus referencias. Es
   una de las fuentes que los modelos consultan para resolver entidades.

Regla al crearlos: **el nombre tiene que ser idéntico en todos.** "Silvestra
Paisajismo" siempre, nunca "Silvestra" ni "Silvestra Paisajismo Uruguay". Una
variación de nombre se lee como otra entidad.

Cada perfil que se cree va al array `sameAs` de `site.mjs`.

---

## Mejora 5 — Case studies anónimas

**Prioridad: baja**, pero es la forma de dar profundidad al portfolio sin
romper la regla de marca.

`DESIGN_GUIDE.md` establece que el portfolio va sin proyectos específicos, y eso
es una decisión evaluada, no un descuido. Las case studies compatibles con esa
regla son **por tipo de sitio**, no por cliente:

- "Chacra en José Ignacio" — espejos de agua, zonificación, monte nativo.
- "Casa en La Barra" — jardín xerófilo, viento salino, mantenimiento bajo.
- "Reserva en laguna" — aves por estación, pradera intervenida.

Los planos de la sección `planos` ya cubren estos tres casos y sus labels lo
confirman. Falta el texto: qué problema tenía el sitio, qué decisiones se
tomaron, qué resultado dio — con números donde haya.

Sin nombres de clientes, sin direcciones.

---

## Mejora 6 — Página "Sobre"

**Prioridad: alta**, y está desbloqueada: los datos de `founder` ya están en
`site.mjs` pero solo viven en el JSON-LD. Nadie que entre al sitio los ve.

Eso es media señal. Un modelo lee el schema, pero una persona que está evaluando
a quién contratarle el jardín no abre el código fuente. Y Google cruza las dos
cosas: una credencial declarada en JSON-LD y confirmada en el texto visible pesa
más que solo la primera.

Contenido mínimo: quién diseña, la formación (Técnica en Paisajismo y Diseñadora
Gráfica, Universidad ORT Uruguay), y por qué ese cruce importa. Ese último punto
es el que vale: explica algo real y verificable del trabajo — las axonometrías y
las láminas del portfolio se ven así porque hay formación en diseño gráfico
detrás, no solo en paisajismo. Es un diferencial que ningún competidor de la zona
puede copiar con una frase.

Schema: `AboutPage` con `mainEntity` apuntando al `#founder` que ya existe.

Depende de una decisión: si la página va con nombre propio o solo con las
credenciales. Con nombre rinde bastante más — Google puede resolver la persona
como entidad — pero es una decisión personal, no técnica.

---

## Mejora 7 — Sacar React (técnica, opcional)

**Prioridad: baja.** Refinamiento, no arreglo.

El sitio descarga ~56 KB comprimidos de React y ReactDOM para mover un menú
mobile y dos lightbox. Reescribir esas tres interacciones en JavaScript vanilla
lo baja a unos 3 KB.

El prerender ya entrega todo el HTML, así que React solo aporta la hidratación.
Nada del contenido depende de él.

Contras a tener en cuenta antes de hacerlo: se pierde la estructura de
componentes de `sections.jsx`, que hoy es cómoda para editar, y hay que rehacer
el pipeline del build. El sitio ya cumple Core Web Vitals con holgura, así que
esto no resuelve ningún problema actual.

---

## Pendientes de infraestructura

Cosas de Cloudflare y del deploy que quedaron abiertas en agosto de 2026.

| Qué | Cuándo | Detalle |
|---|---|---|
| **Activar HSTS** | Una semana después del 14/8/2026 | Cloudflare → SSL/TLS → Edge Certificates. Se dejó apagado a propósito para poder revertir si algo salía mal con el proxy. Ya se confirmó que todo funciona. Ojo: los navegadores lo cachean, así que es difícil de dar marcha atrás. |
| **Verificar el Edge TTL de 1 mes** | Cualquier momento | La Cache Rule de `/assets/*` está creada y se confirmó que cachea (MISS → HIT), pero no que el TTL sea realmente de un mes. Se ve pidiendo una imagen y mirando si el header `Age` supera los 600 segundos. |
| **Reseñas de Google** | Permanente | Ahora que el perfil existe, es la palanca local más fuerte que queda. Diez reseñas reales mueven más el ranking local que cualquier optimización on-page. Mandar el link directo por WhatsApp, que ya es el canal del negocio. |

---

## Cómo medir si funciona

Tres canales distintos, con herramientas y ritmos distintos. Conviene anotar los
números en algún lado para poder comparar: sin una línea de base, "mejoró" no se
puede afirmar.

### 1. Rendimiento en Google

**Herramienta:** Search Console (propiedad de tipo Dominio, ya verificada).
**Ritmo:** mensual. Los datos tardan 2-3 días en aparecer, así que no tiene
sentido mirar todos los días.

Qué revisar, en orden:

- **Rendimiento → Consultas.** Es el informe que importa. Muestra por qué
  búsquedas te están *mostrando*, aunque nadie haya hecho click. Las consultas a
  seguir: `paisajismo punta del este`, `diseño de jardines maldonado`, `plantas
  nativas uruguay`, `paisajista josé ignacio`.
- **Impresiones antes que clicks.** Al principio las impresiones suben y los
  clicks no. Es normal y es buena señal: significa que estás entrando al índice
  para esas búsquedas, todavía en posiciones bajas.
- **Posición media.** Es la métrica honesta de progreso. Pasar de posición 40 a
  25 no genera un solo click pero es la mitad del camino.
- **Indexación → Páginas.** Confirmar que las páginas están indexadas y que no
  aparece *"Duplicada, Google eligió un canónico distinto"* — eso indicaría un
  problema de canonical.
- **Experiencia → Core Web Vitals.** Ojo con esto: los datos son de campo, de
  visitantes reales, y necesitan volumen de tráfico para poblarse. Con poco
  tráfico el informe queda vacío durante meses. No es un error.

**Aparte, con PageSpeed Insights** (`pagespeed.web.dev`), cada 2-3 meses o
después de cambios grandes: da datos de laboratorio, así que funciona sin
tráfico. Umbrales: LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Medido en agosto de
2026 el sitio estaba en LCP ~0,9 s y CLS 0,0007, con mucho margen.

Un detalle que evita confusiones: **PageSpeed puntúa más bajo que la medición
local** porque simula una conexión móvil lenta. Si baja de 90 en móvil, mirar
primero el peso de las imágenes.

### 2. Rendimiento de búsqueda en Instagram

Instagram es un buscador propio: la gente escribe "paisajismo punta del este" en
la lupa. Y sus perfiles los indexa Google, así que un perfil bien armado también
refuerza la entidad del negocio.

**Herramienta:** la app, en Perfil profesional → Estadísticas.
**Ritmo:** mensual.

Qué mirar:

- **Impresiones por fuente.** Buscar la porción que viene de *búsqueda* y
  *explorar* en vez de seguidores. Es la que indica alcance nuevo.
- **Términos por los que te encuentran**, si la cuenta tiene volumen suficiente
  para que Instagram los muestre.

Sé consciente de una limitación: **las estadísticas de búsqueda de Instagram son
mucho más pobres que Search Console.** No hay lista de consultas ni posición
media. Sirven para ver tendencia, no para optimizar con precisión.

Qué se puede mejorar en el perfil:

- **La bio es lo que más rinde.** Instagram indexa su texto. La primera línea
  debería decir servicio y lugar en palabras que alguien buscaría: "Diseño y
  construcción de jardines · Punta del Este".
- **El campo Nombre: dejarlo como "Silvestra Paisajismo", exacto.** Acá hay una
  tensión real y conviene resolverla a conciencia. Instagram pondera bastante el
  campo Nombre para su búsqueda, así que meterle "Paisajismo Punta del Este"
  ayudaría *ahí*. Pero la Mejora 4 pide que el nombre sea idéntico en todos los
  perfiles, porque una variación se lee como otra entidad y debilita la
  resolución de entidad en Google y en los modelos. Gana la consistencia: el
  nombre queda exacto y las keywords van en la bio, que también se indexa.
- **Alt text en los posts.** Instagram lo permite (Configuración avanzada → Texto
  alternativo) y casi nadie lo usa. El patrón ya está resuelto: los 52 `alt` del
  portfolio en `content.jsx` son descripciones botánicas específicas y sirven
  tal cual para las mismas fotos.
- **Ubicación en cada post.** Es la señal geográfica más directa que tiene la
  plataforma.
- **Primera línea del caption buscable.** El mismo criterio que la FAQ de la
  Mejora 1: la primera oración dice algo concreto, la poesía va después.
- **Link a la web en la bio**, que alimenta el grafo de entidad.

### 3. Presencia en buscadores con IA

No hay consola oficial. El método es preguntar a mano, cada dos o tres meses:

1. Preguntar en ChatGPT, Perplexity y Gemini: *"¿quién hace paisajismo con
   plantas nativas en Punta del Este?"*, *"qué plantar en un jardín en José
   Ignacio"*, *"paisajistas en Maldonado"*.
2. Anotar qué dominios cita cada uno. Si Silvestra no está, ver qué tiene el que
   sí — casi siempre es dato más específico o estructura más clara.
3. Preguntar directo por la marca: *"¿qué es Silvestra Paisajismo?"*. Confirmar
   que la descripción es correcta y no la confunde con otra cosa.

Una expectativa realista para los tres canales: **el preview de WhatsApp y la
velocidad ya funcionan hoy.** Las mejoras de ranking en Google se miden en
semanas o meses, y aparecer citada en respuestas de IA depende sobre todo de las
Mejoras 1 y 2, que todavía no están hechas.
