import type { ArtworkSource, PatternScale, ProductType, Project, RenderSlot, WallpaperScalePolicy, WorkflowState } from "./types.ts";

export const MOCKUP_ROLES = ["Hero room", "Alternate room", "Close-up detail", "Wide room view", "Styled room view", "Clean wall presentation"] as const;
export const GUIDE_ROLES = ["Clean Design", "Repeat Map", "Size Information", "Order Guide"] as const;

function makeId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function productLabel(productType: ProductType) { return productType === "seamless" ? "Seamless" : "Mural"; }
function makeSlots(productType: ProductType): RenderSlot[] {
  void productType;
  return MOCKUP_ROLES.map((role, index) => ({ id: `mockup-${index + 1}`, role, kind: "mockup" as const, status: "idle" as const, version: 0, activeJobId: null, outputAssetId: null, required: true }));
}

const REPEAT_SCALE_CM: Record<PatternScale, number> = { small: 18, medium: 32, large: 48 };
export function wallpaperScalePolicy(productType: ProductType, patternScale: PatternScale | null): WallpaperScalePolicy {
  if (productType === "mural") return { mode: "mural", repeatWidthCm: null, repeatHeightCm: null, locked: true };
  const repeat = REPEAT_SCALE_CM[patternScale ?? "medium"];
  return { mode: "repeat", repeatWidthCm: repeat, repeatHeightCm: repeat, locked: true };
}

export function generateProjectName(input: { theme?: string; productType: ProductType; primaryTargetRoom?: string; sequenceNumber: number; generatedAt: string }) {
  const sequence = String(Math.max(1, input.sequenceNumber)).padStart(3, "0");
  if (input.theme?.trim() && input.primaryTargetRoom?.trim()) return `${input.theme.trim()} – ${productLabel(input.productType)} – ${input.primaryTargetRoom.trim()} – ${sequence}`;
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(input.generatedAt));
  return `Untitled ${productLabel(input.productType)} – ${date} – ${sequence}`;
}

export function generateUploadedProjectName(sequenceNumber: number, generatedAt: string) {
  const sequence = String(Math.max(1, sequenceNumber)).padStart(3, "0");
  const parts = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(generatedAt));
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = (parts.find((part) => part.type === "month")?.value ?? "Jan").slice(0, 3);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const date = `${day} ${month} ${year}`;
  return `Wallpaper Project — ${date} — ${sequence}`;
}

export function refreshProjectName(project: Project, force = false): Project {
  if (project.isProjectNameManuallyEdited && !force) return project;
  const projectNameGeneratedAt = new Date().toISOString();
  return { ...project, projectName: generateProjectName({ theme: project.prompt.theme, productType: project.productType, primaryTargetRoom: project.primaryTargetRoom, sequenceNumber: project.projectSequenceNumber, generatedAt: projectNameGeneratedAt }), projectNameGeneratedAt, isProjectNameManuallyEdited: false };
}

export function createDemoProject(userId = "demo-user", sequenceNumber = 1): Project {
  const now = new Date().toISOString(); const id = makeId("project");
  const prompt = { id: makeId("prompt"), projectId: id, theme: "Woodland", style: "Hand-painted gouache", palette: "Warm woodland", motifs: "foxes, fern leaves, tiny mushrooms", exclusions: "text, logos, furniture, people", characterStory: "", customCharacterStory: "", patternContent: "Characters + Motifs" as const, density: "balanced" as const, aspectRatio: "1:1", promptText: "", parameters: { stylize: 250, chaos: 8, seed: 28471 }, selectedAt: null, createdAt: now };
  const projectName = generateProjectName({ theme: prompt.theme, productType: "seamless", primaryTargetRoom: "Nursery", sequenceNumber, generatedAt: now });
  const recommendation = { collection: "Baby & Nursery", mood: "Soft & airy", patternScale: "medium" as PatternScale, colorPalette: ["#70806a", "#d7c7a5", "#8f6b4d"], suggestedRooms: ["Nursery", "Kids Room"], reason: "Nursery intent and woodland motifs" };
  return { id, userId, projectName, projectSequenceNumber: sequenceNumber, isProjectNameManuallyEdited: false, projectNameGeneratedAt: now,
    productType: "seamless", artworkSource: "other", primaryTargetRoom: "Nursery", secondaryTargetRoom: "Kids Room", patternScale: "medium", wallpaperScale: wallpaperScalePolicy("seamless", "medium"), artworkPlacementMode: "smart_fit", focalPoint: { x: 50, y: 50 }, physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: "1:1", targetPrintPpi: 150, requiredPixelWidth: 3000, requiredPixelHeight: 3000, createdAt: now, updatedAt: now, prompt,
    masterStatus: "AWAITING_UPLOAD", masterVersions: [], activeMasterVersionId: null, productionMaster: null,
    qa: { status: "AWAITING_UPLOAD", score: 0, checks: [], requiredWidth: 3000, requiredHeight: 3000, missingWidth: 3000, missingHeight: 3000, upscaleRequired: true },
    artworkAnalysis: null, artDirection: { collection: recommendation.collection, mood: recommendation.mood, patternScale: recommendation.patternScale, primaryTargetRoom: "Nursery", secondaryTargetRoom: "Kids Room", colorPalette: recommendation.colorPalette, recommendation, userOverridden: false, savedAt: null },
    collection: recommendation.collection, mood: recommendation.mood, slots: makeSlots("seamless"), renderJobs: [], outputAssets: [], exportJobs: [],
    listing: { id: makeId("listing"), projectId: id, userId, shopId: null, title: "Woodland Nursery Wallpaper · Fox & Fern Pattern", description: "A calm, story-led wallpaper concept prepared from an approved production master.", tags: ["woodland wallpaper", "nursery decor", "fox pattern", "forest wallpaper", "kids room", "gouache art", "nature wall decor"], price: "48.00", quantity: 999, productionPartner: "", variations: "", shippingProfileId: "", status: "editing", useProjectNameAsTitleSuggestion: false, createdAt: now } };
}

export function changeProductType(project: Project, productType: ProductType): Project {
  return refreshProjectName({ ...project, productType, patternScale: null, wallpaperScale: wallpaperScalePolicy(productType, null), physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: productType === "seamless" ? "1:1" : "", requiredPixelWidth: productType === "seamless" ? 3000 : 0, requiredPixelHeight: productType === "seamless" ? 3000 : 0, prompt: { ...project.prompt, aspectRatio: productType === "seamless" ? "1:1" : "" }, masterStatus: "AWAITING_UPLOAD", masterVersions: [], activeMasterVersionId: null, productionMaster: null, slots: makeSlots(productType), renderJobs: [], outputAssets: [] });
}

export function validateProject(project: Project) { const errors: Record<string, string> = {}; if (!project.productType) errors.productType = "Select a product type."; if (!project.primaryTargetRoom) errors.primaryTargetRoom = "Select a primary target room."; if (project.productType === "seamless" && !project.patternScale) errors.patternScale = "Select a pattern scale."; if (!project.productionMaster) errors.productionMaster = "Upload your source artwork."; return errors; }
export function setPatternScale(project: Project, patternScale: PatternScale): Project { return { ...project, patternScale, wallpaperScale: wallpaperScalePolicy("seamless", patternScale), artDirection: { ...project.artDirection, patternScale, userOverridden: true } }; }
export function selectArtworkSource(project: Project, artworkSource: ArtworkSource): Project {
  const prompt = artworkSource === "user_upload" ? { ...project.prompt, promptText: "", selectedAt: null } : project.prompt;
  return { ...project, artworkSource, prompt };
}
export function canRender(project: Project) { return project.masterStatus === "QA_PASSED" || project.masterStatus === "APPROVED"; }
export function allOutputsReady(project: Project) { return project.slots.length > 0 && project.slots.every((slot) => slot.status === "ready" && Boolean(slot.outputAssetId)); }
export function allOutputsApproved(project: Project) { return allOutputsReady(project) && project.outputAssets.filter((asset) => project.slots.some((slot) => slot.outputAssetId === asset.id)).every((asset) => asset.approved); }

export function workflowStates(project: Project): WorkflowState[] {
  const projectComplete = Object.keys(validateProject(project)).length === 0;
  const promptSkipped = project.artworkSource === "user_upload";
  const promptComplete = project.artworkSource === "generated_prompt" && Boolean(project.prompt.promptText.trim() && project.prompt.selectedAt);
  const masterComplete = canRender(project);
  const directionComplete = Boolean(project.artDirection.collection && project.artDirection.mood && (project.productType === "mural" || project.artDirection.patternScale) && project.artDirection.savedAt);
  const renderComplete = allOutputsApproved(project);
  const listingFields = Boolean(project.listing.title.trim() && project.listing.description.trim() && project.listing.tags.length === 13 && project.listing.price && project.listing.quantity > 0);
  const listingComplete = listingFields && (project.listing.status === "exported" || project.listing.status === "drafted");
  return [
    { complete: projectComplete, skipped: false, label: "Project", detail: "Required product fields saved" },
    { complete: promptComplete, skipped: promptSkipped, label: "Prompt Studio", detail: promptSkipped ? "Skipped · Artwork provided" : "A prompt generated and selected" },
    { complete: masterComplete, skipped: false, label: "Design Master", detail: "Upload passed QA" },
    { complete: directionComplete, skipped: false, label: "Art Direction", detail: "Collection, mood and scale saved" },
    { complete: renderComplete, skipped: false, label: "Render Queue", detail: "Mockup outputs ready and approved" },
    { complete: listingComplete, skipped: false, label: "Listing Studio", detail: "Listing exported or drafted" },
  ];
}

export function markSlotsStaleForNewMaster(project: Project): RenderSlot[] { return project.slots.map((slot) => ({ ...slot, status: slot.outputAssetId ? "stale" : "idle", activeJobId: null })); }
