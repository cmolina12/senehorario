import Link from "next/link";
import "./landing.css";
import { FaqLink } from "@/components/FaqLink";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { COURSE_COLORS } from "@/lib/calendar-events";
import { formatTerm } from "@/lib/terms";
import { getCBUStats } from "@/lib/uniandes";

const REPO_URL = "https://github.com/cmolina12/senehorario";

// Re-render at most every few hours so the CBU count stays current.
export const revalidate = 21600;

export default async function LandingPage() {
  const cbus = await getCBUStats();

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
                  Tu horario <span className="highlight">sin choques</span>, directo a Banner.
                </h1>
                <p className="hero-subtitle mb-6!">
                  Busca tus cursos, compara <strong>todas las combinaciones posibles</strong> y copia
                  los <strong>NRCs listos para inscribir</strong>. Hecho por y para estudiantes de la
                  Universidad de los Andes.
                </p>
                <ul className="hero-assurance" aria-label="Por qué usar Senéhorario">
                  {["Gratis", "Sin cuenta", "Código abierto", "Datos oficiales de Uniandes"].map((item) => (
                    <li key={item}>
                      <i className="bi bi-check2" aria-hidden="true"></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lp-col-lg-6 mt-6 min-[992px]:mt-0 text-center!">
                <div className="hero-visual">
                  <HeroDemo />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section className="features-section py-12!">
          <div className="lp-container">
            <div className="features-heading">
              {cbus && (
                <span className="features-stat">
                  <span className="live-dot" aria-hidden="true" />
                  {cbus.courses} CBUs en {formatTerm(cbus.term)}, filtrados según los huecos de tu horario
                </span>
              )}
              <h2>Todo lo que necesitas para armar tu semestre</h2>
            </div>
            <div className="lp-row lp-g-4">
              <Feature title="Todas las opciones, sin choques" mock={<OptionsMock />}>
                Agrega las secciones que te sirven y recorre cada combinación posible. Se actualizan al
                instante mientras armas tu semestre.
              </Feature>
              <Feature title="Tu tiempo también cuenta" mock={<TimeMock />}>
                Bloquea el almuerzo o el trabajo, deja libres los viernes y agrupa electivas para que entre
                solo una.
              </Feature>
              <Feature title="Directo a Banner" mock={<BannerMock />}>
                Copia los NRCs de tu opción para inscribirlos, comparte el plan con un enlace o llévalo a tu
                calendario.
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
                    Entra a <strong>Comienza</strong>, busca tus cursos por nombre, código o NRC y agrega
                    las secciones que te sirven. Senéhorario arma todas las combinaciones sin choques
                    para que las recorras en el calendario y elijas la tuya.
                  </FaqItem>
                  <FaqItem question="¿Senéhorario me inscribe los cursos?">
                    No. Aquí planeas; la inscripción la haces tú en <strong>Banner</strong>. Cuando
                    tengas tu opción, usa <strong>NRCs → Copiar todos</strong> y pégalos en Banner.
                  </FaqItem>
                  <FaqItem question="¿De dónde salen los datos y qué pasa si cambian?">
                    De la <strong>oferta oficial</strong> de la universidad, consultada en tiempo real.
                    Si un salón, horario o cupo cambia, lo verás al buscar, y tus planes guardados se
                    revisan contra la oferta cada vez que los abres: te avisamos si una sección se
                    llenó, cambió o ya no existe.
                  </FaqItem>
                  <FaqItem question="¿Dónde se guardan mis planes?">
                    En tu navegador. No necesitas cuenta y no guardamos tus datos en ningún servidor.
                    Para abrir un plan en otro dispositivo o compartirlo, usa{" "}
                    <strong>Compartir</strong> (un enlace) o descárgalo desde <strong>Mis planes</strong>.
                  </FaqItem>
                  <FaqItem question="¿Revisa si un curso tiene laboratorio o curso complementario?">
                    No automáticamente. Revisa en la oferta si tu curso tiene uno (por ejemplo,
                    MATE1203 y MATE1203C) y agrégalo también a tu plan para que entre en el horario.
                  </FaqItem>
                  <FaqItem question="Tengo una idea o encontré un error, ¿qué hago?">
                    Escríbeme un correo y lo revisamos. Si sabes programar en TypeScript, también puedes
                    abrir un issue o un pull request en el{" "}
                    <a href={REPO_URL} target="_blank" rel="noopener">
                      repositorio
                    </a>
                    .
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

/** Feature card: the mock on top (same height in every card), then title and text. */
function Feature({ title, mock, children }: { title: string; mock: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="lp-col-md-4">
      <div className="feature-item h-full!">
        <div className="feature-mock" aria-hidden="true">
          <div className="w-full">{mock}</div>
        </div>
        <h5 className="feature-title">{title}</h5>
        <p className="feature-desc">{children}</p>
      </div>
    </div>
  );
}

/* Small illustrations of each feature, drawn with the planner's own styles. */

function MiniBlock({ color, label, className = "" }: { color: string; label: string; className?: string }) {
  return (
    <div
      className={`rounded-md border-l-[3px] px-1.5 py-1 text-2xs font-bold text-[var(--text-primary)] ${className}`}
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} var(--event-tint), var(--main))` }}
    >
      {label}
    </div>
  );
}

function OptionsMock() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          Opción <strong className="text-[var(--text-primary)]">3</strong> de 28
        </span>
        <span className="flex gap-2 text-2xs">
          <i className="bi bi-chevron-left"></i>
          <i className="bi bi-chevron-right"></i>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <MiniBlock color={COURSE_COLORS[0]} label="MATE1203" />
        <MiniBlock color={COURSE_COLORS[1]} label="ISIS1221" className="mt-4" />
        <MiniBlock color={COURSE_COLORS[2]} label="FISI1018" />
      </div>
    </div>
  );
}

function TimeMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md bg-[repeating-linear-gradient(-45deg,color-mix(in_srgb,var(--text-secondary)_14%,transparent)_0_5px,transparent_5px_10px)] px-2 py-1.5 text-2xs font-semibold text-[var(--text-secondary)]">
        <i className="bi bi-slash-circle"></i> Almuerzo · 12:30–13:30
      </div>
      <div className="flex gap-1">
        {["L", "M", "I", "J", "V"].map((d) => (
          <span
            key={d}
            className={`grid h-6 flex-1 place-items-center rounded text-2xs font-semibold ${
              d === "V" ? "bg-[var(--accent)] text-[#1a1a2e]" : "bg-[var(--main)] text-[var(--text-secondary)]"
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="rounded-md border border-dashed border-[var(--accent)] px-2 py-1 text-2xs text-[var(--text-secondary)]">
        <strong className="text-[var(--text-primary)]">Elige uno:</strong> CBUH1003 · CBUT1044
      </div>
    </div>
  );
}

function BannerMock() {
  return (
    <div className="space-y-1.5 tabular-nums">
      {[
        ["MATE1203 · 1", "36109", COURSE_COLORS[0]],
        ["ISIS1221 · 3", "41893", COURSE_COLORS[1]],
      ].map(([label, nrc, color]) => (
        <div key={nrc} className="flex items-center gap-2 text-2xs">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="flex-1 text-[var(--text-secondary)]">{label}</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{nrc}</span>
          <i className="bi bi-copy text-[var(--text-secondary)]"></i>
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <span className="flex-1 rounded-md bg-[var(--accent)] py-1 text-center text-2xs font-semibold text-[#1a1a2e]">
          Copiar todos
        </span>
        <span className="rounded-md bg-[var(--main)] px-2 py-1 text-2xs text-[var(--text-secondary)]">
          <i className="bi bi-link-45deg"></i> Enlace
        </span>
        <span className="rounded-md bg-[var(--main)] px-2 py-1 text-2xs text-[var(--text-secondary)]">
          <i className="bi bi-calendar-plus"></i> .ics
        </span>
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
