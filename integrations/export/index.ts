import JSZip from "jszip";
import type { Project } from "../../lib/core/types.ts";

export interface ExportAdapter {
  exportProject(project: Project): Promise<Blob>;
}

function safeFolderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wallpaper-project";
}

export class ZipExportAdapter implements ExportAdapter {
  async exportProject(project: Project) {
    const zip = new JSZip();
    const root = zip.folder(safeFolderName(project.projectName))!;
    const production = root.folder("production-master")!;
    if (project.productionMaster?.fileUrl.startsWith("data:")) {
      const [, data = ""] = project.productionMaster.fileUrl.split(",");
      production.file(project.productionMaster.fileName || "production-master.png", data, { base64: true });
    } else {
      production.file("README.txt", "Upload a Production Master before final export. No room, furniture, staging or perspective belongs in this folder.\n");
    }
    const mockups = root.folder("mockups")!;
    const listingImages = root.folder("listing-images")!;
    project.slots.forEach((slot, index) => {
      const note = `${slot.role}\nStatus: ${slot.status}\nVersion: ${slot.version}\nSource: Production Master ${project.productionMaster?.version ?? 0}\n`;
      mockups.file(`${String(index + 1).padStart(2, "0")}-${safeFolderName(slot.role)}.txt`, note);
      listingImages.file(`${String(index + 1).padStart(2, "0")}-${safeFolderName(slot.role)}.txt`, note);
    });
    root.folder("prompts")!.file("midjourney-prompt.txt", project.prompt.promptText || "Prompt has not been generated yet.");
    root.folder("prompts")!.file("parameters.json", JSON.stringify(project.prompt.parameters, null, 2));
    const listing = root.folder("listing-content")!;
    listing.file("title.txt", project.listing.title);
    listing.file("description.txt", project.listing.description);
    listing.file("tags.txt", project.listing.tags.join("\n"));
    root.file("project.json", JSON.stringify({ ...project, productionMaster: project.productionMaster ? { ...project.productionMaster, fileUrl: "[asset omitted from metadata]" } : null }, null, 2));
    return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  }
}
