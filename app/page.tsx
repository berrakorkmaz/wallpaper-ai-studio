import type { Metadata } from "next";
import StudioApp from "./StudioApp";

export const metadata: Metadata = {
  title: "Wallpaper AI Studio",
  description: "An open-source workflow for wallpaper prompts, production masters, mockups and marketplace-ready listing drafts.",
};

export default function Home() {
  return <StudioApp />;
}
