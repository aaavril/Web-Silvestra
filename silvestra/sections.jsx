/* global React, Sprig */

const { useEffect: useHeaderEffect, useState: useHeaderState } = React;
const { assets, contact, nav, hero, filosofia, servicios, proceso, planos, portfolio, cta, footer } = window.SILVESTRA_CONTENT;

function Arrow() {
  return (
    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function SectionHeading({ eyebrow, title, className = '' }) {
  return (
    <div className={className}>
      <p className="eyebrow reveal">{eyebrow}</p>
      <h2 className="display section-title reveal d1">{title}</h2>
    </div>
  );
}

function Header({ darkTop = true }) {
  const [scrolled, setScrolled] = useHeaderState(false);
  const [open, setOpen] = useHeaderState(false);

  useHeaderEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useHeaderEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const lightTop = !darkTop && !scrolled;

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''} ${lightTop ? 'light-top' : ''} ${open ? 'menu-open' : ''}`}>
      <a href="#top" aria-label="Silvestra Paisajismo">
        <img className="nav-logo on-dark-logo" src={assets.logoCream} alt="Silvestra Paisajismo" />
        <img className="nav-logo on-light" src={assets.logoColor} alt="Silvestra Paisajismo" />
      </a>

      <nav className="nav-links" aria-label="Navegación principal">
        {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>

      <button
        className="nav-toggle"
        type="button"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon open={open} />
      </button>

      <nav className="mobile-menu" aria-label="Navegación móvil">
        {nav.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
        ))}
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero hero-photo" id="top">
      <img className="hero-bg-img" src={assets.heroImage} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
      <div className="wrap hero-content">
        <p className="eyebrow on-dark hero-eyebrow reveal in d1">{hero.eyebrow}</p>
        <h1 className="display hero-h reveal in d2"><em>habitar</em> tu naturaleza</h1>
        <p className="lede hero-sub reveal in d3">{hero.text}</p>
        <div className="hero-cta center reveal in d4">
          <a href="#portfolio" className="btn solid-light">Ver el portfolio <Arrow /></a>
        </div>
        <a href="#filosofia" className="hero-discover reveal in d5">
          Descubrí
          <span className="hero-arrow" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function Filosofia() {
  const titleParts = filosofia.title.split(filosofia.accent);

  return (
    <section className="section filo tex-dots" id="filosofia">
      <div className="wrap">
        <div className="filo-intro">
          <p className="eyebrow reveal">{filosofia.eyebrow}</p>
          <h2 className="display quote reveal d1">
            {titleParts[0]}<span className="accent">{filosofia.accent}</span>{titleParts[1]}
          </h2>
          <p className="body-lg reveal d2">{filosofia.text}</p>
        </div>

        <div className="pillars">
          {filosofia.pillars.map((pillar, index) => (
            <article className={`pillar reveal d${index + 1}`} key={pillar.number}>
              <div className="rule" />
              <span className="num">{pillar.number}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Servicios() {
  return (
    <>
      <section className="section servicios" id="servicios">
        <div className="wrap">
          <SectionHeading eyebrow={servicios.eyebrow} title={servicios.title} />
          <div className="serv-grid">
            {servicios.items.map((item, index) => (
              <article className={`serv-card reveal d${index + 1}`} key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="s-mark"><Sprig size={120} /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section proceso tex-dots">
        <div className="wrap">
          <SectionHeading eyebrow={proceso.eyebrow} title={proceso.title} />
          <div className="steps">
            {proceso.steps.map((step, index) => (
              <article className={`step reveal d${index + 1}`} key={step.number}>
                <div className="conn" />
                <div className="dot">{step.number}</div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PlanosProceso() {
  const [lightbox, setLightbox] = useHeaderState(null);

  const closeLightbox = (e) => {
    if (e.target === e.currentTarget) setLightbox(null);
  };

  useHeaderEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="section plan-process tex-dots" id="planos">
      <div className="wrap">
        <div className="plan-head">
          <SectionHeading eyebrow={planos.eyebrow} title={planos.title} />
          <p className="body-lg plan-lead reveal d2">{planos.text}</p>
        </div>

        <div className="plan-gallery">
          {planos.images.map((image, index) => (
            <article
              className="plan-piece"
              key={`${image.src}-${index}`}
              onClick={() => setLightbox(image)}
              style={{ cursor: 'zoom-in' }}
            >
              <img
                src={image.src}
                alt={`${image.label} - proceso creativo Silvestra`}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <div className="plan-piece-caption">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{image.label}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {lightbox && (
        <div className="plan-lightbox" onClick={closeLightbox}>
          <div className="plan-lightbox-inner">
            <img src={lightbox.src} alt={lightbox.label} />
            <p className="plan-lightbox-label">{lightbox.label}</p>
          </div>
          <button className="plan-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar">✕</button>
        </div>
      )}
    </section>
  );
}

function Portfolio() {
  const renderGalleryImage = (image, imageIndex, rowIndex, copyIndex) => (
    <article
      className={`gallery-card ${image.size}`}
      key={`${rowIndex}-${copyIndex}-${imageIndex}`}
      aria-hidden={copyIndex > 0 ? 'true' : undefined}
    >
      <img
        className={image.crop}
        src={image.src}
        alt={copyIndex === 0 ? 'Jardín Silvestra' : ''}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
    </article>
  );

  return (
    <section className="section portfolio" id="portfolio">
      <div className="wrap">
        <div className="pf-head">
          <SectionHeading eyebrow={portfolio.eyebrow} title={portfolio.title} />
          <p className="body-lg pf-lead reveal d2">{portfolio.text}</p>
        </div>

        <div className="gallery-rows reveal d2">
          {portfolio.rows.map((row, rowIndex) => (
            <div className={`gallery-row move-${row.direction} speed-${row.speed}`} key={`${row.direction}-${rowIndex}`}>
              <div className="gallery-track">
                <div className="gallery-set">
                  {row.images.map((image, imageIndex) => renderGalleryImage(image, imageIndex, rowIndex, 0))}
                </div>
                <div className="gallery-set" aria-hidden="true">
                  {row.images.map((image, imageIndex) => renderGalleryImage(image, imageIndex, rowIndex, 1))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contacto() {
  return (
    <section className="section cta-final" id="contacto">
      <div className="wrap cta-inner reveal">
        <div>
          <p className="eyebrow on-dark">{cta.eyebrow}</p>
          <h2>{cta.title}</h2>
          <p>{cta.text}</p>
        </div>
        <a href={contact.whatsapp} className="btn solid-light" target="_blank" rel="noreferrer">{cta.action} <Arrow /></a>
      </div>
    </section>
  );
}

function FooterLink({ href, children, external = false }) {
  return (
    <a className="ulink" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
      {children}
    </a>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <img className="footer-logo" src={assets.logoCream} alt="Silvestra Paisajismo" />
          <p className="footer-tagline">{footer.tagline}</p>
        </div>

        <div>
          <p className="eyebrow on-dark footer-heading">Navegá</p>
          <ul className="footer-list">
            {nav.filter((item) => item.href !== '#contacto').map((item) => (
              <li key={item.href}><FooterLink href={item.href}>{item.label}</FooterLink></li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow on-dark footer-heading">Contacto</p>
          <ul className="footer-list">
            <li><FooterLink href={contact.phoneUrl}>{contact.phoneLabel}</FooterLink></li>
            <li><FooterLink href={contact.instagram} external>Instagram: {contact.instagramLabel}</FooterLink></li>
          </ul>
        </div>
      </div>

      <div className="footer-foot">
        <span>© 2025 Silvestra Paisajismo</span>
        <span>{footer.areas}</span>
      </div>
    </footer>
  );
}

function WhatsApp() {
  return (
    <a className="wa-float" href={contact.whatsapp} target="_blank" rel="noreferrer" aria-label="Contactar por WhatsApp">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" /></svg>
    </a>
  );
}

Object.assign(window, { Header, Hero, Filosofia, Servicios, PlanosProceso, Portfolio, Contacto, Footer, WhatsApp });
