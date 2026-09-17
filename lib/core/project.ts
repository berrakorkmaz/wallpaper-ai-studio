import type { PatternScale, ProductType, Project, RenderSlot, SlotRole, WorkflowState } from "./types.ts";
import { calculateAspectRatio, calculateRequiredPixels } from "./ratio.ts";

export const MOCKUP_ROLES = ["Hero", "Lifestyle", "Alternate Angle", "Secondary Setting", "Close-up", "Wide Shot"] as const;
export const GUIDE_ROLES = ["Clean Design", "Repeat Map", "Size Information", "Order Guide"] as const;

function makeId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function productLabel(productType: ProductType) { return productType === "seamless" ? "Seamless" : "Mural"; }
function makeSlots(productType: ProductType): RenderSlot[] {
  const guides: SlotRole[] = ["Clean Design", productType === "seamless" ? "Repeat Map" : "Mural Map", "Size Information", "Order Guide"];
  return [...MOCKUP_ROLES.map((role, index) => ({ id: `mockup-${index + 1}`, role, kind: "mockup" as const, status: "idle" as const, version: 0, activeJobId: null, outputAssetId: null, required: true })),
    ...guides.map((role, index) => ({ id: `guide-${index + 1}`, role, kind: "guide" as const, status: "idle" as const, version: 0, activeJobId: null, outputAssetId: null, required: true }))];
}

export function generateProjectName(input: { theme?: string; productType: ProductType; primaryTargetRoom?: string; sequenceNumber: number; generatedAt: string }) {
  const sequence = String(Math.max(1, input.sequenceNumber)).padStart(3, "0");
  if (input.theme?.trim() && input.primaryTargetRoom?.trim()) return `${input.theme.trim()} – ${productLabel(input.productType)} – ${input.primaryTargetRoom.trim()} – ${sequence}`;
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(input.generatedAt));
  return `Untitled ${productLabel(input.productType)} – ${date} – ${sequence}`;
}

export function refreshProjectName(project: Project, force = false): Project {
  if (project.isProjectNameManuallyEdited && !force) return project;
  const projectNameGeneratedAt = new Date().toISOString();
  return { ...project, projectName: generateProjectName({ theme: project.prompt.theme, productType: project.productType, primaryTargetRoom: project.primaryTargetRoom, sequenceNumber: project.projectSequenceNumber, generatedAt: projectNameGeneratedAt }), projectNameGeneratedAt, isProjectNameManuallyEdited: false };
}

export function createDemoProject(userId = "demo-user", sequenceNumber = 1): Project {
  const now = new Date().toISOString(); const id = makeId("project");
  const prompt = { id: makeId("prompt"), projectId: id, theme: "Woodland", style: "Hand-painted gouache", palette: "Warm woodland", motifs: "foxes, fern leaves, tiny mushrooms", exclusions: "text, logos, furniture, people", density: "balanced" as const, aspectRatio: "1:1", promptText: "", parameters: { stylize: 250, chaos: 8, seed: 28471 }, selectedAt: null, createdAt: now };
  const projectName = generateProjectName({ theme: prompt.theme, productType: "seamless", primaryTargetRoom: "Nursery", sequenceNumber, generatedAt: now });
  const recommendation = { collection: "Baby & Nursery", mood: "Soft & airy", patternScale: "medium" as PatternScale, reason: "Nursery intent and woodland motifs" };
  return { id, userId, projectName, projectSequenceNumber: sequenceNumber, isProjectNameManuallyEdited: false, projectNameGeneratedAt: now,
    productType: "seamless", primaryTargetRoom: "Nursery", secondaryTargetRoom: "Kids Room", patternScale: "medium", physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: "1:1", targetPrintPpi: 150, requiredPixelWidth: 3000, requiredPixelHeight: 3000, createdAt: now, updatedAt: now, prompt,
    masterStatus: "AWAITING_UPLOAD", masterVersions: [], activeMasterVersionId: null, productionMaster: null,
    qa: { status: "AWAITING_UPLOAD", score: 0, checks: [], requiredWidth: 3000, requiredHeight: 3000, missingWidth: 3000, missingHeight: 3000, upscaleRequired: true },
    artDirection: { collection: recommendation.collection, mood: recommendation.mood, patternScale: recommendation.patternScale, primaryTargetRoom: "Nursery", secondaryTargetRoom: "Kids Room", recommendation, userOverridden: false, savedAt: null },
    collection: recommendation.collection, mood: recommendation.mood, slots: makeSlots("seamless"), renderJobs: [], outputAssets: [], exportJobs: [],
    listing: { id: makeId("listing"), projectId: id, userId, shopId: null, title: "Woodland Nursery Wallpaper · Fox & Fern Pattern", description: "A calm, story-led wallpaper concept prepared from an approved production master.", tags: ["woodland wallpaper", "nursery decor", "fox pattern", "forest wallpaper", "kids room", "gouache art", "nature wall decor"], price: "48.00", quantity: 999, productionPartner: "", variations: "", shippingProfileId: "", status: "editing", useProjectNameAsTitleSuggestion: false, createdAt: now } };
}

export function changeProductType(project: Project, productType: ProductType): Project {
  return refreshProjectName({ ...project, productType, patternScale: null, physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: productType === "seamless" ? "1:1" : "", requiredPixelWidth: productType === "seamless" ? 3000 : 0, requiredPixelHeight: productType === "seamless" ? 3000 : 0, prompt: { ...project.prompt, aspectRatio: productType === "seamless" ? "1:1" : "" }, masterStatus: "AWAITING_UPLOAD", masterVersions: [], activeMasterVersionId: null, productionMaster: null, slots: makeSlots(productType), renderJobs: [], outputAssets: [] });
}

export function updateMeasurements(project: Project, patch: { width?: number | null; height?: number | null; unit?: "cm" | "inch" | null }): Project {
  const physicalWidth = patch.width === undefined ? project.physicalWidth : patch.width; const physicalHeight = patch.height === undefined ? project.physicalHeight : patch.height; const measurementUnit = patch.unit === undefined ? project.measurementUnit : patch.unit; const calculatedAspectRatio = calculateAspectRatio(physicalWidth, physicalHeight);
  return { ...project, physicalWidth, physicalHeight, measurementUnit, calculatedAspectRatio, requiredPixelWidth: calculateRequiredPixels(physicalWidth, measurementUnit, project.targetPrintPpi), requiredPixelHeight: calculateRequiredPixels(physicalHeight, measurementUnit, project.targetPrintPpi), prompt: { ...project.prompt, aspectRatio: calculatedAspectRatio } };
}

export function validateProject(project: Project) { const errors: Record<string, string> = {}; if (!project.primaryTargetRoom) errors.primaryTargetRoom = "Select a primary target room."; if (project.productType === "seamless" && !project.patternScale) errors.patternScale = "Select a pattern scale."; if (project.productType === "mural") { if (!project.physicalWidth || project.physicalWidth <= 0) errors.physicalWidth = "Enter the wall width."; if (!project.physicalHeight || project.physicalHeight <= 0) errors.physicalHeight = "Enter the wall height."; if (!project.measurementUnit) errors.measurementUnit = "Select a measurement unit."; } return errors; }
export function setPatternScale(project: Project, patternScale: PatternScale): Project { return { ...project, patternScale, artDirection: { ...project.artDirection, patternScale, userOverridden: true } }; }
export function canRender(project: Project) { return project.masterStatus === "QA_PASSED" || project.masterStatus === "APPROVED"; }
export function allOutputsReady(project: Project) { return project.slots.length === 10 && project.slots.every((slot) => slot.status === "ready" && Boolean(slot.outputAssetId)); }
export function allOutputsApproved(project: Project) { return allOutputsReady(project) && project.outputAssets.filter((asset) => project.slots.some((slot) => slot.outputAssetId === asset.id)).every((asset) => asset.approved); }

export function workflowStates(project: Project): WorkflowState[] {
  const projectComplete = Object.keys(validateProject(project)).length === 0;
  const promptComplete = Boolean(project.prompt.promptText.trim() && project.prompt.selectedAt);
  const masterComplete = canRender(project);
  const directionComplete = Boolean(project.artDirection.collection && project.artDirection.mood && (project.productType === "mural" || project.artDirection.patternScale) && project.artDirection.savedAt);
  const renderComplete = allOutputsApproved(project);
  const listingFields = Boolean(project.listing.title.trim() && project.listing.description.trim() && project.listing.tags.length === 13 && project.listing.price && project.listing.quantity > 0);
  const listingComplete = listingFields && (project.listing.status === "exported" || project.listing.status === "drafted");
  return [
    { complete: projectComplete, label: "Project", detail: "Required product fields saved" },
    { complete: promptComplete, label: "Prompt Studio", detail: "A prompt generated and selected" },
    { complete: masterComplete, label: "Design Master", detail: "Upload passed QA" },
    { complete: directionComplete, label: "Art Direction", detail: "Collection, mood and scale saved" },
    { complete: renderComplete, label: "Render Queue", detail: "10 outputs ready and approved" },
    { complete: listingComplete, label: "Listing Studio", detail: "Listing exported or drafted" },
  ];
}

export function markSlotsStaleForNewMaster(project: Project): RenderSlot[] { return project.slots.map((slot) => ({ ...slot, status: slot.outputAssetId ? "stale" : "idle", activeJobId: null })); }
