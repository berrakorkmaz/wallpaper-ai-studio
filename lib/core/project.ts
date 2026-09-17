import type { PatternScale, ProductType, Project } from "./types.ts";
import { calculateAspectRatio, calculateRequiredPixels } from "./ratio.ts";

const MOCKUP_ROLES = ["Hero", "Lifestyle", "Alternate Angle", "Secondary Setting", "Close-up", "Wide Shot"] as const;

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function productLabel(productType: ProductType) {
  return productType === "seamless" ? "Seamless" : "Mural";
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
  const now = new Date().toISOString();
  const id = makeId("project");
  const prompt = {
    id: makeId("prompt"), projectId: id, theme: "Woodland", style: "Hand-painted gouache", palette: "Warm woodland",
    motifs: "foxes, fern leaves, tiny mushrooms", exclusions: "text, logos, furniture, people", density: "balanced" as const,
    aspectRatio: "1:1", promptText: "", parameters: { stylize: 250, chaos: 8, seed: 28471 }, createdAt: now,
  };
  const projectName = generateProjectName({ theme: prompt.theme, productType: "seamless", primaryTargetRoom: "Nursery", sequenceNumber, generatedAt: now });
  return {
    id, userId, projectName, projectSequenceNumber: sequenceNumber, isProjectNameManuallyEdited: false, projectNameGeneratedAt: now,
    productType: "seamless", primaryTargetRoom: "Nursery", secondaryTargetRoom: "Kids Room", patternScale: "medium",
    physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: "1:1", targetPrintPpi: 150,
    requiredPixelWidth: 0, requiredPixelHeight: 0, status: "idea", createdAt: now, updatedAt: now, prompt,
    productionMaster: null, qa: { status: "not_run", score: 0, notes: [] }, collection: "Baby & Nursery", mood: "Soft & airy",
    slots: MOCKUP_ROLES.map((role, index) => ({ id: `mockup-${index + 1}`, role, status: "idle", version: 0 })),
    listing: { id: makeId("listing"), projectId: id, userId, shopId: null, title: "Woodland Nursery Wallpaper · Fox & Fern Pattern", description: "A calm, story-led wallpaper concept prepared from an approved production master.", tags: ["woodland wallpaper", "nursery decor", "fox pattern", "forest wallpaper", "kids room", "gouache art", "nature wall decor"], price: "48.00", status: "editing", useProjectNameAsTitleSuggestion: false, createdAt: now },
  };
}

export function changeProductType(project: Project, productType: ProductType): Project {
  return refreshProjectName({ ...project, productType, patternScale: null, physicalWidth: null, physicalHeight: null, measurementUnit: null, calculatedAspectRatio: productType === "seamless" ? "1:1" : "", requiredPixelWidth: 0, requiredPixelHeight: 0, prompt: { ...project.prompt, aspectRatio: productType === "seamless" ? "1:1" : "" } });
}

export function updateMeasurements(project: Project, patch: { width?: number | null; height?: number | null; unit?: "cm" | "inch" | null }): Project {
  const physicalWidth = patch.width === undefined ? project.physicalWidth : patch.width;
  const physicalHeight = patch.height === undefined ? project.physicalHeight : patch.height;
  const measurementUnit = patch.unit === undefined ? project.measurementUnit : patch.unit;
  const calculatedAspectRatio = calculateAspectRatio(physicalWidth, physicalHeight);
  return { ...project, physicalWidth, physicalHeight, measurementUnit, calculatedAspectRatio, requiredPixelWidth: calculateRequiredPixels(physicalWidth, measurementUnit, project.targetPrintPpi), requiredPixelHeight: calculateRequiredPixels(physicalHeight, measurementUnit, project.targetPrintPpi), prompt: { ...project.prompt, aspectRatio: calculatedAspectRatio } };
}

export function validateProject(project: Project) {
  const errors: Record<string, string> = {};
  if (!project.primaryTargetRoom) errors.primaryTargetRoom = "Select a primary target room.";
  if (project.productType === "seamless" && !project.patternScale) errors.patternScale = "Select a pattern scale.";
  if (project.productType === "mural") {
    if (!project.physicalWidth || project.physicalWidth <= 0) errors.physicalWidth = "Enter the wall width.";
    if (!project.physicalHeight || project.physicalHeight <= 0) errors.physicalHeight = "Enter the wall height.";
    if (!project.measurementUnit) errors.measurementUnit = "Select a measurement unit.";
  }
  return errors;
}

export function setPatternScale(project: Project, patternScale: PatternScale): Project {
  return { ...project, patternScale };
}
