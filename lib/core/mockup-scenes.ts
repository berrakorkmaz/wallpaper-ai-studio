import type { Project, RenderSlot } from "./types.ts";

export const MOCKUP_CATEGORIES = ["Nursery", "Kids Room", "Disney", "Living Room", "Bedroom", "Gaming Room", "Office / Studio", "Bathroom / Powder", "Dining / Entryway", "Dark / Moody Interior", "Minimal Interior", "Luxury Interior", "Commercial Interior"] as const;
export type MockupCategoryId = typeof MOCKUP_CATEGORIES[number];
export type SceneRoleId = "hero" | "creative" | "closeup" | "wide" | "editorial" | "perspective";

export type SceneBlueprint = {
  id: string; role: SceneRoleId; roleLabel: string; title: string; roomType: string; designFamily: string;
  cameraAngle: string; cameraDistance: string; cameraHeight: string; lensStyle: string;
  composition: string; layout: string; furnitureStyle: string; keyFurniture: string[]; props: string[];
  roomDimensions: string; ceiling: string; windows: string; flooring: string; trim: string; architecture: string;
  lighting: string; mood: string; wallpaperCoverage: string;
  palette: [string, string, string, string]; negativeConstraints: string[]; variant: number;
};

type SceneFamily = {
  name: string; furnitureStyle: string; keyFurniture: [string, string]; props: [string, string, string];
  architecture: string; flooring: string; lighting: string; mood: string;
};

type CategoryDirection = {
  visualDirection: string; roomType: string; palette: [string, string, string, string];
  negativeConstraints: string[]; families: [SceneFamily, SceneFamily, SceneFamily, SceneFamily, SceneFamily, SceneFamily];
};

const family = (name: string, furnitureStyle: string, keyFurniture: [string, string], props: [string, string, string], architecture: string, flooring: string, lighting: string, mood: string): SceneFamily => ({ name, furnitureStyle, keyFurniture, props, architecture, flooring, lighting, mood });

const directions: Record<MockupCategoryId, CategoryDirection> = {
  Nursery: {
    visualDirection: "calm, nurturing, design-led nursery interiors", roomType: "modern nursery", palette: ["#eadfce", "#c8aa84", "#8fa28f", "#74695e"], negativeConstraints: ["adult bedroom styling", "gaming furniture", "harsh nightclub lighting"], families: [
      family("Scandinavian Nursery", "pale birch and softly rounded Nordic forms", ["white spindle crib", "birch changing cabinet"], ["wool cloud mobile", "woven hamper", "linen floor cushion"], "clean plaster window reveal and shallow book niche", "soap-finished pale oak boards", "clear cool morning daylight", "airy and nurturing"),
      family("Vintage Storybook Nursery", "painted heirloom furniture with restrained traditional detail", ["antique cream iron crib", "walnut bow-front dresser"], ["one restrained cotton canopy", "vintage rocking horse", "pleated table lamp"], "picture rails, a deep sash reveal, and traditional millwork", "warm herringbone timber", "soft amber late-afternoon window light", "nostalgic and gentle"),
      family("Modern Architectural Nursery", "low-profile lacquer and walnut pieces with crisp geometry", ["walnut platform crib", "floating lacquer storage"], ["abstract felt mobile", "ribbed ceramic lamp", "boucle floor mat"], "flush doorway, recessed shelf, and precise shadow gaps", "light poured terrazzo", "bright indirect north light", "quietly modern"),
      family("Cozy Small Nursery", "compact painted furniture chosen for a small urban room", ["sage mini crib", "compact upholstered glider"], ["wall-mounted book ledge", "knitted pouf", "small paper lantern"], "space-saving corner alcove and practical low skirting", "natural cork floor", "warm side-window daylight", "intimate and cozy"),
      family("Luxury Nursery", "bespoke upholstered and dark timber nursery furniture", ["upholstered oval crib", "fluted oak armoire"], ["silk-shade floor lamp", "cashmere throw", "sculptural toy chest"], "full-height panelled portal and refined ceiling cove", "smoked chevron oak", "luminous layered gallery daylight", "polished and serene"),
      family("Playful Natural Nursery", "mixed rattan, painted wood, and tactile child-safe forms", ["rattan-sided crib", "mushroom-shaped bookshelf"], ["woodland blocks", "jute play rug", "leaf-shaped cushion"], "arched reading recess and curved plaster corner", "wide honey-toned pine boards", "dappled garden daylight", "playful and organic"),
    ],
  },
  "Kids Room": {
    visualDirection: "playful, design-led children's rooms", roomType: "creative kids room", palette: ["#f1d9b7", "#d78d71", "#73989b", "#695f72"], negativeConstraints: ["infant-only nursery styling", "adult formal furniture", "dark club lighting"], families: [
      family("Montessori Play Room", "low natural timber Montessori furniture", ["floor-level house bed", "open activity shelf"], ["wooden sorting toys", "rolled play mat", "picture books"], "low reading niche and child-height display rail", "pale maple boards", "bright morning daylight", "calm and independent"),
      family("Colorful Modern Kids Room", "bold modular forms with controlled primary accents", ["cobalt daybed", "coral modular storage"], ["graphic cushions", "building blocks", "paper pendant"], "painted arch alcove and offset built-in", "speckled rubber floor", "crisp midday daylight", "energetic and graphic"),
      family("Vintage Schoolhouse Room", "painted vintage furniture and sturdy classic joinery", ["iron twin bed", "oak school desk"], ["wooden globe", "stacked storybooks", "striped rug"], "deep window seat and beadboard return", "aged narrow oak boards", "golden side light", "curious and nostalgic"),
      family("Compact Urban Bunk Room", "space-efficient custom millwork", ["built-in bunk bed", "drawer stair storage"], ["clip reading lights", "fabric bins", "small beanbag"], "integrated sleeping bay and tight circulation", "warm cork tiles", "soft skylight illumination", "clever and cozy"),
      family("Nature Explorer Room", "robust ash furniture with expedition details", ["canvas-trim cabin bed", "map-table desk"], ["specimen boxes", "binoculars", "woven basket"], "timber window bay and display ledges", "honey pine planks", "dappled woodland daylight", "adventurous and natural"),
      family("Refined Tween Room", "mature soft-color furniture with sculptural accents", ["upholstered daybed", "curved study desk"], ["ceramic lamp", "art books", "textured throw"], "asymmetric study recess and slim crown trim", "whitewashed herringbone", "soft evening window glow", "creative and composed"),
    ],
  },
  Disney: {
    visualDirection: "premium storybook-inspired family interiors with cinematic details", roomType: "imaginative character-themed kids room", palette: ["#f1d7b5", "#b8c9d9", "#d99ca8", "#706a83"], negativeConstraints: ["theme park signage", "printed text or logos", "cheap plastic showroom styling"], families: [
      family("Enchanted Classic", "refined curved storybook furniture", ["carved storybook daybed", "arched display cabinet"], ["subtle character figurines", "velvet cushion", "antique lantern"], "fairytale arch and deep theatrical window reveal", "warm parquet", "magical soft daylight", "enchanted and premium"),
      family("Modern Animation Loft", "clean colorful custom forms", ["rounded platform bed", "sculptural book tower"], ["graphic soft toys", "color-block rug", "globe lamp"], "double-height creative loft and mezzanine edge", "poured pale terrazzo", "bright cinematic daylight", "joyful and contemporary"),
      family("Storybook Cottage", "painted cottage joinery with handmade character", ["built-in alcove bed", "small painted writing desk"], ["storybook stack", "woven toy basket", "mushroom lamp"], "sloped ceiling and cottage window seat", "wide rustic oak", "warm garden-filtered light", "cozy and imaginative"),
      family("Cosmic Adventure Room", "sleek navy and silver modular furniture", ["capsule-inspired bed", "illuminated storage console"], ["planet mobile", "telescope", "metallic floor cushion"], "angled ceiling portal and circular window", "dark resilient cork", "cool starlit accent plus daylight", "adventurous and cinematic"),
      family("Ocean Fantasy Room", "flowing pale timber and aqua upholstery", ["wave-profile daybed", "shell-shaped reading chair"], ["glass float lamp", "woven sea-grass basket", "soft coral toy"], "curved plaster niche and broad coastal bay", "limed oak boards", "luminous coastal daylight", "dreamy and fresh"),
      family("Royal Story Suite", "elegant jewel-tone furniture with restrained gold detail", ["velvet crown-back bed", "small lacquer wardrobe"], ["star pendant", "embroidered bolster", "miniature carriage toy"], "tall panelled opening and shallow ceiling cove", "dark chevron oak", "warm theatrical evening glow", "regal and playful"),
    ],
  },
  "Living Room": {
    visualDirection: "elevated, welcoming editorial living spaces", roomType: "contemporary living room", palette: ["#ded3c3", "#a58b73", "#718078", "#4f5550"], negativeConstraints: ["generic furniture showroom", "nursery props", "gaming equipment"], families: [
      family("Scandinavian Living", "light oak and softly tailored Nordic furniture", ["oatmeal modular sofa", "pale oak nesting tables"], ["ceramic vase", "wool throw", "paper lantern"], "simple plaster bay and shallow display ledge", "pale wide-plank oak", "cool broad daylight", "light and welcoming"),
      family("Mid-century Salon", "walnut casework and low 1960s silhouettes", ["tufted cognac sofa", "walnut kidney table"], ["opal glass lamp", "record stack", "brass bowl"], "sunken lounge edge and timber-framed window", "walnut parquet", "golden raking afternoon light", "cultured and warm"),
      family("Japandi Lounge", "low ash furniture with precise natural textures", ["low linen sofa", "blackened oak tea table"], ["stone vessel", "linen cushion", "single branch"], "tokonoma-like recess and flush timber opening", "matte ash boards", "diffuse north light", "quiet and balanced"),
      family("Contemporary Gallery Room", "sculptural monochrome statement pieces", ["curved boucle sofa", "monolithic stone table"], ["collector books", "bronze object", "tall ceramic"], "gallery-height ceiling and frameless picture window", "seamless limestone", "crisp directional daylight", "editorial and architectural"),
      family("Mediterranean Living", "limewashed forms with woven and timber pieces", ["slipcovered sofa", "travertine coffee table"], ["olive branch", "terracotta vessel", "striped textile"], "soft plaster arch and deep shuttered opening", "handmade terracotta tile", "sun-washed side light", "relaxed and tactile"),
      family("Collected Eclectic Room", "layered vintage and contemporary furniture", ["plum velvet settee", "painted antique console"], ["colored glass lamp", "art books", "patterned cushion"], "ornamental doorway and asymmetrical bay", "dark restored floorboards", "moody late-day light", "expressive and collected"),
    ],
  },
  Bedroom: {
    visualDirection: "restful boutique bedrooms with tactile layers", roomType: "boutique bedroom", palette: ["#e1d5c8", "#a48573", "#777d76", "#5f5552"], negativeConstraints: ["living-room sofa layout", "children's toys", "office equipment"], families: [
      family("Nordic Bedroom", "pale timber and relaxed linen furniture", ["ash spindle bed", "floating oak nightstand"], ["linen duvet", "paper lamp", "wool bench throw"], "minimal headboard recess and slim window reveal", "whitewashed oak", "quiet dawn light", "restful and airy"),
      family("Art Deco Boutique", "channelled velvet and polished dark wood", ["emerald upholstered bed", "fluted walnut bedside cabinet"], ["opal sconce", "brass tray", "silk cushion"], "stepped ceiling cove and arched dressing niche", "dark herringbone timber", "warm glamorous evening light", "intimate and elegant"),
      family("Japandi Sleep Room", "low platform furniture in ash and linen", ["low oak platform bed", "black timber stool"], ["stoneware lamp", "linen coverlet", "single branch"], "flush alcove and timber screen edge", "matte pale ash", "diffuse north light", "serene and sparse"),
      family("Compact Urban Bedroom", "space-saving tailored furniture", ["storage divan bed", "wall-mounted bedside shelf"], ["swing-arm lamp", "small mirror", "folded throw"], "shallow wardrobe wall and corner window", "warm engineered oak", "soft city morning light", "cozy and efficient"),
      family("Luxury Hotel Suite", "bespoke upholstery and polished natural materials", ["wide upholstered bed", "curved chaise"], ["silk bedside shade", "cashmere blanket", "glass carafe"], "full-height headboard bay and bronze window frames", "smoked chevron oak", "layered luminous daylight", "sumptuous and restrained"),
      family("Rustic Modern Retreat", "solid timber mixed with soft contemporary upholstery", ["oak four-poster bed", "woven leather bench"], ["ceramic lamp", "chunky knit throw", "dried branch"], "exposed beam edge and deep countryside window", "reclaimed oak planks", "warm low sunset light", "grounded and restorative"),
    ],
  },
  "Gaming Room": {
    visualDirection: "premium immersive gaming interiors without visual clutter", roomType: "designer gaming room", palette: ["#19232b", "#263b48", "#6a4d84", "#d26883"], negativeConstraints: ["generic living room", "childish gamer clutter", "bright nursery lighting"], families: [
      family("Cyber Minimal Setup", "matte black precision furniture", ["floating gaming desk", "mesh ergonomic chair"], ["ultrawide display", "single controller dock", "acoustic felt panel"], "flush cable wall and narrow reveal shelf", "charcoal microcement", "controlled cyan edge light", "focused and futuristic"),
      family("Console Lounge", "deep modular seating and low media joinery", ["modular lounge sofa", "low walnut media console"], ["console dock", "soft floor lamp", "wool gaming rug"], "wide screen recess and concealed storage bay", "dark walnut boards", "warm screen-balanced evening light", "relaxed and cinematic"),
      family("Racing Studio", "technical aluminum and leather forms", ["racing simulator cockpit", "slim equipment cabinet"], ["helmet display", "track light", "minimal trophy"], "faceted acoustic alcove and long sightline", "dark resilient rubber", "raking red-white accent light", "dynamic and precise"),
      family("Streamer Studio", "camera-ready custom desk and soft acoustic surfaces", ["L-shaped broadcast desk", "high-back task chair"], ["boom microphone", "key light", "curated display objects"], "asymmetric streaming backdrop and ceiling grid", "smoked cork floor", "balanced magenta-blue studio light", "creative and professional"),
      family("Refined Retro Arcade", "dark timber mixed with restored arcade forms", ["walnut arcade cabinet", "leather club chair"], ["joystick console", "opal lamp", "vinyl stack"], "deep window reveal and ribbed timber niche", "black-and-white terrazzo", "amber pool lighting", "nostalgic and sophisticated"),
      family("Esports Command Room", "angular graphite contract furniture", ["three-screen command desk", "performance gaming chair"], ["headset stand", "team-neutral light bars", "acoustic ceiling baffle"], "raised equipment floor and panoramic window", "graphite carpet tile", "cool architectural night lighting", "competitive and premium"),
    ],
  },
  "Office / Studio": {
    visualDirection: "focused creative workspaces with gallery restraint", roomType: "creative office studio", palette: ["#ded9ce", "#9b8c77", "#647576", "#3f4746"], negativeConstraints: ["corporate cubicle", "bedroom furniture", "toy-room styling"], families: [
      family("Nordic Home Office", "light ash ergonomic furniture", ["ash writing desk", "woven task chair"], ["paper desk lamp", "notebook stack", "ceramic cup"], "clean window bay and floating shelf", "pale oak boards", "clear morning daylight", "calm and productive"),
      family("Industrial Loft Studio", "steel-framed work furniture and reclaimed timber", ["large trestle desk", "black drafting chair"], ["material samples", "anglepoise lamp", "rolled drawings"], "brick-edged loft window and exposed beam", "sealed concrete", "cool north-facing loft light", "practical and creative"),
      family("Artist Atelier", "painted wood and flexible studio pieces", ["tilting work table", "canvas storage rack"], ["brush pots", "paper rolls", "wood stool"], "high clerestory and deep utility sink niche", "paint-marked timber boards", "high diffuse atelier light", "expressive and focused"),
      family("Compact Study", "space-efficient wall-mounted joinery", ["fold-down wall desk", "slim upholstered chair"], ["clip lamp", "small book stack", "pencil tray"], "tight alcove office and overhead cabinets", "natural cork", "soft side-window light", "quiet and efficient"),
      family("Executive Library", "tailored leather and dark timber furniture", ["substantial walnut desk", "saddle-leather chair"], ["bronze desk lamp", "collector books", "stone paperweight"], "panelled library opening and tall sash", "dark chevron oak", "warm directional afternoon light", "authoritative and refined"),
      family("Biophilic Design Studio", "oak workbench and soft green upholstery", ["shared oak studio table", "sage swivel chair"], ["large botanical", "cork samples", "glass task lamp"], "indoor garden threshold and corner glazing", "light terrazzo", "dappled plant-filtered daylight", "fresh and collaborative"),
    ],
  },
  "Bathroom / Powder": {
    visualDirection: "jewel-box bathrooms with wallpaper-safe feature walls", roomType: "boutique powder room", palette: ["#d9d2c6", "#8da09a", "#b08769", "#454e4d"], negativeConstraints: ["living-room seating", "visible shower over wallpaper", "sterile empty showroom"], families: [
      family("Scandinavian Spa", "pale oak and matte white bathroom joinery", ["floating oak vanity", "frameless round mirror"], ["linen hand towel", "stone soap dish", "small branch"], "quiet recessed basin wall and narrow window", "pale limestone tile", "soft skylight", "clean and restorative"),
      family("Vintage Powder Room", "painted vanity and classic polished fittings", ["marble-topped vanity", "antique brass mirror"], ["pleated sconce", "glass perfume bottle", "embroidered towel"], "picture rail and deep sash reveal", "small checkerboard marble", "warm sconce and window light", "charming and intimate"),
      family("Modern Monolithic Bath", "seamless stone forms and concealed storage", ["integrated stone basin", "tall mirrored cabinet"], ["sculptural tap", "single vessel", "folded towel"], "flush service wall and slot window", "large-format grey stone", "crisp indirect top light", "architectural and calm"),
      family("Compact City Powder", "space-saving lacquer and metal fixtures", ["corner wall basin", "pill-shaped mirror"], ["small glass shelf", "wall sconce", "hand towel"], "tight offset plan and pocket-door reveal", "speckled porcelain mosaic", "focused side light", "smart and polished"),
      family("Luxury Marble Bathroom", "book-matched stone and bespoke walnut joinery", ["fluted walnut vanity", "bronze-framed mirror"], ["handblown vessel", "silk-shade sconce", "rolled towel"], "coved ceiling and full-height bronze window", "veined marble slabs", "luminous layered daylight", "opulent and restrained"),
      family("Natural Wellness Bath", "warm timber and handmade mineral finishes", ["travertine pedestal basin", "teak storage bench"], ["woven basket", "clay vessel", "eucalyptus stem"], "soft plaster arch and garden-facing opening", "handmade terracotta tile", "dappled garden light", "earthy and tranquil"),
    ],
  },
  "Dining / Entryway": {
    visualDirection: "architectural hospitality spaces for arrivals and gathering", roomType: "dining room and entry gallery", palette: ["#ddd2bd", "#9b765d", "#65746b", "#4b403c"], negativeConstraints: ["bedroom furniture", "gaming setup", "empty corridor"], families: [
      family("Nordic Dining Room", "light timber and woven dining furniture", ["oval ash dining table", "six cord chairs"], ["paper pendant", "ceramic bowl", "linen runner"], "simple opening sequence and broad window", "pale oak boards", "clear daytime light", "social and airy"),
      family("Vintage Entry Gallery", "collected antique pieces and tailored upholstery", ["mahogany console", "striped entry bench"], ["brass lamp", "ceramic umbrella stand", "tall branches"], "traditional archway and stair newel", "black-and-white stone tile", "warm late-afternoon light", "welcoming and storied"),
      family("Modern Dining Pavilion", "sculptural contemporary furniture", ["stone pedestal table", "curved dining chairs"], ["linear pendant", "glass bowl", "single botanical"], "frameless glazing and long axial opening", "seamless limestone", "bright architectural daylight", "precise and dramatic"),
      family("Compact Breakfast Room", "small-scale painted furniture", ["round bistro table", "built-in banquette"], ["small pendant", "fruit bowl", "checked cushion"], "window nook and space-saving corner plan", "warm cork floor", "soft breakfast light", "cozy and practical"),
      family("Luxury Formal Dining", "bespoke upholstery and polished natural materials", ["long lacquer dining table", "high-back velvet chairs"], ["crystal pendant", "silver bowl", "silk runner"], "coffered ceiling edge and tall bronze doors", "smoked chevron oak", "layered evening light", "ceremonial and refined"),
      family("Mediterranean Entry Dining", "limewashed masonry with rustic crafted furniture", ["reclaimed trestle table", "woven rush chairs"], ["terracotta urn", "olive branches", "forged pendant"], "deep plaster arch and shuttered garden door", "handmade terracotta", "sun-washed side light", "relaxed and generous"),
    ],
  },
  "Dark / Moody Interior": {
    visualDirection: "cinematic dark interiors with sophisticated tonal layering", roomType: "moody designer lounge", palette: ["#252724", "#51463e", "#786757", "#b09678"], negativeConstraints: ["crushed black shadows", "nightclub neon", "bright nursery styling"], families: [
      family("Library Lounge", "dark oak shelving and deep leather seating", ["oxblood leather sofa", "dark oak library table"], ["bronze reading lamp", "collector books", "smoked glass"], "deep library bay and tall shadowed window", "ebonized herringbone", "low raking window light", "scholarly and intimate"),
      family("Modern Noir Room", "monochrome sculptural furniture", ["charcoal curved sofa", "black stone coffee table"], ["chrome lamp", "single dark vessel", "tonal textile"], "flush black portal and slit window", "polished charcoal concrete", "controlled cool side light", "cinematic and minimal"),
      family("Boutique Hotel Bar", "velvet banquette and bronze-accented joinery", ["plum velvet banquette", "bronze pedestal table"], ["smoked pendant", "cut-glass vessel", "small floral stem"], "ribbed bar alcove and mirrored threshold", "dark terrazzo", "amber pool lighting", "seductive and polished"),
      family("Compact Reading Den", "small-scale tactile lounge furniture", ["moss bouclé armchair", "slim timber side table"], ["cone reading lamp", "book stack", "wool cushion"], "tight corner recess and deep sill", "dark cork floor", "single warm reading pool", "cocooning and quiet"),
      family("Brutalist Salon", "low leather and raw stone furniture", ["low black leather sofa", "rough stone plinth"], ["cast metal lamp", "bronze object", "linen throw"], "board-marked concrete opening and massive beam", "dark poured concrete", "hard raking daylight", "powerful and restrained"),
      family("Jewel-tone Salon", "saturated velvet and lacquer statement pieces", ["teal velvet settee", "burgundy lacquer console"], ["colored glass lamp", "brass bowl", "silk cushion"], "ornamental arch and high ceiling cove", "dark walnut parquet", "warm theatrical evening glow", "rich and expressive"),
    ],
  },
  "Minimal Interior": {
    visualDirection: "quiet contemporary minimalism with precise negative space", roomType: "minimal architectural interior", palette: ["#ece8df", "#c5bbac", "#8b8d84", "#555b57"], negativeConstraints: ["clutter", "ornate furniture", "empty white studio backdrop"], families: [
      family("Warm Minimal", "soft linen and pale oak pure forms", ["low oatmeal sofa", "solid oak side block"], ["single ceramic vessel", "linen throw", "small branch"], "soft plaster reveal and long low ledge", "pale oak boards", "broad diffuse daylight", "warm and quiet"),
      family("Japanese Minimal", "low blackened timber and woven pieces", ["low platform seat", "charred timber table"], ["stone bowl", "paper lantern", "single stem"], "timber screen edge and tokonoma recess", "matte ash boards", "restrained north light", "meditative and precise"),
      family("Gallery Minimal", "one sculptural upholstered piece and stone plinth", ["white sculptural chair", "limestone plinth table"], ["bronze object", "art book", "tall vessel"], "gallery-height volume and frameless window", "seamless pale concrete", "crisp overhead daylight", "editorial and spacious"),
      family("Compact Micro Interior", "folding and wall-mounted pale furniture", ["built-in window bench", "floating narrow console"], ["small lamp", "folded blanket", "ceramic cup"], "tight multifunctional alcove and pocket opening", "natural cork floor", "soft side-window light", "efficient and calm"),
      family("Monastic Luxury", "massive natural materials with almost no ornament", ["travertine bench", "dark oak monolith table"], ["hand-thrown vessel", "linen cushion", "single candle"], "deep stone portal and high coved ceiling", "large limestone slabs", "luminous raking daylight", "solemn and luxurious"),
      family("Soft Organic Minimal", "curved plaster and boucle forms", ["rounded cream sofa", "pebble-shaped table"], ["wool throw", "organic ceramic", "dried grass"], "curved corner and asymmetrical rooflight", "light poured terrazzo", "dappled soft daylight", "gentle and tactile"),
    ],
  },
  "Luxury Interior": {
    visualDirection: "high-end residential editorials with bespoke detailing", roomType: "luxury residential salon", palette: ["#e2d7c8", "#aa8c70", "#6e7169", "#403b38"], negativeConstraints: ["gaudy gold overload", "generic hotel lobby", "cheap showroom staging"], families: [
      family("Parisian Salon", "tailored upholstery and antique-inspired lacquer", ["curved ivory settee", "ebonized console"], ["silk lamp", "crystal vessel", "collector books"], "ornate cornice, tall French window, and panelled portal", "restored chevron oak", "soft Parisian daylight", "graceful and cultivated"),
      family("Italian Modern", "low leather and dramatic polished stone", ["saddle-leather modular sofa", "calacatta cocktail table"], ["Murano-style vase", "chrome lamp", "cashmere throw"], "travertine opening and full-height glazing", "large travertine slabs", "sharp Mediterranean daylight", "confident and refined"),
      family("Penthouse Contemporary", "bespoke curved furniture with metal accents", ["panoramic crescent sofa", "smoked-glass table"], ["sculptural floor lamp", "design books", "bronze object"], "double-aspect skyline glazing and ceiling reveal", "smoked oak boards", "luminous city daylight", "expansive and polished"),
      family("Quiet Luxury Retreat", "tonal linen, walnut, and hand-finished pieces", ["deep linen sofa", "rounded walnut console"], ["handblown vase", "bouclé cushion", "stone tray"], "subtle shadow-gap portal and deep garden window", "wide walnut planks", "gentle layered morning light", "understated and serene"),
      family("Art Deco Residence", "channelled velvet and high-gloss timber", ["sapphire velvet sofa", "fluted lacquer cabinet"], ["opal globe lamp", "brass sculpture", "silk bolster"], "stepped arch and geometric ceiling cove", "dark geometric parquet", "warm gallery evening light", "glamorous and composed"),
      family("Resort Villa Salon", "woven luxury seating and pale stone forms", ["woven lounge sofa", "carved limestone table"], ["large palm", "linen throw", "ceramic urn"], "open garden loggia and broad arched opening", "honed pale stone", "sun-filtered resort daylight", "relaxed and elevated"),
    ],
  },
  "Commercial Interior": {
    visualDirection: "premium hospitality and retail interiors with professional merchandising", roomType: "boutique commercial interior", palette: ["#d9d0c2", "#947862", "#69736d", "#343d3a"], negativeConstraints: ["residential bedroom furniture", "empty office cubicle", "visible brand logos or text"], families: [
      family("Boutique Retail", "custom display millwork and tailored lounge pieces", ["curved display plinth", "tailored fitting chair"], ["curated merchandise", "track pendant", "large botanical"], "shopfront glazing bay and sculpted display portal", "pale terrazzo", "balanced storefront daylight", "polished and inviting"),
      family("Artisan Café", "crafted timber tables and comfortable contract seating", ["oak café banquette", "round stone tables"], ["ceramic cups", "opal pendants", "small plants"], "service hatch arch and street window", "small-format quarry tile", "warm breakfast daylight", "convivial and crafted"),
      family("Boutique Hotel Lobby", "deep upholstery and premium stone tables", ["modular lobby sofa", "marble concierge table"], ["architectural lamp", "large vase", "design books"], "double-height arrival volume and bronze doors", "large limestone slabs", "layered hospitality daylight", "memorable and composed"),
      family("Design Showroom", "minimal display systems and sculptural seating", ["modular product plinths", "single statement chair"], ["material sample", "linear light", "small sculpture"], "long gallery axis and clerestory strip", "seamless pale concrete", "crisp neutral display light", "precise and editorial"),
      family("Intimate Restaurant", "upholstered banquettes and dark crafted tables", ["channelled dining banquette", "dark timber pedestal tables"], ["small table lamp", "glassware", "ceramic vessel"], "arched dining bays and lowered acoustic ceiling", "dark oak parquet", "warm evening pool lighting", "intimate and atmospheric"),
      family("Creative Reception", "color-controlled contract furniture and custom desk", ["sculptural reception desk", "soft lounge chair"], ["floor lamp", "art books", "tall indoor tree"], "asymmetric welcome portal and corner glazing", "flecked recycled terrazzo", "bright directional daylight", "fresh and professional"),
    ],
  },
};

const architectureProfiles = [
  { roomDimensions: "generous rectangular room with a broad uninterrupted wall", ceiling: "2.8 metre flat ceiling", windows: "tall left-hand picture window", trim: "slim square baseboards" },
  { roomDimensions: "compact square room with close, believable proportions", ceiling: "lower 2.45 metre ceiling", windows: "single deep-set right-hand sash window", trim: "traditional skirting and a narrow picture rail" },
  { roomDimensions: "long narrow room with a strong depth axis", ceiling: "3.1 metre tray ceiling", windows: "high clerestory strip on the side wall", trim: "flush shadow-gap junctions" },
  { roomDimensions: "loft-like room with an offset floor plan", ceiling: "sloped ceiling with one expressed beam", windows: "paired corner windows", trim: "minimal recessed base detail" },
  { roomDimensions: "generous double-aspect room with formal proportions", ceiling: "3.3 metre coved ceiling", windows: "broad projecting bay window", trim: "refined deep skirting and restrained cornice" },
  { roomDimensions: "irregular L-shaped room with distinct foreground and background zones", ceiling: "asymmetrical vaulted ceiling", windows: "rooflight plus one narrow vertical window", trim: "crafted timber edge details" },
] as const;

const roleSpecs: Record<SceneRoleId, Pick<SceneBlueprint, "roleLabel" | "title" | "cameraAngle" | "cameraDistance" | "cameraHeight" | "lensStyle" | "composition" | "layout" | "wallpaperCoverage">> = {
  hero: { roleLabel: "HERO", title: "Commercial Room Hero", cameraAngle: "frontal three-quarter", cameraDistance: "medium-wide", cameraHeight: "eye level", lensStyle: "35mm editorial", composition: "hero wall anchors an asymmetrical marketplace composition", layout: "balanced furniture island with open left circulation", wallpaperCoverage: "55–65% of image" },
  creative: { roleLabel: "CREATIVE", title: "Alternate Composition", cameraAngle: "low off-center", cameraDistance: "medium", cameraHeight: "low", lensStyle: "40mm cinematic", composition: "unexpected negative space and offset furniture grouping", layout: "furniture shifted to the right with a deep foreground", wallpaperCoverage: "45–55% of image" },
  closeup: { roleLabel: "CLOSE-UP", title: "Wallpaper Detail", cameraAngle: "near-frontal detail", cameraDistance: "close", cameraHeight: "chest height", lensStyle: "55mm detail", composition: "pattern field in sharp focus with one partial furnishing", layout: "cropped furnishing at one edge and clean wall junction visible", wallpaperCoverage: "70–80% of image" },
  wide: { roleLabel: "WIDE", title: "Full Room Context", cameraAngle: "straight wide", cameraDistance: "wide", cameraHeight: "eye level", lensStyle: "24mm architectural", composition: "full environment with a long uninterrupted feature wall", layout: "perimeter arrangement with generous central floor area", wallpaperCoverage: "40–50% of image" },
  editorial: { roleLabel: "EDITORIAL", title: "Styled Detail", cameraAngle: "layered vignette", cameraDistance: "medium-close", cameraHeight: "seated height", lensStyle: "50mm editorial", composition: "foreground decor layers frame a clearly visible wall field", layout: "overlapping foreground vignette with off-axis furniture", wallpaperCoverage: "50–60% of image" },
  perspective: { roleLabel: "PERSPECTIVE", title: "Architectural Angle", cameraAngle: "diagonal corner view", cameraDistance: "medium-wide", cameraHeight: "slightly elevated", lensStyle: "28mm tilt-corrected", composition: "room corner and wall transition create obvious depth", layout: "depth-led diagonal arrangement across two spatial zones", wallpaperCoverage: "45–60% of image" },
};

const slotRoles: Record<string, SceneRoleId> = { "Hero room": "hero", "Alternate room": "creative", "Close-up detail": "closeup", "Wide room view": "wide", "Styled room view": "editorial", "Clean wall presentation": "perspective" };
const roleOrder: SceneRoleId[] = ["hero", "creative", "closeup", "wide", "editorial", "perspective"];
const runVariationCues = [
  "place the main opening on the left and use a shallow foreground threshold",
  "place the main opening on the right and build a longer diagonal sightline",
  "use an offset doorway and a partially visible adjacent zone",
  "use a corner window orientation and a stronger foreground object",
  "shift the focal axis away from the room center and vary circulation",
  "use a new floor-plan orientation with an asymmetric wall return",
] as const;

function categoryId(value: string): MockupCategoryId { return MOCKUP_CATEGORIES.includes(value as MockupCategoryId) ? value as MockupCategoryId : "Living Room"; }

export function sceneRoleForSlot(slot: Pick<RenderSlot, "role">): SceneRoleId { return slotRoles[slot.role] ?? "hero"; }
export function getCategoryDirection(value: string) { const id = categoryId(value); return { id, ...directions[id] }; }

export function getSceneBlueprint(category: string, role: SceneRoleId, variant = 0): SceneBlueprint {
  const direction = getCategoryDirection(category); const spec = roleSpecs[role]; const v = Math.abs(variant); const roleIndex = roleOrder.indexOf(role); const selection = (roleIndex + v) % 6;
  const selectedFamily = direction.families[selection]; const architecture = architectureProfiles[selection];
  return {
    id: `${direction.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${role}-v${v + 1}`, role, ...spec,
    title: `${selectedFamily.name} · ${spec.title}`, roomType: direction.roomType, designFamily: selectedFamily.name,
    cameraAngle: `${spec.cameraAngle}, ${selection % 2 ? "right-to-left" : "left-to-right"} visual flow`,
    composition: `${spec.composition}; ${spec.layout}; floor-plan iteration ${v + 1}`,
    furnitureStyle: selectedFamily.furnitureStyle, keyFurniture: selectedFamily.keyFurniture, props: selectedFamily.props,
    roomDimensions: architecture.roomDimensions, ceiling: architecture.ceiling, windows: architecture.windows, flooring: selectedFamily.flooring, trim: architecture.trim,
    architecture: `${selectedFamily.architecture}; ${architecture.roomDimensions}; ${architecture.ceiling}; ${architecture.windows}; ${architecture.trim}`,
    lighting: selectedFamily.lighting, mood: selectedFamily.mood, palette: v % 2 ? [direction.palette[1], direction.palette[0], direction.palette[3], direction.palette[2]] : direction.palette,
    negativeConstraints: [...direction.negativeConstraints, "do not cover most of the feature wall", "do not generate wallpaper or wall art", "do not use an empty studio wall", "do not repeat another scene's architecture or furniture set"], variant: v,
  };
}

export function sceneBlueprintFor(project: Project, slot: RenderSlot) { return getSceneBlueprint(project.primaryTargetRoom, sceneRoleForSlot(slot), slot.version); }

export function buildMockupPrompt({ project, sceneBlueprint, previousScenes = [], generationSeed }: { project: Project; sceneBlueprint: SceneBlueprint; previousScenes?: SceneBlueprint[]; generationSeed?: number }) {
  const category = getCategoryDirection(project.primaryTargetRoom);
  const themeDirection = project.prompt.theme === "Disney" ? ` Use the Disney story selection ${project.prompt.customCharacterStory || project.prompt.characterStory || "storybook"} only to guide removable furniture and decor, never to decorate the feature wall.` : ` Use the ${project.prompt.theme} theme only for removable furniture and decor, never for the feature wall.`;
  const prior = previousScenes.length ? ` Do not reproduce these previous design families or compositions: ${previousScenes.map((scene) => `${scene.designFamily} / ${scene.cameraAngle} / ${scene.architecture}`).join("; ")}.` : "";
  const variation = generationSeed ? ` Run-specific room variation: ${runVariationCues[generationSeed % runVariationCues.length]}. Use seed ${generationSeed} to make the room layout and styling fresh while preserving this blueprint's category identity.` : "";
  return `Create a premium photorealistic ${sceneBlueprint.roomType} interior photograph with one large, clearly visible, plain undecorated wall suitable for a wallpaper product presentation. The room must not contain wallpaper, wall patterns, murals, decals, artwork, frames, text, or floating panels on that wall.${themeDirection} Category direction: ${category.visualDirection}. Design family: ${sceneBlueprint.designFamily}. Scene role: ${sceneBlueprint.roleLabel} — ${sceneBlueprint.title}. Camera: ${sceneBlueprint.cameraAngle}, ${sceneBlueprint.cameraDistance}, ${sceneBlueprint.cameraHeight}, ${sceneBlueprint.lensStyle}. Composition and layout: ${sceneBlueprint.composition}; ${sceneBlueprint.layout}. Architecture must be materially distinct: ${sceneBlueprint.roomDimensions}; ${sceneBlueprint.ceiling}; ${sceneBlueprint.windows}; ${sceneBlueprint.architecture}. Flooring: ${sceneBlueprint.flooring}. Trim: ${sceneBlueprint.trim}. Furniture: ${sceneBlueprint.furnitureStyle}; include ${sceneBlueprint.keyFurniture.join(" and ")} naturally in the foreground while leaving a substantial wall surface visible behind it. Props: ${sceneBlueprint.props.join(", ")}. Lighting: ${sceneBlueprint.lighting}. Mood: ${sceneBlueprint.mood}. Visible wall coverage: ${sceneBlueprint.wallpaperCoverage}. Avoid: ${sceneBlueprint.negativeConstraints.join("; ")}; generated wallpaper; wall art on the target surface; empty studio backdrop; synthetic 3D render. Do not reproduce the previous room composition.${prior}${variation}`;
}
