# Mejoras futuras

Solo lo que falta hacer, ordenado por impacto. Los nombres de archivo sueltos son
relativos a `silvestra/`. Guía de diseño visual: [DESIGN_GUIDE.md](DESIGN_GUIDE.md).

- **Pedir reseñas de Google** a cada cliente con jardín terminado, con el link directo por WhatsApp. Es la palanca local más fuerte que queda: diez reseñas reales mueven más el ranking que cualquier optimización on-page. Permanente.

- **Terminar Google Business Profile**: completar el video de verificación si quedó a medias, subir 15-20 fotos, cargar los cuatro servicios de la landing, y publicar novedades cada 2-4 semanas.

- **Sumar la URL del perfil de Google Business al array `sameAs` de `site.mjs`.** Hoy tiene un solo perfil (Instagram) y eso es poca evidencia para que los modelos resuelvan la entidad. Cuando el perfil esté público, agregar también `geo` y `hasMap` al schema.

- **Completar los campos en `null` de `site.mjs`**: `priceRange`, `openingHours`, `address` (o confirmar que es solo a domicilio) y `legalName`. Están vacíos a propósito — `businessSchema()` los omite en vez de inventarlos. Si no hay horario real de atención, dejar `openingHours` vacío antes que poner uno falso.

- **Agregar una FAQ.** Es el formato que los buscadores con IA extraen más directo. Regla: la primera oración es la respuesta y lleva un número; el contexto va después. Preguntas que valen: cuánto cuesta un proyecto, cuánto demora, qué especies aguantan viento salino, si se puede mantener sin agroquímicos con niños y mascotas, si trabajan fuera de Maldonado, qué incluye un proyecto completo. Falta el dato real de precios y plazos. Implementación: entrada `faq` en `content.jsx`, componente `Faq` en `sections.jsx` reusando `SectionHeading`, `faqSchema()` en `prerender.mjs` copiando la forma de `servicesSchema()`. La pregunta va en `h3`, no `h4`, o falla `verify.mjs`.

- **Página "Sobre".** Los datos de `founder` ya están en `site.mjs` pero solo viven en el JSON-LD: nadie que entre al sitio los ve, y Google cruza schema con texto visible. Contenido: quién diseña, la formación (Técnica en Paisajismo y Diseñadora Gráfica, Universidad ORT Uruguay) y por qué ese cruce importa — explica por qué las láminas del portfolio se ven así. Schema `AboutPage` con `mainEntity` al `#founder` existente. Falta decidir si va con nombre propio o solo con las credenciales; con nombre rinde más.

- **Guía de especies nativas de la costa de Maldonado**, como segunda página con una tabla HTML real de 15-25 especies: nombre científico, floración, tolerancia a salinidad, suelo arenoso, qué atrae, uso en el jardín. Es dato original que no existe publicado en Uruguay, y captura búsquedas como "qué plantar en un jardín en José Ignacio". Los 52 `alt` del portfolio en `content.jsx` sirven de punto de partida. El build ya soporta varias páginas: `pages` en `site.mjs` es un array y el loop de `build.mjs` escribe `dist/<path>/index.html`. Falta pasar un componente distinto según `page.id` y sumar schema `Article` con autora.

- **Instagram: poner servicio y lugar en la primera línea de la bio** ("Diseño y construcción de jardines · Punta del Este"). Instagram indexa ese texto.

- **Instagram: dejar el campo Nombre como "Silvestra Paisajismo", exacto.** Instagram pondera el Nombre para su búsqueda, así que meterle keywords ayudaría ahí — pero el nombre tiene que ser idéntico en todos los perfiles o se lee como otra entidad y debilita la resolución en Google y en los modelos. Gana la consistencia; las keywords van en la bio.

- **Instagram: alt text y ubicación en cada post.** El alt está en Configuración avanzada → Texto alternativo, casi nadie lo usa, y los 52 `alt` que ya están escritos sirven tal cual para las mismas fotos. La primera línea del caption, buscable y concreta.

- **Activar HSTS en Cloudflare** (SSL/TLS → Edge Certificates), a partir del 21/8/2026. Se dejó apagado a propósito para poder revertir el proxy si algo salía mal; ya está confirmado que funciona. Los navegadores lo cachean, así que es difícil dar marcha atrás.

- **Verificar que el Edge TTL de la Cache Rule sea realmente de 1 mes.** Está confirmado que cachea (MISS → HIT) pero no el TTL. Se ve pidiendo una imagen de `/assets/` y mirando si el header `Age` supera los 600 segundos.

- **Case studies por tipo de sitio, no por cliente** — "chacra en José Ignacio", "casa en La Barra", "reserva en laguna". `DESIGN_GUIDE.md` prohíbe nombrar proyectos y eso es una decisión de marca evaluada, no un descuido; agrupar por tipo la respeta. Los planos de la sección `planos` ya cubren esos tres casos. Falta el texto: qué problema tenía el sitio, qué se decidió, qué resultado dio.

- **Opcional: sacar React y reescribir el menú y los dos lightbox en JavaScript vanilla.** Bajaría de ~56 KB comprimidos a ~3 KB. El prerender ya entrega todo el HTML, así que React solo aporta la hidratación. Contra: se pierde la estructura de componentes de `sections.jsx` y hay que rehacer el build. El sitio ya cumple Core Web Vitals con holgura, así que no resuelve ningún problema actual.

- **Revisar Search Console una vez por mes.** Mirar Rendimiento → Consultas (por qué búsquedas te muestran, aunque no haya clicks), posición media como métrica de progreso real, e Indexación → Páginas para confirmar que no aparece "Duplicada, Google eligió un canónico distinto". Al principio suben las impresiones y no los clicks: eso es buena señal. Core Web Vitals va a estar vacío por meses porque son datos de visitantes reales y necesita volumen de tráfico.

- **Correr PageSpeed Insights cada 2-3 meses** o después de cambios grandes: da datos de laboratorio, así que funciona sin tráfico. Umbrales LCP < 2,5 s, INP < 200 ms, CLS < 0,1. En agosto de 2026 estaba en LCP ~0,9 s y CLS 0,0007. Puntúa más bajo que la medición local porque simula conexión móvil lenta; si baja de 90 en móvil, mirar primero el peso de las imágenes.

- **Revisar Instagram Insights una vez por mes**, buscando la porción de impresiones que viene de búsqueda y explorar en vez de seguidores. Las estadísticas de búsqueda de Instagram son mucho más pobres que Search Console: sirven para ver tendencia, no para optimizar con precisión.

- **Preguntar a mano en ChatGPT, Perplexity y Gemini cada 2-3 meses**: "¿quién hace paisajismo con plantas nativas en Punta del Este?", "qué plantar en un jardín en José Ignacio", "paisajistas en Maldonado". Anotar qué dominios cita cada uno; si Silvestra no está, ver qué tiene el que sí. Y preguntar "¿qué es Silvestra Paisajismo?" para confirmar que la describe bien.

- **No "corregir" los textos poéticos de `content.jsx`.** "Silvestra surge del deseo de co-crear con la naturaleza" es inextraíble para un modelo, y está bien que lo sea: es voz de marca y es una decisión. Todo lo de arriba suma una capa factual al lado, no reemplaza esa copy.
