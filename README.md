# Senéhorario

<a href="https://senehorario.cmolina.xyz">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/banner-dark.png">
    <img alt="Senéhorario: tu horario sin choques, directo a Banner" src=".github/banner-light.png">
  </picture>
</a>

Planificador de horarios gratuito y de código abierto para estudiantes de la Universidad de los Andes. Busca en la oferta oficial de cursos, elige las secciones que te sirven, recorre todas las combinaciones sin choques y copia los NRCs directo a Banner.

**Sitio:** [senehorario.cmolina.xyz](https://senehorario.cmolina.xyz) · **Novedades:** [senehorario.cmolina.xyz/novedades](https://senehorario.cmolina.xyz/novedades)

> **English:** a schedule planner for Universidad de los Andes students. The app and its docs are in Spanish; code and commits are in English.

## Funcionalidades

**Planea**
- Busca por código, nombre, NRC o profesor, con cupos, ciclo (16 semanas, 8A, 8B), profesores y horarios de cada sección.
- Elige el periodo a planear; cuando la oferta publica dos semestres a la vez, los horarios nunca los mezclan.
- Agrega secciones una por una, todas las de un curso o solo las que tienen cupos.
- Todas las combinaciones sin choques en un calendario semanal. Las secciones de medio semestre (8A/8B) se combinan en una sola vista, y al cambiar de opción solo se animan las clases que cambian.
- **Grupos «elige uno»:** agrupa electivas o CBUs y cada horario incluye exactamente uno de ellos.
- **CBUs que encajan:** mira qué CBUs caben en los huecos de la opción en pantalla, filtrados por tipo y área.

**Ajusta**
- **Preferencias:** ordena las opciones por menos huecos, menos días, entrada más tarde o salida más temprano; evita clases antes o después de cierta hora; deja días libres; bloquea tiempo para almorzar, trabajar o hacer deporte (se dibuja en el calendario).

**Inscribe y comparte**
- **NRCs para Banner:** copia un NRC o la lista completa de la opción.
- **Links para compartir** que abren el plan, con datos actualizados, en cualquier dispositivo.
- **Exportar al calendario** (`.ics`) la opción elegida, como clases semanales en hora de Bogotá para Google Calendar, Apple Calendar u Outlook.
- **Planes guardados:** guarda, descarga e importa varios planes.

**Mantente al día**
- La sesión y los planes guardados se revisan contra la oferta en vivo al abrirlos; un aviso muestra las secciones que se llenaron, cambiaron de horario o desaparecieron.

Además: tema claro y oscuro, una versión para celular con barra inferior y agenda día por día, y respeto por la preferencia de movimiento reducido.

## Cómo funciona

- **Los datos de la oferta** vienen del catálogo público de cursos de Uniandes a través de dos rutas de API (`/api/courses`, `/api/courses/cbu`) que los normalizan en cursos, secciones y sesiones. Las búsquedas siempre consultan la oferta en vivo; solo el conteo de CBUs de la página de inicio se guarda en caché (6 horas).
- **Los horarios se generan en el navegador** (backtracking con un espacio por curso o por grupo «elige uno»), así que cada cambio es instantáneo. El límite es de 2.000 combinaciones para que la página siga respondiendo.
- **Tus datos se quedan en tu navegador.** Las selecciones, los planes y las preferencias viven en `localStorage`; no hay cuentas ni base de datos. Los links para compartir solo llevan el periodo, los códigos de los cursos y los NRCs.
- **Analítica:** el sitio usa Google Analytics para contar visitas.

## Hoja de ruta

- [x] Buscar por profesor.
- [x] Sugerir CBUs que encajen en los huecos del horario.
- [x] Guardar, ver y cambiar entre varios planes.
- [x] Elegir entre cursos (grupos «elige uno»), por ejemplo electivas de las que solo necesitas una.
- [x] Bloquear tiempo para compromisos fuera de clase.
- [x] Copiar NRCs para Banner, compartir planes por link y exportar al calendario.
- [ ] Mostrar las calificaciones de profesores de Los Estudiantes dentro de la app.

## Estructura del proyecto

Una sola app de Next.js (React, TypeScript, Tailwind CSS, FullCalendar), desplegada en Vercel.

```
src/
  app/
    page.tsx                  página de inicio (+ landing.css, estilos de la página original)
    planning/page.tsx         planificador
    novedades/page.tsx        página de novedades
    api/courses/route.ts      GET /api/courses?q=&professor=   (búsqueda en la oferta)
    api/courses/cbu/route.ts  GET /api/courses/cbu             (todos los CBUs)
    opengraph-image.tsx       imagen de vista previa de links
    brand/[theme]/route.tsx   banner del README a 2× (/brand/light, /brand/dark)
    sitemap.ts, robots.ts
  components/
    planner/                  interfaz del planificador: búsqueda, cursos, CBUs, calendario,
                              agenda, detalles, preferencias, NRCs, compartir, planes
      usePlanner.ts           estado de la selección, generación, revisión, persistencia
    landing/HeroDemo.tsx      el mini planificador animado de la página de inicio
    ui.tsx                    componentes base (botones, menú, popover, skeletons)
  content/
    changelog.ts              entradas de /novedades y de la página de inicio
  lib/
    uniandes.ts               cliente de la oferta + transformación (solo servidor)
    scheduler.ts              detección de choques y generación de horarios
    groups.ts                 grupos «elige uno» → espacios de generación
    preferences.ts            filtros, tiempo bloqueado y orden
    refresh.ts                revisión de planes guardados contra la oferta
    share.ts, ics.ts          links para compartir y exportación al calendario
    brand-card.tsx            diseño de la vista previa y del banner (next/og)
    calendar-events.ts        horarios → eventos de FullCalendar (manejo de 8A/8B)
    terms.ts, storage.ts, format.ts, types.ts, …
```

## Desarrollo

Requiere Node.js 20.9 o superior.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas unitarias (Vitest)
npm run lint
npm run typecheck
npm run build
```

Variable de entorno opcional: `UNIANDES_API_BASE_URL` (por defecto `https://ofertadecursos.uniandes.edu.co/api/courses`).

## Contribuir

Los issues y pull requests son bienvenidos.

- La lógica de horarios, datos y links vive en `src/lib/` y tiene pruebas unitarias junto a cada archivo (`*.test.ts`); agrega pruebas si cambias algo ahí.
- Si haces un cambio que los estudiantes van a notar, agrega una entrada al inicio de `CHANGELOG` en `src/content/changelog.ts`. Aparece en [/novedades](https://senehorario.cmolina.xyz/novedades) y, si está entre las tres más recientes, en la página de inicio.

## Despliegue

Cada push a `main` se despliega en Vercel; los pull requests reciben un link de vista previa. La rama `gh-pages` solo contiene una redirección desde la dirección anterior (`cmolina.xyz/senehorario/`), que además trae los planes guardados de los visitantes al nuevo sitio.

## Historia

Senéhorario empezó en junio de 2025 como un frontend en Angular con un backend en Spring Boot ([archivado](https://github.com/cmolina12/senehorario-backend)) y se lanzó el 30 de julio de 2025. En noviembre de 2026 pasó a ser una sola app de Next.js. La historia completa, pensada para estudiantes, está en [/novedades](https://senehorario.cmolina.xyz/novedades).

## Licencia

MIT, ver [LICENSE](LICENSE).
