import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link preview (WhatsApp, iMessage, Slack, search results…), generated at build time.
export const alt = "Senéhorario: planifica tu horario Uniandes sin conflictos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#67A6D4", "#A05DD4", "#E1A557", "#E1628B", "#81BA6C"];

// A small, decorative week: [day column, start row, length, color].
const BLOCKS: [number, number, number, number][] = [
  [0, 0, 2, 0],
  [3, 0, 2, 0],
  [4, 0, 2, 0],
  [1, 3, 2, 2],
  [3, 3, 2, 2],
  [2, 2, 2, 3],
  [0, 5, 2, 1],
  [1, 6, 2, 4],
  [3, 6, 2, 4],
];

export default async function Image() {
  const mascot = await readFile(join(process.cwd(), "public/images/peluche.png"));
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1a1a2e",
          color: "#ffffff",
          padding: "64px 72px",
          borderBottom: "14px solid #f0c800",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={mascotSrc} width={64} height={64} alt="" />
            <div style={{ fontSize: 40, fontWeight: 700 }}>Senéhorario</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, display: "flex", flexWrap: "wrap" }}>
              Tu horario Uniandes,&nbsp;
              <span style={{ color: "#f0c800" }}>sin choques.</span>
            </div>
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}>
              Todas las combinaciones, CBUs que encajan y los NRCs listos para Banner.
            </div>
          </div>
          <div style={{ fontSize: 24, color: "#f0c800" }}>senehorario.cmolina.xyz</div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            width: 420,
            height: "100%",
            display: "flex",
            position: "relative",
            background: "#ffffff",
            borderRadius: 24,
          }}
        >
          {BLOCKS.map(([day, row, length, color], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 22 + day * 76,
                top: 26 + row * 58,
                width: 68,
                height: length * 58 - 8,
                borderRadius: 10,
                background: `${COLORS[color]}55`,
                borderLeft: `6px solid ${COLORS[color]}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
