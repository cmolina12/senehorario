import { cbuAttrLabel, cicloLabel, professorUrl, seatLevel, termLabel, titleCase } from "@/lib/format";
import { Fragment } from "react";
import type { Section } from "@/lib/types";
import { MeetingBadges } from "./MeetingBadges";

interface Props {
  section: Section;
  selected: boolean;
  onToggle: () => void;
  /** CBU listing: show attribute badges and the shorter seat label. */
  variant?: "search" | "cbu";
}

export function SectionItem({ section, selected, onToggle, variant = "search" }: Props) {
  const level = seatLevel(section);
  const ratio = section.totalSeats > 0 ? section.availableSeats / section.totalSeats : 0;
  const isCbu = variant === "cbu";

  return (
    <div className="section-item">
      <div className="section-main">
        <div className="section-header">
          <span className="section-nrc">NRC {section.nrc}</span>
          <span className="section-id">Sección {section.sectionId}</span>
        </div>
        <div className="section-meta">
          {termLabel(section)} · {cicloLabel(section)}
        </div>
        {isCbu && section.attrs?.length > 0 && (
          <div className="attr-badges">
            {section.attrs.map((attr) => (
              <span key={attr} className={`attr-badge attr-${attr.toLowerCase()}`}>
                {cbuAttrLabel(attr)}
              </span>
            ))}
          </div>
        )}
        <div className="section-seats">
          <div className="seats-display">
            <div className="seats-bar">
              <div className={`seats-fill fill-${level}`} style={{ width: `${ratio * 100}%` }}></div>
            </div>
            <span className={`seats-count count-${level}`}>
              <strong>{section.availableSeats}</strong> / {section.totalSeats}{" "}
              {isCbu ? "cupos" : "cupos disponibles"}
            </span>
          </div>
        </div>
        {section.professors?.length > 0 && (
          <div className="section-prof">
            {section.professors.map((prof, i) => (
              <Fragment key={i}>
                <a
                  href={professorUrl(prof)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prof-link"
                  title={isCbu ? undefined : "Ver en Los Estudiantes (puede no estar disponible)"}
                >
                  {titleCase(prof)}
                </a>
                {i < section.professors.length - 1 && <span>, </span>}
              </Fragment>
            ))}
          </div>
        )}
        <div className="section-meetings">
          <MeetingBadges meetings={section.meetings} />
        </div>
      </div>
      <button
        className={`btn-section-toggle${selected ? " selected" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={isCbu ? (selected ? "Quitar CBU" : "Agregar CBU") : "Toggle section"}
      >
        <i className={selected ? "bi bi-check" : "bi bi-plus"}></i>
      </button>
    </div>
  );
}
