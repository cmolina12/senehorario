import Link from "next/link";
import "./landing.css";
import { FaqLink } from "@/components/FaqLink";
import { ThemeToggle } from "@/components/ThemeToggle";

const REPO_URL = "https://github.com/cmolina12/senehorario";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-wrapper">
        {/* Header Bar */}
        <header className="landing-header">
          <div className="floating-header lp-container flex! items-center! justify-between!">
            <div className="flex! items-center!">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/peluche.png" alt="Uniandes Logo" className="logo" />
              <div className="brand-stack">
                <span className="brand-text">Senéhorario</span>
              </div>
            </div>

            <div className="header-actions flex! items-center!">
              <ThemeToggle />
              <a
                className="header-link"
                href="https://ofertadecursos.uniandes.edu.co/"
                target="_blank"
                rel="noopener"
              >
                Oferta de cursos
              </a>
              <FaqLink />
              <Link href="/planning" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-primary-light dark:bg-accent dark:text-on-accent dark:hover:bg-accent-hover">
                Comienza
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="landing-main">
          <div className="lp-container">
            <div className="lp-row items-center! py-6!">
              <div className="lp-col-lg-6 animate-fadein hero-text">
                <h1 className="hero-title mb-4!">
                  Planifica tu horario académico <span className="highlight">sin conflictos</span>.
                </h1>
                <p className="hero-subtitle mb-6!">
                  <strong>Senéhorario</strong> es una herramienta de planificación diseñada para
                  estudiantes de la Universidad de los Andes.{" "}
                  <strong>Construye tu horario ideal</strong> explorando combinaciones de cursos,
                  evitando conflictos y optimizando tu semestre.
                </p>
              </div>
              <div className="lp-col-lg-6 hidden! min-[992px]:block! text-center!">
                <div className="hero-visual">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/mac2.png"
                    alt="Senéhorario planner schedule view"
                    className="planner-preview-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section className="features-section py-12!">
          <div className="lp-container">
            <div className="lp-row lp-g-4">
              <Feature icon="bi-search" title="Búsqueda y selección de secciones">
                Busca por NRC, código o nombre, revisa horarios y agrega secciones a tu selección en
                segundos.
              </Feature>
              <Feature icon="bi-calendar-week" title="Generación en vivo">
                Las opciones de horario se actualizan automáticamente a medida que agregas o quitas
                secciones.
              </Feature>
              <Feature icon="bi-arrows-angle-expand" title="Opciones compatibles, al instante">
                Visualiza únicamente horarios válidos y recórrelos en una vista semanal para comparar
                rápidamente cuál te conviene.
              </Feature>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="about-section py-12!">
          <div className="lp-container">
            <div className="lp-row justify-center!">
              <div className="lp-col-lg-8 text-center!">
                <div className="about-card">
                  <div className="about-eyebrow">Open Source</div>
                  <h3 className="about-title mt-4! mb-4!">
                    Desarrollado de forma abierta para estudiantes de Uniandes
                  </h3>
                  <p className="about-desc mb-6!">
                    Senéhorario es mantenido por{" "}
                    <a
                      href="https://cmolina.xyz"
                      target="_blank"
                      rel="noopener"
                      className="about-inline-link"
                    >
                      Camilo Molina
                    </a>
                    . Las contribuciones y comentarios son bienvenidos.
                  </p>

                  <div className="about-links flex! justify-center! gap-4! flex-wrap!">
                    <a href={REPO_URL} target="_blank" rel="noopener" className="about-link">
                      <i className="bi bi-github me-1!"></i>Repositorio
                    </a>
                    <a href="mailto:c.molinap@uniandes.edu.co" className="about-link">
                      <i className="bi bi-envelope me-1!"></i>Contacto
                    </a>
                  </div>

                  <div className="about-stack mt-6!">Stack: Next.js · React · TypeScript</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="faq-section py-12!">
          <div className="lp-container">
            <div className="lp-row justify-center!">
              <div className="lp-col-lg-8">
                <div className="section-title uppercase! mb-4!" style={{ color: "var(--primary-light)" }}>
                  Ayuda y preguntas frecuentes
                </div>
                <h3 className="faq-heading mb-6!">
                  Resolvemos las dudas más comunes para que arranques rápido.
                </h3>
                <div className="faq-list">
                  <FaqItem question="¿Cómo uso Senéhorario?">
                    Ingresa a <strong>Comienza</strong>, busca tus cursos por NRC o código y agrega
                    las secciones. El generador arma combinaciones sin choques y puedes revisar cada
                    horario en el calendario.
                  </FaqItem>
                  <FaqItem question="¿De dónde salen los datos de cursos y horarios?">
                    Los datos provienen de la <strong>oferta oficial</strong> de la universidad. Usa
                    el enlace “Oferta de cursos” para validar cualquier cambio reciente.
                  </FaqItem>
                  <FaqItem question="¿Qué pasa si hay cambios de salón u horario?">
                    Cualquier cambio en los horarios o salones se reflejará en la aplicación en tiempo
                    real. Si ves algo desactualizado, escribeme al correo y lo revisamos de inmediato.
                  </FaqItem>
                  <FaqItem question="Tengo una idea o sugerencia, ¿qué hago?">
                    Si sabes programar en TypeScript, abre un pull request en el{" "}
                    <a href={REPO_URL} target="_blank" rel="noopener">
                      repositorio
                    </a>
                    . Si no, escríbeme un correo y lo revisamos juntos.
                  </FaqItem>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-modern text-center!">
          &copy; 2026 Camilo Molina
          <span className="mx-2!">·</span>
          <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener">
            MIT License
          </a>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="lp-col-md-4">
      <div className="feature-item h-full!">
        <div className="feature-icon">
          <i className={`bi ${icon}`}></i>
        </div>
        <h5 className="feature-title">{title}</h5>
        <p className="feature-desc">{children}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="faq-item">
      <div className="faq-question">{question}</div>
      <div className="faq-answer">{children}</div>
    </div>
  );
}
