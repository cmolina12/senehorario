import { ImageResponse } from "next/og";
import { BrandCard, brandFonts, brandMascot } from "@/lib/brand-card";

// Link preview (WhatsApp, iMessage, Slack, search results…), generated at build time.
export const alt = "Senéhorario: planifica tu horario Uniandes sin conflictos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [fonts, mascot] = await Promise.all([brandFonts(), brandMascot()]);
  return new ImageResponse(<BrandCard theme="dark" mascot={mascot} />, { ...size, fonts });
}
