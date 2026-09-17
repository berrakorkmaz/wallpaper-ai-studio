import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wallpaper-ai-studio.vercel.app"),
  title: "Wallpaper AI Studio",
  description: "Duvar kâğıdı fikirlerini prompta, hazır tasarımları kontrollü mockup setlerine dönüştüren sade çalışma alanı.",
  openGraph: { title: "Wallpaper AI Studio", description: "Prompt veya hazır görselden onaylanabilir duvar kâğıdı mockup setine.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Wallpaper AI Studio", description: "Prompt veya hazır görselden kontrollü mockup setine.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
