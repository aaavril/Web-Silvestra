// ============================================================
// SILVESTRA — App
// ============================================================

import React, { useEffect } from 'react';
import { Header, Hero, Filosofia, Servicios, PlanosProceso, Portfolio, Contacto, Footer, WhatsApp } from './sections.jsx';

// Observa los .reveal y los muestra al entrar en viewport.
// El estado oculto lo aplica CSS solo bajo `.js` (ver styles.css), asi que
// si este efecto nunca corre el contenido queda visible en vez de invisible.
function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal:not(.in)'));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function App() {
  useScrollReveal();

  return (
    <React.Fragment>
      <Header darkTop={true} />
      <main>
        <Hero />
        <Filosofia />
        <Servicios />
        <PlanosProceso />
        <Portfolio />
        <Contacto />
      </main>
      <Footer />
      <WhatsApp />
    </React.Fragment>
  );
}

export default App;
