import { cicloLabel, dayLabel, shortTime, termLabel } from "@/lib/format";
import type { SelectedEventInfo } from "./usePlanner";

export function EventDetailsPanel({ event }: { event: SelectedEventInfo | null }) {
  const section = event?.section;

  return (
    <div className="panel details-panel">
      <div className="panel-header">
        <span className="panel-title">Detalles de la Clase</span>
      </div>
      <div className="panel-body">
        {!event || !section ? (
          <div className="status-message muted">
            <i className="bi bi-hand-index"></i>
            <span>Haga clic en una clase en el horario para ver sus detalles</span>
          </div>
        ) : (
          <div className="event-detail">
            <div className="event-header">
              <div className="event-code">{event.courseCode || "Course"}</div>
              <div className="event-title">{event.courseTitle || "No disponible"}</div>
              <div className="event-credits">{event.courseCredits ?? "N/A"} creditos</div>
            </div>

            <div className="event-info-grid">
              <Info label="Sección" value={section.sectionId} />
              <Info label="NRC" value={section.nrc} />
              <Info label="Periodo" value={termLabel(section)} />
              <Info label="Duración" value={cicloLabel(section)} />
              {section.campus && <Info label="Campus" value={section.campus} fullWidth />}
              <Info label="Cupos" value={`${section.availableSeats}/${section.totalSeats}`} fullWidth />
              {section.professors?.length > 0 && (
                <Info label="Profesores" value={section.professors.join(", ")} fullWidth />
              )}
            </div>

            <div className="event-meetings">
              <span className="info-label">Días</span>
              <div className="meetings-list">
                {section.meetings.map((m, i) => (
                  <div key={i} className="meeting-item">
                    <span className="meeting-day">{dayLabel(m.day)}</span>
                    <span className="meeting-time">
                      {shortTime(m.start)}–{shortTime(m.end)}
                    </span>
                    {m.location && <span className="meeting-location">{m.location}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={`info-item${fullWidth ? " full-width" : ""}`}>
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
