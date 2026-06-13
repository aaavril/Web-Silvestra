/* Archived component.
   This was the project-specific portfolio used in the first version.
   Keep it here to reuse later if Silvestra wants named case studies again. */

const ARCHIVED_PORTFOLIO_PROJECTS = [
  { size: 'big', meadow: 'm-dune', location: 'José Ignacio', title: 'Jardín de dunas', text: 'Gramíneas nativas y herbáceas que se mecen con el viento del mar.' },
  { size: 'tall', meadow: 'm-laguna', location: 'Manantiales', title: 'Borde de laguna', text: 'Vegetación palustre que dialoga con el espejo de agua.' },
  { size: 'sq', meadow: 'm-estanque', location: 'La Barra', title: 'Estanque natural', text: 'Hardscape integrado y vida acuática.' },
  { size: 'sq', meadow: 'm-monte', location: 'Punta del Este', title: 'Monte costero', text: 'Especies nativas que recrean el monte indígena.' },
  { size: 'wide', meadow: 'm-deck', location: 'La Barra', title: 'Deck entre canteros', text: 'Madera y praderas que se funden en un mismo gesto.' },
  { size: 'wide', meadow: 'm-sunset', location: 'José Ignacio', title: 'Pradera New Perennial', text: 'Floración escalonada que cambia con cada estación.' },
];

function PortfolioProjects({ portfolio, projects = ARCHIVED_PORTFOLIO_PROJECTS }) {
  return (
    <section className="section portfolio" id="portfolio">
      <div className="wrap">
        <div className="pf-head">
          <SectionHeading eyebrow={portfolio.eyebrow} title={portfolio.title} />
          <p className="body-lg pf-lead reveal d2">{portfolio.text}</p>
        </div>

        <div className="pf-grid">
          {projects.map((project, index) => (
            <article className={`pf-card ${project.size} reveal d${(index % 4) + 1}`} key={`${project.location}-${project.title}`}>
              <div className={`meadow ${project.meadow}`} />
              <div className="pf-scrim" />
              <div className="pf-inner">
                <div className="pf-meta">
                  <span className="pf-loc">{project.location}</span>
                  <h3>{project.title}</h3>
                  <p className="pf-desc">{project.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
