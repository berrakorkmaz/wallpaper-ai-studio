import type { Project } from "./types.ts";

export function compilePrompt(project: Project): string {
  const spec = project.prompt;
  if (project.productType === "seamless") {
    return `Seamless repeatable wallpaper pattern featuring ${spec.motifs}, ${spec.style.toLowerCase()}, ${spec.palette.toLowerCase()} palette, ${spec.density} composition, ${project.patternScale ?? "medium"} pattern scale, front-facing clean print artwork, no room, no furniture, no wall, no frame, no perspective, no text, no logo, no watermark --tile --ar 1:1 --stylize ${spec.parameters.stylize} --chaos ${spec.parameters.chaos} --seed ${spec.parameters.seed}`;
  }
  const ratio = project.calculatedAspectRatio || "3:2";
  return `Wide panoramic wallpaper mural featuring ${spec.motifs}, ${spec.style.toLowerCase()}, ${spec.palette.toLowerCase()} palette, composed for a ${ratio} wall ratio, edge-safe composition, front-facing clean production artwork, no room, no furniture, no wall texture, no frame, no perspective, no text, no logo, no watermark --ar ${ratio} --stylize ${spec.parameters.stylize} --chaos ${spec.parameters.chaos} --seed ${spec.parameters.seed}`;
}
