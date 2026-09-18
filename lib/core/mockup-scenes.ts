import type { Project, RenderSlot } from "./types.ts";

export const MOCKUP_CATEGORIES = ["Nursery", "Kids Room", "Disney", "Living Room", "Bedroom", "Gaming Room", "Office / Studio", "Bathroom / Powder", "Dining / Entryway"] as const;
export type MockupCategoryId = typeof MOCKUP_CATEGORIES[number];
export type SceneRoleId = "hero" | "creative" | "closeup" | "wide" | "editorial" | "perspective";

export type SceneBlueprint = {
  id: string; role: SceneRoleId; roleLabel: string; title: string; roomType: string;
  cameraAngle: string; cameraDistance: string; cameraHeight: string; lensStyle: string;
  composition: string; furnitureStyle: string; keyFurniture: string[]; props: string[];
  architecture: string; lighting: string; mood: string; wallpaperCoverage: string;
  palette: [string, string, string, string]; negativeConstraints: string[]; variant: number;
};

type CategoryDirection = {
  visualDirection: string; roomType: string; furnitureStyle: string; furniture: string[][];
  props: string[]; architectures: string[]; lighting: string[]; mood: string;
  palette: [string, string, string, string]; negativeConstraints: string[];
};

const directions: Record<MockupCategoryId, CategoryDirection> = {
  "Nursery": { visualDirection: "calm, nurturing contemporary nursery", roomType: "modern nursery", furnitureStyle: "soft rounded natural-wood furniture", furniture: [["crib", "small dresser"], ["rocking chair", "side table"]], props: ["linen canopy", "woven basket", "plush toy"], architectures: ["picture-frame moulding", "arched reading nook"], lighting: ["soft morning window light", "warm diffused afternoon light"], mood: "gentle and airy", palette: ["#eadfce", "#c8aa84", "#8fa28f", "#74695e"], negativeConstraints: ["adult bedroom styling", "gaming furniture", "harsh nightclub lighting"] },
  "Kids Room": { visualDirection: "playful, design-led children's room", roomType: "creative kids room", furnitureStyle: "colorful modular furniture", furniture: [["low daybed", "book ledges"], ["activity table", "storage bench"]], props: ["wooden toys", "stacked books", "playful cushions"], architectures: ["window seat", "painted arch alcove"], lighting: ["bright daylight", "soft golden playtime light"], mood: "joyful and imaginative", palette: ["#f1d9b7", "#d78d71", "#73989b", "#695f72"], negativeConstraints: ["infant-only nursery styling", "adult formal furniture", "dark club lighting"] },
  "Disney": { visualDirection: "premium storybook-inspired family interior with playful cinematic details", roomType: "imaginative character-themed kids room", furnitureStyle: "whimsical custom furniture with refined rounded forms", furniture: [["storybook daybed", "sculptural bookcase"], ["character-inspired reading chair", "play table"]], props: ["storybook objects", "soft character-inspired accents", "collectible toys"], architectures: ["enchanted arched alcove", "theatrical window seat"], lighting: ["magical soft daylight", "warm cinematic evening glow"], mood: "joyful, magical and premium", palette: ["#f1d7b5", "#b8c9d9", "#d99ca8", "#706a83"], negativeConstraints: ["theme park signage", "printed text or logos", "cheap plastic showroom styling"] },
  "Living Room": { visualDirection: "elevated, welcoming editorial living space", roomType: "contemporary living room", furnitureStyle: "sculptural comfortable furniture", furniture: [["curved sofa", "coffee table"], ["lounge chair", "low console"]], props: ["ceramic vase", "art books", "textured throw"], architectures: ["wide picture window", "plaster fireplace"], lighting: ["balanced natural daylight", "late-afternoon side light"], mood: "refined and welcoming", palette: ["#ded3c3", "#a58b73", "#718078", "#4f5550"], negativeConstraints: ["generic furniture showroom", "nursery props", "gaming equipment"] },
  "Bedroom": { visualDirection: "restful boutique bedroom with tactile layers", roomType: "boutique bedroom", furnitureStyle: "upholstered and warm timber furniture", furniture: [["upholstered bed", "bedside table"], ["chaise", "slim dresser"]], props: ["linen bedding", "reading lamp", "small vase"], architectures: ["recessed headboard wall", "tall corner window"], lighting: ["quiet dawn light", "warm bedside evening glow"], mood: "restful and intimate", palette: ["#e1d5c8", "#a48573", "#777d76", "#5f5552"], negativeConstraints: ["living-room sofa layout", "children's toys", "office equipment"] },
  "Gaming Room": { visualDirection: "premium gaming interior, immersive but restrained", roomType: "designer gaming room", furnitureStyle: "angular dark furniture with controlled color accents", furniture: [["gaming desk", "ergonomic chair"], ["low media console", "modular lounge chair"]], props: ["ultrawide display", "acoustic panels", "collectible display"], architectures: ["LED reveal ceiling", "faceted acoustic alcove"], lighting: ["controlled cyan-magenta accent light", "moody monitor and shelf lighting"], mood: "immersive and cinematic", palette: ["#19232b", "#263b48", "#6a4d84", "#d26883"], negativeConstraints: ["generic living room", "childish gamer clutter", "bright nursery lighting"] },
  "Office / Studio": { visualDirection: "focused creative workspace with gallery restraint", roomType: "creative office studio", furnitureStyle: "clean-lined studio furniture", furniture: [["large work desk", "task chair"], ["drafting table", "storage credenza"]], props: ["desk lamp", "material samples", "design books"], architectures: ["industrial loft window", "built-in shelving bay"], lighting: ["clear north-facing daylight", "focused task lighting"], mood: "calm and productive", palette: ["#ded9ce", "#9b8c77", "#647576", "#3f4746"], negativeConstraints: ["corporate cubicle", "bedroom furniture", "toy-room styling"] },
  "Bathroom / Powder": { visualDirection: "jewel-box bathroom with moisture-safe styled walls", roomType: "boutique powder room", furnitureStyle: "compact crafted bathroom fixtures", furniture: [["floating vanity", "round mirror"], ["pedestal basin", "slim cabinet"]], props: ["hand towel", "glass vessel", "small botanical"], architectures: ["arched mirror niche", "fluted-glass partition"], lighting: ["soft skylight", "warm sculptural sconce light"], mood: "polished and intimate", palette: ["#d9d2c6", "#8da09a", "#b08769", "#454e4d"], negativeConstraints: ["living-room seating", "visible shower over wallpaper", "sterile empty showroom"] },
  "Dining / Entryway": { visualDirection: "architectural hospitality space for arrivals and gathering", roomType: "dining room and entry gallery", furnitureStyle: "statement furniture with crafted silhouettes", furniture: [["dining table", "six chairs"], ["console table", "sculptural bench"]], props: ["pendant light", "ceramic bowl", "tall branches"], architectures: ["arched doorway sequence", "double-height stair hall"], lighting: ["directional dining daylight", "warm evening pendant light"], mood: "sociable and dramatic", palette: ["#ddd2bd", "#9b765d", "#65746b", "#4b403c"], negativeConstraints: ["bedroom furniture", "gaming setup", "empty corridor"] },
};

const roleSpecs: Record<SceneRoleId, Pick<SceneBlueprint, "roleLabel" | "title" | "cameraAngle" | "cameraDistance" | "cameraHeight" | "lensStyle" | "composition" | "wallpaperCoverage">> = {
  hero: { roleLabel: "HERO", title: "Commercial Room Hero", cameraAngle: "frontal three-quarter", cameraDistance: "medium-wide", cameraHeight: "eye level", lensStyle: "35mm editorial", composition: "hero wall anchors an asymmetrical marketplace composition", wallpaperCoverage: "55–65% of image" },
  creative: { roleLabel: "CREATIVE", title: "Alternate Composition", cameraAngle: "low off-center", cameraDistance: "medium", cameraHeight: "low", lensStyle: "40mm cinematic", composition: "unexpected negative space and offset furniture grouping", wallpaperCoverage: "45–55% of image" },
  closeup: { roleLabel: "CLOSE-UP", title: "Wallpaper Detail", cameraAngle: "near-frontal detail", cameraDistance: "close", cameraHeight: "chest height", lensStyle: "55mm detail", composition: "pattern scale in sharp focus with one partial furnishing", wallpaperCoverage: "70–80% of image" },
  wide: { roleLabel: "WIDE", title: "Full Room Context", cameraAngle: "straight wide", cameraDistance: "wide", cameraHeight: "eye level", lensStyle: "24mm architectural", composition: "full environment with a long uninterrupted wallpaper wall", wallpaperCoverage: "40–50% of image" },
  editorial: { roleLabel: "EDITORIAL", title: "Styled Detail", cameraAngle: "layered vignette", cameraDistance: "medium-close", cameraHeight: "seated height", lensStyle: "50mm editorial", composition: "foreground decor layers frame a clearly visible wallpaper field", wallpaperCoverage: "50–60% of image" },
  perspective: { roleLabel: "PERSPECTIVE", title: "Architectural Angle", cameraAngle: "diagonal corner view", cameraDistance: "medium-wide", cameraHeight: "slightly elevated", lensStyle: "28mm tilt-corrected", composition: "room corner and wall transition create obvious depth", wallpaperCoverage: "45–60% of image" },
};

const slotRoles: Record<string, SceneRoleId> = { "Hero room": "hero", "Alternate room": "creative", "Close-up detail": "closeup", "Wide room view": "wide", "Styled room view": "editorial", "Clean wall presentation": "perspective" };
const roleOrder: SceneRoleId[] = ["hero", "creative", "closeup", "wide", "editorial", "perspective"];
const lightingTreatments = ["broad", "accent-led", "raking", "ambient", "soft directional", "architectural"];
const furnitureArrangements = ["balanced hero grouping", "offset island grouping", "cropped detail grouping", "perimeter wide-room grouping", "layered foreground vignette", "depth-led diagonal grouping"];

function categoryId(value: string): MockupCategoryId { return MOCKUP_CATEGORIES.includes(value as MockupCategoryId) ? value as MockupCategoryId : "Living Room"; }

export function sceneRoleForSlot(slot: Pick<RenderSlot, "role">): SceneRoleId { return slotRoles[slot.role] ?? "hero"; }

export function getCategoryDirection(value: string) { const id = categoryId(value); return { id, ...directions[id] }; }

export function getSceneBlueprint(category: string, role: SceneRoleId, variant = 0): SceneBlueprint {
  const direction = getCategoryDirection(category); const spec = roleSpecs[role]; const v = Math.abs(variant) % 2; const roleIndex = roleOrder.indexOf(role); const selection = (roleIndex + v) % 2;
  return { id: `${direction.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${role}-v${v + 1}`, role, ...spec, roomType: direction.roomType,
    cameraAngle: v ? `${spec.cameraAngle}, mirrored circulation` : spec.cameraAngle,
    composition: v ? `${spec.composition}; alternate furniture placement` : spec.composition,
    furnitureStyle: `${direction.furnitureStyle}, ${furnitureArrangements[roleIndex]}`, keyFurniture: direction.furniture[selection],
    props: selection ? [...direction.props].reverse() : direction.props, architecture: `${direction.architectures[selection]} with ${role === "perspective" ? "a visible wall return" : role === "wide" ? "an extended sightline" : "role-specific spatial framing"}`, lighting: `${lightingTreatments[roleIndex]} ${direction.lighting[selection]}`, mood: direction.mood,
    palette: v ? [direction.palette[1], direction.palette[0], direction.palette[3], direction.palette[2]] : direction.palette,
    negativeConstraints: [...direction.negativeConstraints, "do not cover most of the wallpaper", "do not distort or redraw the wallpaper artwork", "do not invent new motifs", "do not use an empty studio wall"], variant: v };
}

export function sceneBlueprintFor(project: Project, slot: RenderSlot) { return getSceneBlueprint(project.primaryTargetRoom, sceneRoleForSlot(slot), slot.version); }

export function buildMockupPrompt({ project, sceneBlueprint, previousScenes = [] }: { project: Project; sceneBlueprint: SceneBlueprint; previousScenes?: SceneBlueprint[] }) {
  const category = getCategoryDirection(project.primaryTargetRoom);
  const themeDirection = project.prompt.theme === "Disney" ? ` Use the Disney story selection ${project.prompt.customCharacterStory || project.prompt.characterStory || "storybook"} only to guide removable furniture and decor, never to decorate the feature wall.` : ` Use the ${project.prompt.theme} theme only for removable furniture and decor, never for the feature wall.`;
  const prior = previousScenes.length ? ` Do not reproduce these previous compositions: ${previousScenes.map((scene) => `${scene.cameraAngle} / ${scene.composition}`).join("; ")}.` : "";
  return `Create a photorealistic ${sceneBlueprint.roomType} interior prepared for later deterministic wallpaper compositing. Include one large, smooth, blank, plain matte feature wall in the target wallpaper area. Keep that wall unobstructed and free of patterns, wallpaper, murals, decals, artwork, frames, text, windows, doors, panels and moulding. Do not invent or render wallpaper artwork.${themeDirection} Category direction: ${category.visualDirection}. Scene role: ${sceneBlueprint.roleLabel} — ${sceneBlueprint.title}. Camera: ${sceneBlueprint.cameraAngle}, ${sceneBlueprint.cameraDistance}, ${sceneBlueprint.cameraHeight}, ${sceneBlueprint.lensStyle}. Composition: ${sceneBlueprint.composition}. Architecture outside the blank target wall: ${sceneBlueprint.architecture}. Furniture: ${sceneBlueprint.furnitureStyle}; include ${sceneBlueprint.keyFurniture.join(" and ")} below or beside the target wall without covering it. Props: ${sceneBlueprint.props.join(", ")}. Lighting: ${sceneBlueprint.lighting}. Mood: ${sceneBlueprint.mood}. Blank feature-wall coverage: ${sceneBlueprint.wallpaperCoverage}. Avoid: ${sceneBlueprint.negativeConstraints.join("; ")}; any generated wall pattern; wall art on the target surface. Do not reproduce the previous room composition.${prior}`;
}
