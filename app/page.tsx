import type { Metadata } from "next";
import StudioApp from "./StudioApp";

export const metadata: Metadata = {
  title: "Wallpaper AI Studio",
  description: "Prompt veya hazır görselden kontrollü duvar kâğıdı mockup seti oluşturun.",
};

export default function Home() {
  return <StudioApp />;
}
