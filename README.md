# Senéhorario

A schedule planner for Universidad de los Andes students: search the official course catalog, pick candidate sections, and browse every conflict-free weekly schedule.

- **Live site:** [https://senehorario.cmolina.xyz](https://senehorario.cmolina.xyz)

## Features

- Search the Uniandes catalog by NRC, course code, name or professor, with section details (professors, cycle, meeting times, seats).
- Choose the academic term to plan for; the catalog sometimes publishes two at once.
- Select candidate sections per course and step through every compatible schedule option.
- Half-semester (8A/8B) sections are combined into one weekly view.
- Interactive weekly calendar (FullCalendar) with color-coded classes; click a class for its details.
- Suggestions for CBUs that fit into the current schedule, filterable by type and area.
- Save, export and import multiple plans. The planner also remembers your last session.
- Light and dark themes.

## Roadmap

- [x] Search by professor, or by department / field of interest.
- [x] Suggest CBUs that fit into the current gaps in your schedule.
- [x] Save, view, and switch between multiple plans.
- [ ] Mark selected classes as "options" rather than required — so two overlapping classes can both be considered when you only intend to take one of them (and don't care which).
- [ ] Manually-added time blocks (e.g. to reserve slots for non-class commitments).
- [ ] Some kind of database to show professor ratings from Los Estudiantes directly within the app.

## Stack

A single Next.js (React + TypeScript) app styled with Tailwind CSS, deployed on Vercel. It replaces the earlier Angular frontend and Spring Boot backend ([archived](https://github.com/cmolina12/senehorario-backend)).

```
src/
  app/
    page.tsx                 landing page
    planning/page.tsx        planner
    api/courses/route.ts     GET /api/courses?q=&professor=   (proxy to the Uniandes catalog)
    api/courses/cbu/route.ts GET /api/courses/cbu             (all CBU courses)
  components/planner/        planner UI (panels, calendar, plans modal) + usePlanner state hook
  lib/
    uniandes.ts              catalog client + raw → Course/Section/Meeting mapping (server only)
    scheduler.ts             conflict detection + schedule generation (runs in the browser)
    calendar-events.ts       schedules → FullCalendar events (8A/8B handling)
    terms.ts                 academic term helpers
    storage.ts               localStorage persistence
```

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (vitest)
npm run lint
npm run typecheck
npm run build
```

Optional env var: `UNIANDES_API_BASE_URL` (defaults to `https://ofertadecursos.uniandes.edu.co/api/courses`).

## License

MIT, see [LICENSE](LICENSE).
