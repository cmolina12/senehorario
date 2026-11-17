import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const REPO_URL = "https://github.com/cmolina12/senehorario";

const FEATURES = [
  {
    icon: "bi-search",
    title: "Busca como quieras",
    text: "Por NRC, código, nombre o profesor, con cupos, horarios y ciclo de cada sección.",
  },
  {
    icon: "bi-calendar-week",
    title: "Opciones sin choques",
    text: "Generamos todas las combinaciones compatibles y las recorres en una vista semanal.",
  },
  {
    icon: "bi-stars",
    title: "CBUs que encajan",
    text: "Te mostramos los CBUs que caben en los huecos de tu horario, filtrados por tipo y área.",
  },
  {
    icon: "bi-bookmark-star",
    title: "Guarda tus planes",
    text: "Compara varios planes, descárgalos y retómalos cuando quieras.",
  },
];

const STEPS = [
  { title: "Busca tus cursos", text: "Encuentra cada materia por código, nombre o NRC." },
  { title: "Agrega secciones", text: "Marca todas las secciones que te sirven, o solo las que tienen cupo." },
  { title: "Elige tu opción", text: "Recorre los horarios sin choques e inscríbelos en Banner." },
];

const FAQ = [
  {
    q: "¿Cómo uso Senéhorario?",
    a: (
      <>
        Entra a <strong>Comienza</strong>, busca tus cursos y agrega las secciones que te sirvan. El
        generador arma todas las combinaciones sin choques y puedes revisar cada una en el calendario.
      </>
    ),
  },
  {
    q: "¿De dónde salen los datos de cursos y horarios?",
    a: (
      <>
        De la <strong>oferta oficial</strong> de la universidad, consultada en tiempo real. Usa el enlace
        “Oferta de cursos” para validar cualquier cambio reciente.
      </>
    ),
  },
  {
    q: "¿Qué pasa si hay cambios de salón u horario?",
    a: "Se reflejan en la aplicación en cuanto la universidad los publica. Si ves algo desactualizado, escríbeme y lo revisamos.",
  },
  {
    q: "¿Senéhorario revisa laboratorios o cursos complementarios?",
    a: "No automáticamente. Verifica si tus cursos requieren un laboratorio o curso complementario e inscríbelo también en Banner.",
  },
  {
    q: "Tengo una idea o sugerencia, ¿qué hago?",
    a: (
      <>
        Si sabes programar en TypeScript, abre un pull request en el{" "}
        <a href={REPO_URL} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
          repositorio
        </a>
        . Si no, escríbeme un correo y lo revisamos juntos.
      </>
    ),
  },
];

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/peluche.png" alt="" className="size-8" />
            <span className="text-lg font-bold tracking-tight">Senéhorario</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="https://ofertadecursos.uniandes.edu.co/"
              target="_blank"
              rel="noopener"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg-secondary transition hover:text-fg sm:block"
            >
              Oferta de cursos
            </a>
            <a
              href="#faq"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg-secondary transition hover:text-fg sm:block"
            >
              FAQ
            </a>
            <ThemeToggle />
            <Link
              href="/planning"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-light dark:bg-accent dark:text-on-accent dark:hover:bg-accent-hover"
            >
              Comienza
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={`${container} grid items-center gap-12 py-14 lg:grid-cols-[1fr_1.15fr] lg:py-24`}>
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-secondary">
              <span className="size-1.5 rounded-full bg-accent" />
              Para estudiantes de la Universidad de los Andes
            </span>
            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl xl:text-6xl">
              Planifica tu horario{" "}
              <span className="bg-[linear-gradient(transparent_64%,var(--accent)_64%,var(--accent)_90%,transparent_90%)]">
                sin conflictos
              </span>
              .
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-fg-secondary">
              Busca tus cursos, agrega las secciones que te sirven y recorre todas las combinaciones
              posibles sin choques. Gratis y de código abierto.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/planning"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-light dark:bg-accent dark:text-on-accent dark:hover:bg-accent-hover"
              >
                Comienza a planear <i className="bi bi-arrow-right" aria-hidden="true"></i>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center rounded-xl border border-border bg-surface px-5 py-3 font-semibold transition hover:border-border-strong"
              >
                ¿Cómo funciona?
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent/20 blur-3xl dark:bg-accent/10" aria-hidden="true" />
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/10">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-border-strong" />
                <span className="size-2.5 rounded-full bg-border-strong" />
                <span className="size-2.5 rounded-full bg-border-strong" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/planner-light.jpg"
                alt="Vista del planificador con un horario semanal"
                className="block w-full dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/planner-dark.jpg"
                alt="Vista del planificador con un horario semanal"
                className="hidden w-full dark:block"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-surface py-16 lg:py-20">
          <div className={container}>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
              Todo lo que necesitas para armar tu semestre
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-bg/40 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-lg">
                    <i className={`bi ${f.icon}`} aria-hidden="true"></i>
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className={`${container} scroll-mt-20 py-16 lg:py-20`}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cómo funciona</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white dark:bg-accent dark:text-on-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border bg-surface py-16 lg:py-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Preguntas frecuentes</h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-bg/40">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold">
                    {item.q}
                    <i
                      className="bi bi-plus-lg shrink-0 text-fg-muted transition group-open:rotate-45"
                      aria-hidden="true"
                    ></i>
                  </summary>
                  <p className="-mt-1 pb-4 text-sm leading-relaxed text-fg-secondary">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section className={`${container} py-16 text-center`}>
          <p className="text-xs font-semibold tracking-widest text-fg-muted uppercase">Código abierto</p>
          <p className="mx-auto mt-3 max-w-xl text-fg-secondary">
            Senéhorario es mantenido por{" "}
            <a
              href="https://cmolina.xyz"
              target="_blank"
              rel="noopener"
              className="font-semibold text-fg underline decoration-accent decoration-2 underline-offset-4"
            >
              Camilo Molina
            </a>
            . Las contribuciones y comentarios son bienvenidos.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-border-strong"
            >
              <i className="bi bi-github" aria-hidden="true"></i> Repositorio
            </a>
            <a
              href="mailto:c.molinap@uniandes.edu.co"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-border-strong"
            >
              <i className="bi bi-envelope" aria-hidden="true"></i> Contacto
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className={`${container} flex flex-wrap items-center justify-between gap-2 py-6 text-sm text-fg-muted`}>
          <span>© 2026 Camilo Molina</span>
          <span className="flex gap-4">
            <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener" className="hover:text-fg">
              Licencia MIT
            </a>
            <span>Next.js · React · TypeScript</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
