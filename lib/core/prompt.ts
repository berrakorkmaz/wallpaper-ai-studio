import type { Project } from "./types.ts";
import { getCharacterPreset } from "./theme-presets.ts";

export function compilePrompt(project: Project): string {
  const spec = project.prompt;
  if (project.productType === "seamless") {
    const isDisney = spec.theme === "Disney";
    const character = spec.characterStory === "custom" ? spec.customCharacterStory.trim() || "custom story concept" : getCharacterPreset(spec.characterStory).label;
    const subject = !isDisney ? spec.motifs : spec.patternContent === "Motifs Only" ? `${spec.motifs}, story-associated objects and environment only, no character figures from ${character}` : `${character} as the main character/story subject with supporting motifs: ${spec.motifs}`;
    const exclusions = spec.exclusions.trim() || "text, logos, furniture, watermarks";
    return `Seamless repeatable wallpaper pattern, theme: ${spec.theme}, featuring ${subject}, ${spec.style.toLowerCase()}, ${spec.palette.toLowerCase()} palette, ${project.mood.toLowerCase()} mood, ${spec.density} composition, ${project.patternScale ?? "medium"} pattern scale, front-facing clean print artwork, exclude ${exclusions}, no room, no wall, no frame, no perspective --tile --ar 1:1 --stylize ${spec.parameters.stylize} --chaos ${spec.parameters.chaos} --seed ${spec.parameters.seed}`;
  }
  const ratio = project.calculatedAspectRatio || "3:2";
  return `Wide panoramic wallpaper mural featuring ${spec.motifs}, ${spec.style.toLowerCase()}, ${spec.palette.toLowerCase()} palette, composed for a ${ratio} wall ratio, edge-safe composition, front-facing clean production artwork, no room, no furniture, no wall texture, no frame, no perspective, no text, no logo, no watermark --ar ${ratio} --stylize ${spec.parameters.stylize} --chaos ${spec.parameters.chaos} --seed ${spec.parameters.seed}`;
}
