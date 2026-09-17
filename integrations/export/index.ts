import JSZip from "jszip";
import type { ExportJob, OutputAsset, Project } from "../../lib/core/types.ts";
import { DEFAULT_OUTPUT_PROFILE } from "../../lib/core/output-profiles.ts";

export type ExportPackageType = ExportJob["packageType"];
export interface AssetResolver { read(url: string, userId: string): Promise<Blob | null>; }
export interface ExportAdapter { exportProject(input: { project: Project; userId: string; packageType: ExportPackageType; resolver?: AssetResolver; assetIds?: string[] }): Promise<{ blob: Blob; job: ExportJob; fileNames: string[] }>; }

const safe = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wallpaper-project";
const defaultResolver: AssetResolver = { async read(url) { try { const response = await fetch(url); return response.ok ? response.blob() : null; } catch { return null; } } };
const mockupNames: Record<string, string> = { "Hero room": "01-hero-room.jpg", "Alternate room": "02-alternate-room.jpg", "Close-up detail": "03-close-up-detail.jpg", "Wide room view": "04-wide-room-view.jpg", "Styled room view": "05-styled-room-view.jpg", "Clean wall presentation": "06-clean-wall-presentation.jpg" };
const guideNames: Record<string, string> = { "Clean Design": "07-clean-design.jpg", "Repeat Map": "08-repeat-map.jpg", "Mural Map": "08-mural-map.jpg", "Size Information": "09-size-information.jpg", "Order Guide": "10-order-guide.jpg" };

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/(api.?key|token|secret|oauth|authorization|cookie)/i.test(key)).map(([key, item]) => [key, stripSecrets(item)]));
  return value;
}
function omitFileUrl<T extends { fileUrl: string; previewUrl?: string }>(asset: T): Omit<T, "fileUrl" | "previewUrl"> { const copy: Partial<T> = { ...asset }; delete (copy as Partial<T> & { fileUrl?: string }).fileUrl; delete (copy as Partial<T> & { previewUrl?: string }).previewUrl; return copy as Omit<T, "fileUrl" | "previewUrl">; }
function safeProject(project: Project) {
  const sourceLabels = { generated_prompt: "Generated prompt", user_upload: "User upload", imported: "Imported", other: "Other" } as const;
  const safeValue = { ...project, artworkSourceLabel: `Artwork source: ${sourceLabels[project.artworkSource]}`, masterVersions: project.masterVersions.map(omitFileUrl), productionMaster: project.productionMaster ? omitFileUrl(project.productionMaster) : null, outputAssets: project.outputAssets.map(omitFileUrl), exportJobs: [] };
  return stripSecrets(safeValue);
}

async function addAsset(folder: JSZip, name: string, asset: OutputAsset, resolver: AssetResolver, userId: string) {
  if (asset.userId !== userId) throw new Error("RESOURCE_NOT_FOUND"); const blob = await resolver.read(asset.fileUrl, userId); if (!blob) throw new Error(`ASSET_UNAVAILABLE:${asset.id}`); folder.file(name, await blob.arrayBuffer());
}

export class ZipExportAdapter implements ExportAdapter {
  async exportProject(input: { project: Project; userId: string; packageType: ExportPackageType; resolver?: AssetResolver; assetIds?: string[] }) {
    const { project, userId, packageType } = input; if (project.userId !== userId) throw new Error("RESOURCE_NOT_FOUND");
    const now = new Date().toISOString(); const idempotencyKey = `${userId}:${project.id}:${packageType}:${project.activeMasterVersionId || "none"}`;
    const job: ExportJob = { id: `export-${crypto.randomUUID()}`, projectId: project.id, userId, packageType, status: "COLLECTING_FILES", idempotencyKey, storageKey: null, signedDownloadUrl: null, expiresAt: null, createdAt: now, completedAt: null, errorCode: null };
    const zip = new JSZip(); const root = zip.folder(safe(project.projectName))!; const resolver = input.resolver ?? defaultResolver;
    const include = (type: ExportPackageType) => packageType === "complete" || packageType === type;
    if (include("production")) {
      const production = root.folder("01-production-master")!; const master = project.productionMaster;
      if (!master || master.userId !== userId) throw new Error("MASTER_UNAVAILABLE"); const original = await resolver.read(master.fileUrl, userId); if (!original) throw new Error("MASTER_UNAVAILABLE");
      production.file(`original-master.${master.fileName.split(".").pop() || "bin"}`, await original.arrayBuffer());
      production.file("master-preview.jpg", await original.arrayBuffer());
      production.file("master-metadata.json", JSON.stringify({ ...master, fileUrl: "[asset omitted]" }, null, 2));
    }
    const approved = project.outputAssets.filter((asset) => asset.approved && project.slots.some((slot) => slot.outputAssetId === asset.id) && (!input.assetIds || input.assetIds.includes(asset.id)));
    if (include("mockups") || include("listing-images")) {
      const mockups = include("mockups") ? root.folder("02-mockups")! : null; const listing = include("listing-images") ? root.folder("02-listing-images")! : null;
      for (const asset of approved.filter((item) => mockupNames[item.role])) { if (mockups) await addAsset(mockups, mockupNames[asset.role], asset, resolver, userId); if (listing) await addAsset(listing, mockupNames[asset.role], asset, resolver, userId); }
      if (listing) for (const asset of approved.filter((item) => guideNames[item.role])) await addAsset(listing, guideNames[asset.role], asset, resolver, userId);
    }
    if (packageType === "complete") {
      const guides = root.folder("03-listing-guides")!; for (const asset of approved.filter((item) => guideNames[item.role])) await addAsset(guides, guideNames[asset.role], asset, resolver, userId);
    }
    if (include("prompts") && project.artworkSource === "generated_prompt" && project.prompt.promptText.trim()) { const prompts = root.folder("04-prompts")!; prompts.file("midjourney-prompt.txt", project.prompt.promptText); prompts.file("design-dna.json", JSON.stringify({ theme: project.prompt.theme, style: project.prompt.style, palette: project.prompt.palette, motifs: project.prompt.motifs }, null, 2)); prompts.file("prompt-parameters.json", JSON.stringify(project.prompt.parameters, null, 2)); prompts.file("variation-history.json", "[]"); }
    if (include("listing-content")) { const listing = root.folder("05-listing-content")!; listing.file("etsy-title.txt", project.listing.title); listing.file("etsy-description.txt", project.listing.description); listing.file("etsy-tags.txt", project.listing.tags.join("\n")); listing.file("listing-data.json", JSON.stringify(project.listing, null, 2)); }
    if (packageType === "complete") { const data = root.folder("06-project-data")!; data.file("project.json", JSON.stringify(safeProject(project), null, 2)); data.file("art-direction.json", JSON.stringify(project.artDirection, null, 2)); data.file("mockup-output-profile.json", JSON.stringify(DEFAULT_OUTPUT_PROFILE, null, 2)); data.file("asset-manifest.json", JSON.stringify(approved.map(omitFileUrl), null, 2)); }
    root.file("README.txt", "Wallpaper AI Studio export\nSource Artwork is immutable. Mockup Outputs are derived presentation assets.\nNo tokens, API keys, OAuth credentials or private server data are included.\n");
    job.status = "CREATING_ARCHIVE"; const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }); job.status = "READY"; job.completedAt = new Date().toISOString();
    return { blob, job, fileNames: Object.keys(zip.files) };
  }
}
