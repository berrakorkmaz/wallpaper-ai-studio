import type { PatternContent } from "./types.ts";

export type CharacterStoryPreset = {
  id: string; label: string; suggestedMotifs: string; suggestedPalette: string; suggestedMood: string; negativePrompt: string;
};

export type ThemeFamilyPreset = {
  id: string; label: string; characterLabel: string; defaultCharacterId: string;
  patternContentOptions: readonly PatternContent[]; characters: readonly CharacterStoryPreset[];
};

const disneyNegative = "text, logos, signatures, furniture, people, photorealistic humans, watermarks";

export const DISNEY_CHARACTER_PRESETS = [
  { id: "winnie-the-pooh", label: "Winnie the Pooh", suggestedMotifs: "honey pots, bees, woodland trees, leaves, clouds, tiny flowers", suggestedPalette: "warm honey, muted yellow, sage green, warm cream, soft brown", suggestedMood: "Soft & airy", negativePrompt: disneyNegative },
  { id: "the-lion-king", label: "The Lion King", suggestedMotifs: "savanna grass, tropical leaves, sun, rocks, African landscape motifs", suggestedPalette: "sunset ochre, terracotta, warm gold, savanna green", suggestedMood: "Adventurous", negativePrompt: disneyNegative },
  { id: "mickey-and-friends", label: "Mickey & Friends", suggestedMotifs: "stars, dots, bows, playful geometric shapes", suggestedPalette: "classic red, sunny yellow, black, warm cream, sky blue", suggestedMood: "Playful", negativePrompt: disneyNegative },
  { id: "minnie-mouse", label: "Minnie Mouse", suggestedMotifs: "bows, polka dots, hearts, daisies, playful geometric accents", suggestedPalette: "blush pink, cherry red, warm cream, charcoal, soft gold", suggestedMood: "Playful", negativePrompt: disneyNegative },
  { id: "frozen", label: "Frozen", suggestedMotifs: "snowflakes, ice crystals, winter foliage, stars", suggestedPalette: "icy blue, pearl white, pale lavender, silver-blue", suggestedMood: "Magical", negativePrompt: disneyNegative },
  { id: "the-little-mermaid", label: "The Little Mermaid", suggestedMotifs: "shells, bubbles, coral, sea plants, waves", suggestedPalette: "aqua, seafoam, coral, lavender, pearl", suggestedMood: "Dreamy", negativePrompt: disneyNegative },
  { id: "bambi", label: "Bambi", suggestedMotifs: "woodland flowers, leaves, butterflies, forest foliage", suggestedPalette: "warm woodland brown, sage, cream, muted forest green", suggestedMood: "Gentle", negativePrompt: disneyNegative },
  { id: "dumbo", label: "Dumbo", suggestedMotifs: "clouds, circus stars, feathers, soft stripes, tiny flags", suggestedPalette: "powder blue, warm cream, muted yellow, dusty rose", suggestedMood: "Gentle", negativePrompt: disneyNegative },
  { id: "alice-in-wonderland", label: "Alice in Wonderland", suggestedMotifs: "playing cards, teacups, keys, flowers, whimsical botanical motifs", suggestedPalette: "powder blue, rose red, warm cream, leaf green, antique gold", suggestedMood: "Whimsical", negativePrompt: disneyNegative },
  { id: "peter-pan", label: "Peter Pan", suggestedMotifs: "stars, clouds, moon, fairy dust, Neverland-inspired foliage", suggestedPalette: "midnight blue, forest green, moonlit cream, soft gold", suggestedMood: "Magical", negativePrompt: disneyNegative },
  { id: "101-dalmatians", label: "101 Dalmatians", suggestedMotifs: "paw prints, spots, bones, playful city-inspired accents", suggestedPalette: "black, white, cherry red, soft gray, warm cream", suggestedMood: "Playful", negativePrompt: disneyNegative },
  { id: "toy-story", label: "Toy Story", suggestedMotifs: "stars, clouds, playful western and space motifs", suggestedPalette: "sky blue, cloud white, warm yellow, cactus green, toy-box red", suggestedMood: "Adventurous", negativePrompt: disneyNegative },
  { id: "cars", label: "Cars", suggestedMotifs: "roads, racing flags, tire marks, desert and racing motifs", suggestedPalette: "racing red, asphalt gray, desert ochre, warm cream, sky blue", suggestedMood: "Adventurous", negativePrompt: disneyNegative },
  { id: "princess-fairytale", label: "Princess / Fairytale", suggestedMotifs: "castles, crowns, stars, roses, ribbons, enchanted botanical details", suggestedPalette: "blush pink, pale lavender, pearl, soft gold, powder blue", suggestedMood: "Magical", negativePrompt: disneyNegative },
  { id: "custom", label: "Custom", suggestedMotifs: "storybook symbols, character-inspired objects, decorative supporting motifs", suggestedPalette: "soft storybook palette", suggestedMood: "Whimsical", negativePrompt: disneyNegative },
] as const satisfies readonly CharacterStoryPreset[];

export const themePresets = {
  disney: { id: "disney", label: "Disney", characterLabel: "Character / Story", defaultCharacterId: "winnie-the-pooh", patternContentOptions: ["Characters + Motifs", "Motifs Only"], characters: DISNEY_CHARACTER_PRESETS },
} as const satisfies Record<string, ThemeFamilyPreset>;

export const THEME_OPTIONS = ["Woodland", "Botanical", "Dark Floral", "Pink Bows", "Celestial", "Coastal", "Geometric", "Neon Gaming", themePresets.disney.label] as const;
export const STYLE_OPTIONS = ["Hand-painted gouache", "Watercolor", "Engraved", "Vintage textile", "Minimal line art", "Painterly editorial", "Storybook illustration", "Vintage illustration", "Soft pastel", "Minimal", "Retro", "Bold graphic", "Nursery illustration"] as const;
export const PALETTE_OPTIONS = ["Warm woodland", "Dusty rose & sage", "Midnight jewel", "Coastal mineral", "Soft neutral", "Sun-washed terracotta"] as const;
export const MOOD_OPTIONS = ["Soft & airy", "Warm neutral", "Playful", "Cinematic", "Organic elegant", "Romantic", "Clean refined", "Cozy", "Gentle", "Adventurous", "Dreamy", "Magical", "Nostalgic", "Whimsical", "Surreal"] as const;

export function getCharacterPreset(id: string) { return themePresets.disney.characters.find((preset) => preset.id === id) ?? themePresets.disney.characters[0]; }
