/* global React, ReactDOM, Header, Hero, Filosofia, Servicios, PlanosProceso, Portfolio, Contacto, Footer, WhatsApp */
// ============================================================
// SILVESTRA — App
// ============================================================
const { useEffect: useEffectA } = React;

// Observa los .reveal y los muestra al entrar en viewport
function useScrollReveal() {
  useEffectA(() => {
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

function App() {
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
