import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Amiri } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gems of the Salaf | جواهر السلف",
    template: "%s | Gems of the Salaf"
  },
  description: "A scholarly digital library of sayings from the Salaf with Arabic originals and English translations.",
  openGraph: {
    title: "Gems of the Salaf",
    description: "A scholarly digital library of sayings from the Salaf.",
    url: "https://gemsofthesalaf.com",
    siteName: "Gems of the Salaf",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-foreground bg-background">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
