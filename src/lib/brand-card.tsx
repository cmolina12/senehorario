// Brand card rendered to PNG with next/og: the link preview (opengraph-image)
// and the README banner (/brand/light, /brand/dark) share this design.
// next/og supports a subset of CSS: every element with several children needs
// display:flex, there's no grid and no color-mix, so tints are precomputed.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type BrandTheme = "light" | "dark";

const FONT_DIR = join(process.cwd(), "src/assets/fonts");

export async function brandFonts() {
  const load = (weight: 500 | 700 | 800) => readFile(join(FONT_DIR, `PlusJakartaSans-${weight}.ttf`));
  const [regular, bold, extraBold] = await Promise.all([load(500), load(700), load(800)]);
  return [
    { name: "Jakarta", data: regular, weight: 500 as const, style: "normal" as const },
    { name: "Jakarta", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Jakarta", data: extraBold, weight: 800 as const, style: "normal" as const },
  ];
}

export async function brandMascot(): Promise<string> {
  const png = await readFile(join(process.cwd(), "public/images/peluche.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

const PALETTE = {
  dark: {
    bg: "#151a2e",
    glow: "rgba(240, 200, 0, 0.16)",
    text: "#ffffff",
    muted: "rgba(255, 255, 255, 0.72)",
    chip: "rgba(255, 255, 255, 0.08)",
    chipBorder: "rgba(255, 255, 255, 0.14)",
    card: "#0f1422",
    cardBorder: "#2b3650",
    line: "#1f2739",
    cardText: "#eef0f8",
    cardMuted: "#7c8399",
    url: "#f0c800",
    highlight: "#f0c800",
    highlightText: "#151a2e",
    tint: 0.32,
  },
  light: {
    bg: "#f4f4f7",
    glow: "rgba(240, 200, 0, 0.28)",
    text: "#1a1a2e",
    muted: "#55556a",
    chip: "#ffffff",
    chipBorder: "#e4e4e9",
    card: "#ffffff",
    cardBorder: "#e4e4e9",
    line: "#ececf1",
    cardText: "#1a1a2e",
    cardMuted: "#8a8a9a",
    url: "#1a1a2e",
    highlight: "#f0c800",
    highlightText: "#1a1a2e",
    tint: 0.22,
  },
} as const;

const COLORS = ["#67A6D4", "#A05DD4", "#E1A557", "#E1628B"];

// [code, day 0-4, start hour, end hour, color index]
const CLASSES: [string, number, number, number, number][] = [
  ["MATE1203", 0, 7, 8.33, 0],
  ["MATE1203", 2, 7, 8.33, 0],
  ["MATE1203", 4, 7, 8.33, 0],
  ["ISIS1221", 1, 9.5, 10.83, 1],
  ["ISIS1221", 3, 9.5, 10.83, 1],
  ["FISI1018", 0, 11, 12.33, 2],
  ["FISI1018", 2, 11, 12.33, 2],
  ["CBUH1003", 1, 14, 15.33, 3],
];

const NRCS: [string, string, number][] = [
  ["MATE1203 · 1", "36109", 0],
  ["ISIS1221 · 3", "41893", 1],
  ["FISI1018 · 2", "80985", 2],
  ["CBUH1003 · 1", "77302", 3],
];

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const START = 7;
const END = 16;

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const time = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/** 1200×630 design; `scale` renders it larger (2 for a crisp README banner). */
export function BrandCard({ theme, mascot, scale = 1 }: { theme: BrandTheme; mascot: string; scale?: number }) {
  const p = PALETTE[theme];
  const u = (n: number) => n * scale;

  const colWidth = 80;
  const rowHeight = 40;
  const gridLeft = 46;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: p.bg,
        backgroundImage: `radial-gradient(circle at 82% 18%, ${p.glow}, transparent 48%)`,
        fontFamily: "Jakarta",
        color: p.text,
        borderBottom: `${u(10)}px solid #f0c800`,
      }}
    >
      {/* Left: brand, headline, promise */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: u(600),
          padding: `${u(56)}px 0 ${u(52)}px ${u(64)}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: u(14) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascot} width={u(48)} height={u(48)} alt="" />
          <div style={{ fontSize: u(30), fontWeight: 800, letterSpacing: u(-0.5) }}>Senéhorario</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: u(62), fontWeight: 800, lineHeight: 1.08, letterSpacing: u(-2) }}>Tu horario</div>
          <div style={{ display: "flex", position: "relative", alignSelf: "flex-start" }}>
            {theme === "light" && (
              <div
                style={{
                  position: "absolute",
                  left: u(-6),
                  right: u(-2),
                  bottom: u(12),
                  height: u(24),
                  borderRadius: u(4),
                  background: p.highlight,
                }}
              />
            )}
            <div
              style={{
                fontSize: u(62),
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: u(-2),
                color: theme === "dark" ? p.highlight : p.highlightText,
              }}
            >
              sin choques,
            </div>
          </div>
          <div style={{ fontSize: u(62), fontWeight: 800, lineHeight: 1.08, letterSpacing: u(-2) }}>
            directo a Banner.
          </div>
          <div style={{ marginTop: u(22), fontSize: u(23), fontWeight: 500, lineHeight: 1.4, color: p.muted }}>
            Todas las combinaciones de tus cursos, los CBUs que encajan y los NRCs listos para inscribir.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: u(8) }}>
            {["Gratis", "Sin cuenta", "Código abierto"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: u(7),
                  padding: `${u(6)}px ${u(12)}px`,
                  borderRadius: u(999),
                  background: p.chip,
                  border: `${u(1)}px solid ${p.chipBorder}`,
                  fontSize: u(16),
                  fontWeight: 700,
                }}
              >
                <div style={{ width: u(7), height: u(7), borderRadius: u(7), background: "#f0c800" }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: mini planner + NRC card */}
      <div style={{ display: "flex", position: "relative", flex: 1, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: u(gridLeft + colWidth * 5 + 34),
            padding: u(18),
            borderRadius: u(22),
            background: p.card,
            border: `${u(1)}px solid ${p.cardBorder}`,
            boxShadow: theme === "dark" ? `0 ${u(24)}px ${u(60)}px rgba(0,0,0,0.45)` : `0 ${u(24)}px ${u(60)}px rgba(26,26,46,0.14)`,
            marginTop: u(-26),
            color: p.cardText,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: u(12) }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: u(17), fontWeight: 800 }}>Tu horario</div>
              <div style={{ fontSize: u(12), fontWeight: 500, color: p.cardMuted }}>4 cursos · 13 créditos · 2027-10</div>
            </div>
            <div
              style={{
                display: "flex",
                padding: `${u(5)}px ${u(11)}px`,
                borderRadius: u(9),
                border: `${u(1)}px solid ${p.cardBorder}`,
                fontSize: u(13),
                fontWeight: 500,
                color: p.cardMuted,
              }}
            >
              ‹ Opción&nbsp;<span style={{ color: p.cardText, fontWeight: 800 }}>3</span>&nbsp;de 28 ›
            </div>
          </div>

          <div style={{ display: "flex", paddingLeft: u(gridLeft) }}>
            {DAYS.map((day) => (
              <div
                key={day}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: u(colWidth),
                  fontSize: u(13),
                  fontWeight: 700,
                  color: p.cardMuted,
                  marginBottom: u(6),
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", position: "relative", height: u((END - START) * rowHeight) }}>
            {Array.from({ length: END - START }, (_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: u(i * rowHeight),
                  display: "flex",
                  alignItems: "flex-start",
                  borderTop: `${u(1)}px solid ${p.line}`,
                }}
              >
                <div style={{ width: u(gridLeft - 8), fontSize: u(11), fontWeight: 500, color: p.cardMuted, marginTop: u(-1) }}>
                  {`${START + i}:00`}
                </div>
              </div>
            ))}
            {CLASSES.map(([code, day, start, end, color], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: u(gridLeft + day * colWidth + 3),
                  top: u((start - START) * rowHeight + 2),
                  width: u(colWidth - 6),
                  height: u((end - start) * rowHeight - 4),
                  display: "flex",
                  flexDirection: "column",
                  padding: `${u(4)}px ${u(6)}px`,
                  borderRadius: u(7),
                  borderLeft: `${u(4)}px solid ${COLORS[color]}`,
                  background: rgba(COLORS[color], p.tint),
                }}
              >
                <div style={{ fontSize: u(12), fontWeight: 800 }}>{code}</div>
                <div style={{ fontSize: u(11), fontWeight: 500, color: p.cardMuted }}>{time(start)}</div>
              </div>
            ))}
            {/* Blocked lunch */}
            {[1, 3].map((day) => (
              <div
                key={day}
                style={{
                  position: "absolute",
                  left: u(gridLeft + day * colWidth + 3),
                  top: u((12.5 - START) * rowHeight + 2),
                  width: u(colWidth - 6),
                  height: u(rowHeight - 4),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: u(7),
                  border: `${u(1)}px dashed ${p.cardBorder}`,
                  fontSize: u(11),
                  fontWeight: 700,
                  color: p.cardMuted,
                }}
              >
                Almuerzo
              </div>
            ))}
          </div>
        </div>

        {/* NRC card overlapping the planner */}
        <div
          style={{
            position: "absolute",
            right: u(34),
            bottom: u(26),
            width: u(250),
            display: "flex",
            flexDirection: "column",
            padding: u(14),
            borderRadius: u(16),
            background: p.card,
            border: `${u(1)}px solid ${p.cardBorder}`,
            boxShadow: theme === "dark" ? `0 ${u(16)}px ${u(40)}px rgba(0,0,0,0.5)` : `0 ${u(16)}px ${u(40)}px rgba(26,26,46,0.18)`,
            color: p.cardText,
          }}
        >
          <div style={{ fontSize: u(14), fontWeight: 800, marginBottom: u(8) }}>NRCs listos para Banner</div>
          {NRCS.map(([label, nrc, color]) => (
            <div key={nrc} style={{ display: "flex", alignItems: "center", gap: u(8), marginBottom: u(5) }}>
              <div style={{ width: u(8), height: u(8), borderRadius: u(8), background: COLORS[color] }} />
              <div style={{ flex: 1, fontSize: u(12), fontWeight: 500, color: p.cardMuted }}>{label}</div>
              <div style={{ fontSize: u(13), fontWeight: 800 }}>{nrc}</div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: u(6),
              padding: `${u(7)}px 0`,
              borderRadius: u(9),
              background: "#f0c800",
              color: "#1a1a2e",
              fontSize: u(13),
              fontWeight: 800,
            }}
          >
            Copiar todos
          </div>
        </div>
      </div>
    </div>
  );
}
