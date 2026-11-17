import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { changelogByMonth, formatMonthLong, type ChangelogTag } from "@/content/changelog";
import { cn } from "@/lib/format";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Todo lo que ha cambiado en Senéhorario, mes a mes: funciones nuevas, mejoras y correcciones.",
  alternates: { canonical: "/novedades" },
};

const REPO_URL = "https://github.com/cmolina12/senehorario";

const TAG_STYLES: Record<ChangelogTag, string> = {
  Hito: "bg-primary text-white dark:bg-primary-light",
  Nuevo: "bg-accent text-on-accent",
  Mejora: "bg-surface-alt text-fg ring-1 ring-border-strong",
  Corrección: "bg-success/15 text-success",
};

export default function NovedadesPage() {
  const months = changelogByMonth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/peluche.png" alt="" className="size-8" />
            <span className="text-lg font-extrabold tracking-tight">Senéhorario</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/planning"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-light dark:bg-accent dark:text-on-accent dark:hover:bg-accent-hover"
            >
              Comienza
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <p className="text-sm font-semibold text-accent-hover">Novedades</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Lo que ha cambiado en Senéhorario</h1>
        <p className="mt-3 max-w-2xl text-fg-secondary">
          Funciones nuevas, mejoras y correcciones, mes a mes desde que empezó el proyecto.
        </p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tipos de cambio">
          {(Object.keys(TAG_STYLES) as ChangelogTag[]).map((tag) => (
            <li key={tag} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", TAG_STYLES[tag])}>
              {tag}
            </li>
          ))}
        </ul>

        <ol className="relative mt-12 space-y-12 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border md:before:left-[11.5rem]">
          {months.map(({ month, entries }) => (
            <li key={month} className="relative md:grid md:grid-cols-[11rem_1fr] md:gap-10">
              <span
                className="absolute top-2 left-0 size-[11px] rounded-full border-2 border-accent bg-bg md:left-[11.5rem] md:-translate-x-[5px]"
                aria-hidden="true"
              />
              <h2 className="pl-7 text-sm font-semibold text-fg-secondary md:sticky md:top-24 md:self-start md:pl-0 md:text-right">
                <time dateTime={month}>{formatMonthLong(month)}</time>
              </h2>
              <ul className="mt-3 space-y-3 pl-7 md:mt-0 md:pl-4">
                {entries.map((entry) => (
                  <li
                    key={entry.text}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
                  >
                    <span
                      className={cn(
                        "mt-0.5 w-[5.75rem] shrink-0 rounded-full py-0.5 text-center text-xs font-semibold",
                        TAG_STYLES[entry.tag],
                      )}
                    >
                      {entry.tag}
                    </span>
                    <p className="text-sm leading-relaxed text-fg">{entry.text}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="mt-16 text-center text-sm text-fg-muted">
          ¿Buscas el detalle técnico? Está en el{" "}
          <a href={REPO_URL} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2 hover:text-fg">
            repositorio
          </a>
          .
        </p>
      </main>
    </div>
  );
}
