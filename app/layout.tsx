import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wallpaper-ai-studio.vercel.app"),
  title: "Wallpaper AI Studio",
  description: "Open-source workflow for wallpaper prompts, production masters, mockups and marketplace-ready listing drafts.",
  openGraph: { title: "Wallpaper AI Studio", description: "From production prompt to exportable wallpaper listing kit.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Wallpaper AI Studio", description: "Open-source wallpaper production workflow.", images: ["/og.png"] },
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
