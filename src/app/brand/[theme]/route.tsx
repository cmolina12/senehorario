import { ImageResponse } from "next/og";
import { BrandCard, brandFonts, brandMascot, type BrandTheme } from "@/lib/brand-card";

// README banner at 2× (2400×1260). To refresh the copies in .github/:
//   curl -o .github/banner-dark.png localhost:3000/brand/dark
//   curl -o .github/banner-light.png localhost:3000/brand/light
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ theme: "light" }, { theme: "dark" }];
}

export async function GET(_request: Request, { params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (theme !== "light" && theme !== "dark") return new Response("Not found", { status: 404 });
  const [fonts, mascot] = await Promise.all([brandFonts(), brandMascot()]);
  return new ImageResponse(<BrandCard theme={theme as BrandTheme} mascot={mascot} scale={2} />, {
    width: 2400,
    height: 1260,
    fonts,
  });
}
