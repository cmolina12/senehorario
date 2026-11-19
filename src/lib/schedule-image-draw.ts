// Draws a ScheduleImageModel onto a canvas: a branded card with the week,
// a legend and the site's address. Uses the page's font and theme colors, so
// it runs in the browser only.

import { dayLabel } from "./format";
import type { ScheduleImageModel } from "./schedule-image";

export type ImageFormat = "story" | "wide";

export const IMAGE_SIZES: Record<ImageFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 }, // 9:16, WhatsApp/Instagram stories
  wide: { width: 1600, height: 1000 }, // 16:10, chats and desktops
};

export interface ImageHeader {
  term: string; // "2027-10"
  option: number;
  courses: number;
  credits: number;
}

interface Theme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  secondary: string;
  muted: string;
  tint: number; // share of the course color in a block's fill
}

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    bg: v("--bg"),
    surface: v("--surface"),
    border: v("--border"),
    text: v("--text-primary"),
    secondary: v("--text-secondary"),
    muted: v("--text-muted"),
    tint: parseFloat(v("--event-tint")) / 100 || 0.3,
  };
}

/** "#67A6D4" mixed into "#ffffff" by `amount` (0–1), as an rgb() string. */
function mix(hex: string, base: string, amount: number): string {
  const rgb = (h: string) => {
    const m = h.replace("#", "").match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    return m ? m.slice(1).map((x) => parseInt(x, 16)) : [255, 255, 255];
  };
  const [a, b] = [rgb(hex), rgb(base)];
  const c = a.map((x, i) => Math.round(x * amount + b[i] * (1 - amount)));
  return `rgb(${c.join(", ")})`;
}

const WEIGHTS = ["400", "600", "700", "800"];

/** Renders the image; resolves once the font and logo are ready. */
export async function renderScheduleImage(
  model: ScheduleImageModel,
  header: ImageHeader,
  format: ImageFormat,
): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = IMAGE_SIZES[format];
  const story = format === "story";
  const theme = readTheme();
  const family = getComputedStyle(document.body).fontFamily;
  await Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 24px ${family}`).catch(() => [])));
  const logo = await loadImage("/images/peluche-mark.png");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: string, size: number) => `${weight} ${size}px ${family}`;

  const text = (value: string, x: number, y: number, weight: string, size: number, color: string, maxWidth?: number, align: CanvasTextAlign = "left") => {
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(maxWidth ? fit(ctx, value, maxWidth) : value, x, y);
  };
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, story ? 28 : 22);
    ctx.fillStyle = theme.surface;
    ctx.fill();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // Header: mascot, name, summary; period and option on the right.
  const P = story ? 72 : 56;
  const logoSize = story ? 92 : 68;
  if (logo) ctx.drawImage(logo, P, P, logoSize, logoSize);
  const tx = P + logoSize + (story ? 20 : 16);
  text("Senéhorario", tx, P + logoSize * 0.48, "800", story ? 46 : 36, theme.text);
  const summary = `${header.courses} ${header.courses === 1 ? "curso" : "cursos"} · ${header.credits} ${header.credits === 1 ? "crédito" : "créditos"}`;
  text(summary, tx, P + logoSize * 0.9, "600", story ? 28 : 22, theme.secondary);
  text(header.term, W - P, P + logoSize * 0.48, "800", story ? 40 : 32, theme.text, undefined, "right");
  text(`Opción ${header.option}`, W - P, P + logoSize * 0.9, "600", story ? 28 : 22, theme.secondary, undefined, "right");

  // Areas: story stacks grid, legend and notes; wide puts the legend on the right.
  const top = P + logoSize + (story ? 44 : 32);
  const footerH = story ? 70 : 52;
  const rowH = story ? 86 : 66;
  const noteH = story ? 40 : 32;
  const legendBlockH = model.legend.length * rowH + model.notes.length * noteH;
  const legendW = story ? W - 2 * P : 470;
  const grid = story
    ? { x: P, y: top, w: W - 2 * P, h: H - top - P - footerH - legendBlockH - 48 }
    : { x: P, y: top, w: W - 2 * P - legendW - 32, h: H - top - P - footerH };
  const legend = story ? { x: P, y: grid.y + grid.h + 48 } : { x: grid.x + grid.w + 32, y: top };

  // Week grid.
  panel(grid.x, grid.y, grid.w, grid.h);
  const timeW = story ? 86 : 72;
  const headH = story ? 64 : 52;
  const colW = (grid.w - timeW - 16) / model.days.length;
  const hours = model.endHour - model.startHour;
  const hourH = (grid.h - headH - 20) / hours;
  const gx = grid.x + timeW;
  const gy = grid.y + headH;
  model.days.forEach((day, i) => {
    text(dayLabel(day), gx + colW * i + colW / 2, grid.y + headH * 0.62, "700", story ? 26 : 21, theme.secondary, undefined, "center");
  });
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1.5;
  for (let h = 0; h <= hours; h++) {
    const y = gy + h * hourH;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(grid.x + grid.w - 16, y);
    ctx.stroke();
    if (h < hours) text(`${model.startHour + h}:00`, gx - 14, y + (story ? 26 : 21), "600", story ? 22 : 18, theme.muted, undefined, "right");
  }

  const pad = story ? 12 : 9;
  for (const b of model.blocks) {
    const laneW = colW / b.lanes;
    const x = gx + colW * b.day + laneW * b.lane + 4;
    const y = gy + ((b.start - model.startHour * 60) / 60) * hourH + 2;
    const w = laneW - 8;
    const h = Math.max(((b.end - b.start) / 60) * hourH - 4, 24);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, story ? 14 : 11);
    ctx.fillStyle = mix(b.color, theme.surface, theme.tint);
    ctx.fill();
    ctx.clip();
    const bar = story ? 7 : 5;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, bar, h);
    const big = story ? 24 : 19;
    const small = story ? 20 : 16;
    const inner = w - bar - pad * 2;
    const left = x + bar + pad;
    const fits = (value: string, weight: string, size: number, width: number) => {
      ctx.font = font(weight, size);
      return ctx.measureText(value).width <= width;
    };

    if (fits(b.code, "800", big, inner)) {
      // Longest heading that fits: code · section · half, dropping the extras first.
      const withHalf = (head: string) => (b.half ? `${head} · ${b.half}` : head);
      const withSection = b.section ? `${b.code} · ${b.section}` : b.code;
      const heading =
        [withHalf(withSection), withHalf(b.code), withSection, b.code].find((h) => fits(h, "800", big, inner)) ?? b.code;
      const time = b.online && fits(`${b.time} · Virtual`, "600", small, inner) ? `${b.time} · Virtual` : b.time;
      let line = y + pad + big * 0.85;
      text(heading, left, line, "800", big, theme.text);
      for (const [value, weight] of [
        [time, "600"],
        [b.title, "400"],
      ] as const) {
        if (line + small * 1.4 >= y + h - pad) break;
        line += small * 1.35;
        text(value, left, line, weight, small, theme.secondary, inner);
      }
    } else {
      // Narrow (side-by-side 8A/8B): stack "MISW" / "4301" / "8A" in a size that fits.
      const tight = 6;
      const room = w - bar - tight * 2;
      const pieces = [b.code.slice(0, 4), b.code.slice(4), b.half ?? ""].filter(Boolean);
      ctx.font = font("800", big);
      const widest = Math.max(...pieces.map((p) => ctx.measureText(p).width));
      const size = Math.max(12, Math.min(big, Math.floor((big * room) / widest)));
      let line = y + tight + size * 0.9;
      pieces.forEach((piece, i) => {
        if (line > y + h - tight) return;
        text(piece, x + bar + tight, line, i < 2 ? "800" : "600", size, i < 2 ? theme.text : theme.secondary);
        line += size * 1.15;
      });
    }
    ctx.restore();
  }

  // Legend: one row per course, then notes.
  let ly = legend.y;
  const dot = story ? 11 : 9;
  for (const row of model.legend) {
    ctx.beginPath();
    ctx.arc(legend.x + dot, ly + rowH * 0.32, dot, 0, Math.PI * 2);
    ctx.fillStyle = row.color;
    ctx.fill();
    const lx = legend.x + dot * 2 + 16;
    const lw = legendW - (lx - legend.x);
    ctx.font = font("800", story ? 30 : 23);
    const codeW = ctx.measureText(row.code).width;
    text(row.code, lx, ly + rowH * 0.42, "800", story ? 30 : 23, theme.text);
    text(row.title, lx + codeW + 14, ly + rowH * 0.42, "400", story ? 28 : 21, theme.secondary, lw - codeW - 14);
    text(row.detail, lx, ly + rowH * 0.8, "600", story ? 24 : 18, theme.muted, lw);
    ly += rowH;
  }
  for (const note of model.notes) {
    text(note, legend.x, ly + noteH * 0.7, "600", story ? 24 : 18, theme.muted, legendW);
    ly += noteH;
  }

  text("senehorario.cmolina.xyz", W / 2, H - P + (story ? 8 : 6), "700", story ? 28 : 22, theme.muted, undefined, "center");
  return canvas;
}

/** Shortens `value` with an ellipsis until it fits `maxWidth` in the current font. */
function fit(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let end = value.length;
  while (end > 0 && ctx.measureText(`${value.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return end > 0 ? `${value.slice(0, end).trimEnd()}…` : "";
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
