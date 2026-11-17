import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import { LEGACY_IMPORT_SCRIPT } from "@/lib/legacy-import-script";

const SITE_URL = "https://senehorario.cmolina.xyz";
const DESCRIPTION =
  "Arma tu horario de la Universidad de los Andes sin choques: busca cursos, compara todas las combinaciones, encuentra CBUs que encajan y copia los NRCs para Banner. Gratis y de código abierto.";

// Self-hosted at build time: no request to Google and no jump when it loads.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Senéhorario · Planifica tu horario Uniandes sin conflictos",
    template: "%s · Senéhorario",
  },
  description: DESCRIPTION,
  applicationName: "Senéhorario",
  keywords: [
    "horario Uniandes",
    "Universidad de los Andes",
    "planificador de horarios",
    "Banner",
    "NRC",
    "CBU",
    "oferta de cursos",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: SITE_URL,
    siteName: "Senéhorario",
    title: "Senéhorario · Planifica tu horario Uniandes sin conflictos",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Senéhorario · Planifica tu horario Uniandes sin conflictos",
    description: DESCRIPTION,
  },
  icons: { icon: "/favicon.ico" },
};

const GA_ID = "G-YQL4WC9SNL";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LEGACY_IMPORT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "${GA_ID}");`}
        </Script>
      </body>
    </html>
  );
}
