# Senéhorario Frontend

This is the frontend for **Senéhorario**, a web application designed to help students at Uniandes build optimal class schedules.

## Try It Online

You can use Senéhorario directly in your browser:

- **Live site:** [https://cmolina.xyz/senehorario/](https://cmolina.xyz/senehorario/)

## Current features

- Search the Uniandes catalog by NRC, course code, or name, including section details (professors, term/cycle, meeting times).
- Select sections per course with a quick view of what you’ve chosen.
- Automatic checks for required lab/main pairings to prevent invalid selections.
- Generate compatible schedule options and step through them.
- Interactive weekly calendar preview (FullCalendar) with color-coded classes; click a class to view section details.
- Planner state persists in your browser so you can resume later.

## Roadmap

Planned features and ideas (not yet implemented):

- [x] Search by professor, or by department / field of interest.
- [x] Suggest CBUs that fit into the current gaps in your schedule.
- [ ] Mark selected classes as "options" rather than required — so two overlapping classes can both be considered when you only intend to take one of them (and don't care which).
- [x] Save, view, and switch between multiple plans.
- [ ] Manually-added time blocks (e.g. to reserve slots for non-class commitments).
- [ ] Some kind of database to show professor ratings from Los Estudiantes directly within the app.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
