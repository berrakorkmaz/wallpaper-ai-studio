"use client";
/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { HelpGuide } from "./HelpGuide.tsx";
import { ZipExportAdapter } from "../integrations/export/index.ts";
import { approveOutput, completeRenderJob, requestRenderJobs } from "../lib/core/render.ts";
import { changeProductType, createDemoProject, generateUploadedProjectName, markSlotsStaleForNewMaster, setPatternScale } from "../lib/core/project.ts";
import { DEFAULT_OUTPUT_PROFILE } from "../lib/core/output-profiles.ts";
import { compilePrompt } from "../lib/core/prompt.ts";
import { evaluateMasterQa } from "../lib/core/qa.ts";
import { getSceneBlueprint, MOCKUP_CATEGORIES, sceneRoleForSlot } from "../lib/core/mockup-scenes.ts";
import { buildMockupBatchRequest } from "../lib/core/mockup-request.ts";
import { getCharacterPreset, MOOD_OPTIONS, PALETTE_OPTIONS, STYLE_OPTIONS, themePresets, THEME_OPTIONS } from "../lib/core/theme-presets.ts";
import { createMockupBatch, getMockupBatch, getPublicRenderConfig, retryMockupSlots } from "../integrations/image-generation/client.ts";
import type { MockupBatchStatus, MockupJobStage } from "../lib/core/mockup-api.ts";
import type { ArtworkSource, DesignAsset, OutputAsset, PatternContent, PatternScale, ProductType, Project, PromptSpec, RenderJob } from "../lib/core/types.ts";

const STORAGE_KEY = "wallpaper-ai-studio-simple-flow-v1";
const DEMO_USER_ID = "demo-user";
const exporter = new ZipExportAdapter();
const rooms = MOCKUP_CATEGORIES;

type Screen = "home" | "prompt" | "upload" | "settings" | "confirm" | "results" | "projects" | "account";
type UploadMode = "prompt" | "direct";
type RuntimeRenderConfig = Awaited<ReturnType<typeof getPublicRenderConfig>>;

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="flow-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return <label className="flow-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{item || "None"}</option>)}</select></label>;
}

function PresetSelect({ label, value, values, onChange }: { label: string; value: string; values: readonly { id: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="flow-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}

function EditableSuggestions({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  const listId = `suggestions-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <label className="flow-field"><span>{label}</span><input list={listId} value={value} onChange={(event) => onChange(event.target.value)} /><datalist id={listId}>{values.map((item) => <option key={item} value={item} />)}</datalist></label>;
}

function FlowHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="flow-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>;
}

function Progress({ screen }: { screen: Screen }) {
  const active = screen === "settings" ? 1 : screen === "confirm" ? 2 : screen === "results" ? 3 : 0;
  return <ol className="flow-progress" aria-label="Çalışma ilerlemesi">{["Görsel", "Mockup Ayarları", "Onay", "Sonuçlar"].map((label, index) => <li key={label} className={index < active ? "complete" : index === active ? "active" : ""}><b>{index < active ? "✓" : index + 1}</b><span>{label}</span></li>)}</ol>;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function aspectRatioLabel(width: number, height: number) {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(width, height);
  const left = width / divisor;
  const right = height / divisor;
  return left <= 30 && right <= 30 ? `${left}:${right}` : (width / height).toFixed(2);
}

async function inspectImage(file: File, project: Project) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("UNSUPPORTED_FILE");
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hash = [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
  const fileUrl = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = fileUrl; });
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const probe = document.createElement("canvas");
  probe.width = Math.min(width, 128);
  probe.height = Math.min(height, 128);
  const context = probe.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, probe.width, probe.height);
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
  let red = 0; let green = 0; let blue = 0; let alpha = false; let samples = 0;
  for (let i = 0; i < pixels.length; i += 16) { red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2]; samples += 1; if (pixels[i + 3] < 255) alpha = true; }
  const rgb = [Math.round(red / samples), Math.round(green / samples), Math.round(blue / samples)];
  const max = Math.max(...rgb) / 255; const min = Math.min(...rgb) / 255;
  const luminance = (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  const hex = (values: number[]) => `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
  const palette = [hex(rgb), hex(rgb.map((value) => value + 46)), hex(rgb.map((value) => value - 46))];
  const edgeDiff = (horizontal: boolean) => { let total = 0; const count = horizontal ? probe.height : probe.width; for (let i = 0; i < count; i++) { const a = horizontal ? (i * probe.width) * 4 : i * 4; const b = horizontal ? (i * probe.width + probe.width - 1) * 4 : ((probe.height - 1) * probe.width + i) * 4; total += (Math.abs(pixels[a] - pixels[b]) + Math.abs(pixels[a + 1] - pixels[b + 1]) + Math.abs(pixels[a + 2] - pixels[b + 2])) / 3; } return total / count; };
  const asset: DesignAsset = { id: `master-${crypto.randomUUID()}`, projectId: project.id, userId: project.userId, role: "production_master", fileUrl, previewUrl: fileUrl, fileName: file.name, width, height, fileHash: hash, version: project.masterVersions.length + 1, createdAt: new Date().toISOString(), mimeType: file.type, fileSize: file.size, aspectRatio: width / height, colorProfile: "sRGB", hasTransparency: alpha, immutable: true, approvedAt: null };
  const collection = project.primaryTargetRoom === "Nursery" ? "Baby & Nursery" : project.primaryTargetRoom === "Kids Room" ? "Kids Room" : project.primaryTargetRoom;
  const mood = luminance > .72 ? "Soft & airy" : luminance < .34 ? "Cinematic" : saturation > .45 ? "Playful" : "Organic elegant";
  const edges = { horizontal: edgeDiff(true), vertical: edgeDiff(false), motifCutRisk: edgeDiff(true) > 12 || edgeDiff(false) > 12 };
  const recommendation = { collection, mood, patternScale: project.productType === "seamless" ? (project.patternScale ?? "medium") : null, colorPalette: palette, suggestedRooms: [project.primaryTargetRoom, project.secondaryTargetRoom || "Living Room"], reason: "Artwork color balance and target room" };
  return { asset, edges, analysis: { dominantColors: palette, averageLuminance: Number(luminance.toFixed(3)), averageSaturation: Number(saturation.toFixed(3)), analyzedAt: new Date().toISOString(), source: "browser" as const, edgeMetrics: edges }, recommendation };
}

type InspectedArtwork = Awaited<ReturnType<typeof inspectImage>>;

function applyInspectedArtwork(project: Project, inspected: InspectedArtwork, source: ArtworkSource): Project {
  const ratio = aspectRatioLabel(inspected.asset.width, inspected.asset.height);
  const generatedAt = new Date().toISOString();
  return { ...project,
    projectName: project.masterVersions.length === 0 && !project.isProjectNameManuallyEdited ? generateUploadedProjectName(project.projectSequenceNumber, generatedAt) : project.projectName,
    projectNameGeneratedAt: generatedAt,
    artworkSource: source,
    calculatedAspectRatio: ratio,
    prompt: { ...project.prompt, promptText: source === "user_upload" ? "" : project.prompt.promptText, selectedAt: source === "user_upload" ? null : project.prompt.selectedAt, aspectRatio: ratio },
    productionMaster: inspected.asset,
    masterVersions: [...project.masterVersions, inspected.asset],
    activeMasterVersionId: inspected.asset.id,
    masterStatus: "UPLOADED",
    qa: { ...project.qa, status: "UPLOADED", checks: [] },
    artworkAnalysis: inspected.analysis,
    artDirection: { ...project.artDirection, collection: inspected.recommendation.collection, mood: inspected.recommendation.mood, patternScale: inspected.recommendation.patternScale, colorPalette: inspected.recommendation.colorPalette, recommendation: inspected.recommendation, userOverridden: false, savedAt: null },
    collection: inspected.recommendation.collection,
    mood: inspected.recommendation.mood,
    slots: markSlotsStaleForNewMaster(project),
  };
}

function preserveArtworkForType(project: Project, productType: ProductType) {
  const changed = changeProductType(project, productType);
  return { ...changed, projectName: project.projectName, projectNameGeneratedAt: project.projectNameGeneratedAt, isProjectNameManuallyEdited: project.isProjectNameManuallyEdited, artworkSource: project.artworkSource, productionMaster: project.productionMaster, masterVersions: project.masterVersions, activeMasterVersionId: project.activeMasterVersionId, masterStatus: project.productionMaster ? "UPLOADED" as const : "AWAITING_UPLOAD" as const, artworkAnalysis: project.artworkAnalysis, calculatedAspectRatio: project.productionMaster ? aspectRatioLabel(project.productionMaster.width, project.productionMaster.height) : changed.calculatedAspectRatio, prompt: { ...changed.prompt, promptText: project.prompt.promptText, selectedAt: project.prompt.selectedAt }, artDirection: { ...project.artDirection, patternScale: productType === "seamless" ? (project.patternScale ?? "medium") : null, savedAt: null } };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill(); }
async function loadImage(url: string) { const image = new Image(); image.crossOrigin = "anonymous"; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url; }); return image; }

async function compositeOutput(project: Project, job: RenderJob): Promise<OutputAsset> {
  const master = project.productionMaster!;
  const source = await loadImage(master.previewUrl || master.fileUrl);
  const { width, height, quality } = DEFAULT_OUTPUT_PROFILE;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d")!;
  const slot = project.slots.find((item) => item.id === job.slotId)!;
  const scene = getSceneBlueprint(project.primaryTargetRoom, sceneRoleForSlot(slot), slot.version);
  const [wallBase, floor, furniture, accent] = scene.palette;
  context.fillStyle = wallBase; context.fillRect(0, 0, width, height);
  const drawWall = (points: [number, number][]) => {
    context.save(); context.beginPath(); context.moveTo(points[0][0], points[0][1]); for (const [x, y] of points.slice(1)) context.lineTo(x, y); context.closePath(); context.clip();
    const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y); const x = Math.min(...xs); const y = Math.min(...ys); const w = Math.max(...xs) - x; const h = Math.max(...ys) - y;
    if (project.productType === "seamless") { const divisor = project.patternScale === "small" ? 5 : project.patternScale === "large" ? 2 : 3; const tile = Math.min(w / divisor, h / divisor); for (let row = 0; row < Math.ceil(h / tile); row++) for (let col = 0; col < Math.ceil(w / tile); col++) context.drawImage(source, x + col * tile, y + row * tile, tile, tile); }
    else { const contain = project.artworkPlacementMode === "show_full"; const scale = contain ? Math.min(w / source.width, h / source.height) : Math.max(w / source.width, h / source.height); const dw = source.width * scale; const dh = source.height * scale; const fx = project.artworkPlacementMode === "focal_point" ? project.focalPoint.x / 100 : .5; const fy = project.artworkPlacementMode === "focal_point" ? project.focalPoint.y / 100 : .5; context.drawImage(source, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh); }
    context.restore();
  };
  const role = scene.role;
  const wall: [number, number][] = role === "perspective" ? [[0, 0], [width * .72, 170], [width * .72, height * .77], [0, height * .86]] : role === "creative" ? [[width * .14, 0], [width, 0], [width, height * .8], [width * .05, height * .7]] : [[0, 0], [width, 0], [width, height * (role === "closeup" ? .9 : .76)], [0, height * (role === "closeup" ? .9 : .76)]];
  drawWall(wall);
  const shade = context.createLinearGradient(0, 0, width, height); shade.addColorStop(0, "rgba(255,255,255,.14)"); shade.addColorStop(1, "rgba(22,28,27,.24)"); context.fillStyle = shade; context.fillRect(0, 0, width, height * .78);
  context.fillStyle = floor; context.beginPath(); context.moveTo(0, height * .76); context.lineTo(width, role === "perspective" ? height * .64 : height * .76); context.lineTo(width, height); context.lineTo(0, height); context.fill();
  context.fillStyle = furniture;
  if (role === "closeup") roundedRect(context, width * .7, height * .62, width * .24, height * .24, 70);
  else if (role === "wide") { roundedRect(context, width * .08, height * .67, width * .32, height * .18, 65); roundedRect(context, width * .68, height * .7, width * .18, height * .15, 50); }
  else if (role === "editorial") { roundedRect(context, width * .12, height * .62, width * .42, height * .25, 80); context.fillStyle = accent; roundedRect(context, width * .62, height * .5, width * .11, height * .37, 35); }
  else if (role === "perspective") { roundedRect(context, width * .56, height * .58, width * .31, height * .23, 60); context.fillStyle = accent; context.fillRect(width * .72, 0, 18, height * .65); }
  else if (role === "creative") { roundedRect(context, width * .57, height * .65, width * .34, height * .22, 110); context.fillStyle = accent; context.beginPath(); context.arc(width * .23, height * .65, 125, 0, Math.PI * 2); context.fill(); }
  else { roundedRect(context, width * .18, height * .64, width * .48, height * .24, 90); context.fillStyle = accent; roundedRect(context, width * .72, height * .56, width * .1, height * .32, 35); }
  context.fillStyle = "rgba(28,32,31,.88)"; context.fillRect(70, height - 154, width - 140, 98);
  context.fillStyle = "#fff"; context.font = "600 34px Arial"; context.fillText(`${scene.roleLabel} · ${scene.title.toUpperCase()}`, 100, height - 92);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("ENCODE_FAILED")), "image/jpeg", quality / 100));
  return { id: `output-${crypto.randomUUID()}`, projectId: project.id, userId: project.userId, masterVersionId: master.id, slotId: job.slotId, role: job.slotRole, fileUrl: URL.createObjectURL(blob), fileName: `${job.slotId}.jpg`, width, height, format: "jpg", fileSize: blob.size, productionReady: false, renderProvider: "mock", sceneTemplateId: job.sceneTemplateId, approved: false, rejected: false, createdAt: new Date().toISOString() };
}

function syncProductionBatch(project: Project, batch: MockupBatchStatus) {
  let next = project;
  for (const remote of batch.outputs) {
    const slot = next.slots.find((item) => item.id === remote.slotId); if (!slot) continue;
    if (remote.status === "completed" && remote.outputUrl && slot.status !== "ready") {
      const job = next.renderJobs.find((item) => item.jobId === slot.activeJobId); if (!job) continue;
      const output: OutputAsset = { id: remote.id, projectId: next.id, userId: next.userId, masterVersionId: job.masterVersionId, slotId: slot.id, role: slot.role, fileUrl: remote.outputUrl, fileName: `${slot.id}.jpg`, width: remote.width, height: remote.height, format: "jpg", fileSize: 0, productionReady: true, renderProvider: "real", sceneTemplateId: remote.sceneId, approved: false, rejected: false, createdAt: remote.createdAt };
      next = completeRenderJob(next, job.jobId, output); continue;
    }
    next = { ...next, slots: next.slots.map((item) => item.id === slot.id ? { ...item, status: remote.status === "failed" ? "failed" : remote.status === "completed" ? "ready" : "queued" } : item) };
  }
  return next;
}

function SourceUpload({ project, mode, onComplete, onBack }: { project: Project; mode: UploadMode; onComplete: (project: Project) => void; onBack: () => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const upload = async (file: File) => { setBusy(true); setError(""); try { const inspected = await inspectImage(file, project); onComplete(applyInspectedArtwork(project, inspected, mode === "prompt" ? "generated_prompt" : "user_upload")); } catch { setError("Bu dosya okunamadı. JPG, JPEG, PNG veya WEBP formatında geçerli bir görsel yükleyin."); } finally { setBusy(false); } };
  return <div className="upload-step"><div className="upload-zone"><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} /><span>JPG · JPEG · PNG · WEBP</span><h2>{mode === "prompt" ? "Midjourney sonucunu yükleyin" : "Hazır görselinizi yükleyin"}</h2><p>Sistem piksel ölçüsünü, oranı, formatı, dosya boyutunu ve dosya hash'ini otomatik algılar.</p><button className="primary-button" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Görsel inceleniyor…" : "Görsel Seç"}</button>{error && <p className="form-error" role="alert">{error}</p>}</div><button className="text-button" onClick={onBack}>← Geri dön</button></div>;
}

function PromptBuilder({ project, update, onUpload, onBack }: { project: Project; update: (project: Project) => void; onUpload: () => void; onBack: () => void }) {
  const [generated, setGenerated] = useState(Boolean(project.prompt.promptText)); const [copied, setCopied] = useState(false);
  const setPrompt = <K extends keyof PromptSpec>(key: K, value: PromptSpec[K]) => update({ ...project, prompt: { ...project.prompt, [key]: value } });
  const disneyMode = project.productType === "seamless" && project.prompt.theme === themePresets.disney.label;
  const selectTheme = (theme: string) => { if (theme !== themePresets.disney.label) { update({ ...project, prompt: { ...project.prompt, theme, characterStory: "", customCharacterStory: "" } }); return; } const preset = getCharacterPreset(themePresets.disney.defaultCharacterId); update({ ...project, mood: preset.suggestedMood, prompt: { ...project.prompt, theme, characterStory: preset.id, customCharacterStory: "", patternContent: "Characters + Motifs", motifs: preset.suggestedMotifs, palette: preset.suggestedPalette, exclusions: preset.negativePrompt } }); };
  const selectCharacter = (characterStory: string) => { const preset = getCharacterPreset(characterStory); update({ ...project, mood: preset.suggestedMood, prompt: { ...project.prompt, characterStory, customCharacterStory: characterStory === "custom" ? project.prompt.customCharacterStory : "", motifs: preset.suggestedMotifs, palette: preset.suggestedPalette, exclusions: preset.negativePrompt } }); };
  const generate = (newSeed = false) => { const next = newSeed ? { ...project, prompt: { ...project.prompt, parameters: { ...project.prompt.parameters, seed: Math.floor(10000 + Math.random() * 89999) } } } : project; update({ ...next, artworkSource: "generated_prompt", prompt: { ...next.prompt, promptText: compilePrompt(next), selectedAt: new Date().toISOString() } }); setGenerated(true); setCopied(false); };
  return <section className="flow-screen"><Progress screen="prompt" /><FlowHeader eyebrow="PROMPT BUILDER" title="Duvar kâğıdı fikrinizi yönlendirin." copy="Seçimlerinizden İngilizce ve üretime uygun bir Midjourney promptu oluşturun. Prompt yalnızca sanat eserini tarif eder; oda veya mobilya üretmez." />
    {!generated ? <div className="flow-card prompt-form"><div className="choice-row"><button className={project.productType === "seamless" ? "selected" : ""} onClick={() => update(preserveArtworkForType(project, "seamless"))}><b>Seamless Pattern</b><small>Tekrarlanabilir kare desen</small></button><button className={project.productType === "mural" ? "selected" : ""} onClick={() => update(preserveArtworkForType(project, "mural"))}><b>Custom Mural</b><small>Panoramik tek kompozisyon</small></button></div><div className="form-grid-simple"><Select label="Theme" value={project.prompt.theme} values={THEME_OPTIONS} onChange={selectTheme} />{disneyMode && <div className="theme-preset-fields"><PresetSelect label="Character / Story" value={project.prompt.characterStory || themePresets.disney.defaultCharacterId} values={themePresets.disney.characters} onChange={selectCharacter} />{project.prompt.characterStory === "custom" && <Field label="Custom character / story" value={project.prompt.customCharacterStory} onChange={(value) => setPrompt("customCharacterStory", value)} placeholder="Character, movie, story or concept" />}<Select label="Pattern content" value={project.prompt.patternContent} values={themePresets.disney.patternContentOptions} onChange={(value) => setPrompt("patternContent", value as PatternContent)} /></div>}<Select label="Style" value={project.prompt.style} values={STYLE_OPTIONS} onChange={(value) => setPrompt("style", value)} /><EditableSuggestions label="Color palette" value={project.prompt.palette} values={PALETTE_OPTIONS} onChange={(value) => setPrompt("palette", value)} /><Select label="Mood" value={project.mood} values={MOOD_OPTIONS} onChange={(mood) => update({ ...project, mood })} /><Field label="Main motifs" value={project.prompt.motifs} onChange={(value) => setPrompt("motifs", value)} placeholder="foxes, fern leaves, tiny mushrooms" /><Select label="Density" value={project.prompt.density} values={["airy", "balanced", "dense"]} onChange={(value) => setPrompt("density", value as PromptSpec["density"])} /><Field label="Exclude" value={project.prompt.exclusions} onChange={(value) => setPrompt("exclusions", value)} /></div><div className="form-actions"><button className="secondary-button" onClick={onBack}>Geri</button><button className="primary-button" onClick={() => generate()}>Prompt Oluştur ✦</button></div></div> : <div className="prompt-result"><div className="prompt-paper"><span>ENGLISH MIDJOURNEY PROMPT</span><textarea aria-label="Generated Midjourney prompt" value={project.prompt.promptText} onChange={(event) => setPrompt("promptText", event.target.value)} /><div className="prompt-actions"><button onClick={async () => { await navigator.clipboard.writeText(project.prompt.promptText); setCopied(true); }}>{copied ? "Kopyalandı ✓" : "Copy"}</button><button onClick={() => generate(true)}>Regenerate</button><button onClick={() => setGenerated(false)}>Edit Choices</button></div></div><div className="instruction-card"><b>Sonraki adım</b><p>Promptu kopyalayın, Midjourney'de görselinizi üretin ve seçtiğiniz sonucu bilgisayarınıza indirin. Ardından burada yükleyerek mockup akışına devam edin.</p><button className="primary-button" onClick={onUpload}>Midjourney Sonucunu Yükle →</button></div></div>}
  </section>;
}

function MockupSettings({ project, update, next, back }: { project: Project; update: (project: Project) => void; next: () => void; back: () => void }) {
  const master = project.productionMaster!;
  const setRoom = (key: "primaryTargetRoom" | "secondaryTargetRoom", value: string) => update({ ...project, [key]: value, artDirection: { ...project.artDirection, [key]: value, userOverridden: true } });
  const setFocal = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); update({ ...project, artworkPlacementMode: "focal_point", focalPoint: { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) } }); };
  return <section className="flow-screen"><Progress screen="settings" /><FlowHeader eyebrow="MOCKUP AYARLARI" title="Görseliniz için doğru sahneleri seçin." copy="Gerçek duvar ölçüsü gerekmez. Ürün türü ve oda seçimleri, altı sabit mockup rolünün nasıl hazırlanacağını belirler." /><div className="source-summary"><img src={master.previewUrl || master.fileUrl} alt="Yüklenen kaynak görsel" /><dl><div><dt>PIXELS</dt><dd>{master.width} × {master.height}</dd></div><div><dt>ASPECT RATIO</dt><dd>{project.calculatedAspectRatio}</dd></div><div><dt>FORMAT</dt><dd>{master.mimeType.replace("image/", "").toUpperCase()}</dd></div><div><dt>FILE SIZE</dt><dd>{(master.fileSize / 1024 / 1024).toFixed(2)} MB</dd></div></dl></div>
    <div className="flow-card settings-form"><fieldset><legend>Product type</legend><div className="choice-row"><button className={project.productType === "seamless" ? "selected" : ""} onClick={() => update(preserveArtworkForType(project, "seamless"))}><b>Seamless Pattern</b><small>Tekrarlanan duvar kâğıdı</small></button><button className={project.productType === "mural" ? "selected" : ""} onClick={() => update(preserveArtworkForType(project, "mural"))}><b>Custom Mural</b><small>Tek panoramik kompozisyon</small></button></div></fieldset><div className="form-grid-simple"><Select label="Primary room · required" value={project.primaryTargetRoom} values={rooms} onChange={(value) => setRoom("primaryTargetRoom", value)} /><Select label="Secondary room · optional" value={project.secondaryTargetRoom} values={["", ...rooms]} onChange={(value) => setRoom("secondaryTargetRoom", value)} /></div>{project.productType === "seamless" ? <fieldset><legend>Pattern scale</legend><div className="scale-row">{(["small", "medium", "large"] as PatternScale[]).map((scale) => <button key={scale} className={project.patternScale === scale ? "selected" : ""} onClick={() => update(setPatternScale(project, scale))}><b>{scale}</b><small>{scale === "small" ? "Sık tekrar" : scale === "medium" ? "Dengeli tekrar" : "Büyük motif"}</small></button>)}</div></fieldset> : <details className="advanced-placement"><summary>Advanced Placement <span>Smart Fit varsayılan</span></summary><div className="placement-row">{([['smart_fit','Smart Fit'],['show_full','Show Full'],['fill_wall','Fill Wall'],['focal_point','Focal Point']] as const).map(([value, label]) => <button key={value} className={project.artworkPlacementMode === value ? "selected" : ""} onClick={() => update({ ...project, artworkPlacementMode: value })}>{label}</button>)}</div><div className="focal-canvas" onPointerDown={setFocal} onPointerMove={(event) => { if (event.buttons === 1) setFocal(event); }} style={{ backgroundImage: `url(${master.previewUrl || master.fileUrl})`, backgroundPosition: `${project.focalPoint.x}% ${project.focalPoint.y}%` }}><i style={{ left: `${project.focalPoint.x}%`, top: `${project.focalPoint.y}%` }} /><span>Odak noktasını sürükleyin</span></div><p>Kaynak oranı korunur; görsel hiçbir zaman esnetilmez.</p></details>}<div className="recommendation-strip"><span>AI ÖNERİSİ</span><b>{project.artDirection.collection} · {project.artDirection.mood}</b><div>{project.artDirection.colorPalette.map((color) => <i key={color} style={{ background: color }} />)}</div><small>Bu öneriler daha sonra değiştirilebilir.</small></div><div className="form-actions"><button className="secondary-button" onClick={back}>Geri</button><button className="primary-button" disabled={!project.primaryTargetRoom || (project.productType === "seamless" && !project.patternScale)} onClick={next}>Onaya Geç →</button></div></div>
  </section>;
}

function Confirmation({ project, back, create, falSmokeTest }: { project: Project; back: () => void; create: () => void; falSmokeTest: boolean }) {
  const master = project.productionMaster!;
  const qa = evaluateMasterQa(project, master, project.artworkAnalysis?.edgeMetrics);
  return <section className="flow-screen"><Progress screen="confirm" /><FlowHeader eyebrow="SON KONTROL" title={falSmokeTest ? "Gerçek AI sahne testini başlatın." : "Mockupları oluşturmadan önce kontrol edin."} copy={falSmokeTest ? "Bu geçici smoke test yalnızca ilk sahne blueprint'ini kullanır ve bir gerçek interior image üretir." : "Oluştur düğmesi yalnızca bir kez altı bağımsız işi başlatır. Bu kurulum demo modundadır ve gerçek Fal.ai bakiyesi kullanmaz."} /><div className="demo-banner"><b>{falSmokeTest ? "Real AI Scene Test" : "Demo Mode — Real Fal.ai generation is not connected"}</b><span>{falSmokeTest ? "Bu çıktı gerçek Fal üretimidir; henüz wallpaper compositing uygulanmaz ve final mockup değildir." : "Gösterilen çıktılar yerel önizlemedir; gerçek üretim sonucu olarak sunulmaz."}</span></div><div className="confirmation-grid"><div className="confirm-art"><img src={master.previewUrl || master.fileUrl} alt="Onaylanacak kaynak duvar kâğıdı" /><span>SOURCE ARTWORK · v{master.version}</span></div><div className="confirm-ledger"><div><span>Product</span><b>{project.productType === "seamless" ? "Seamless Pattern" : "Custom Mural"}</b></div><div><span>Primary room</span><b>{project.primaryTargetRoom}</b></div><div><span>Secondary room</span><b>{project.secondaryTargetRoom || "None"}</b></div><div><span>{project.productType === "seamless" ? "Pattern scale" : "Placement"}</span><b>{project.productType === "seamless" ? project.patternScale : project.artworkPlacementMode.replaceAll("_", " ")}</b></div><div><span>Mockup set</span><b>{falSmokeTest ? "1 real AI scene smoke test" : "6 independent scenes"}</b></div><div><span>Fal model</span><b>{falSmokeTest ? "Server-configured" : "Not connected"}</b></div><div><span>Artwork QA</span><b>{qa.status === "QA_PASSED" ? `Passed · ${qa.score}/100` : `Review recommended · ${qa.score}/100`}</b></div></div></div><div className="qa-mini"><b>QA checks</b>{qa.checks.map((item) => <span key={item.key} data-state={item.status}>{item.status === "pass" ? "✓" : item.status === "warn" ? "!" : "×"} {item.label}</span>)}</div><div className="form-actions"><button className="secondary-button" onClick={back}>Ayarları Düzenle</button><button className="primary-button" onClick={create}>{falSmokeTest ? "1 Real AI Scene Test Oluştur →" : "6 Mockup Oluştur →"}</button></div></section>;
}

function Results({ project, update, render, retry, stages, generationError, mode, provider, busy, openPreview, openHelp }: { project: Project; update: (project: Project) => void; render: (ids: string[], sourceProject?: Project) => Promise<void>; retry: (slotId: string) => Promise<void>; stages: Record<string, MockupJobStage>; generationError: string; mode: "demo" | "production"; provider: "mock" | "fal" | "custom"; busy: boolean; openPreview: (asset: OutputAsset) => void; openHelp: (section: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]); const [exporting, setExporting] = useState(false);
  const approved = project.outputAssets.filter((asset) => asset.approved && project.slots.some((slot) => slot.outputAssetId === asset.id));
  const exportAssets = async (ids: string[], name: string) => { if (!ids.length) return; setExporting(true); try { const result = await exporter.exportProject({ project, userId: project.userId, packageType: "mockups", assetIds: ids }); downloadBlob(result.blob, name); } finally { setExporting(false); } };
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const statusLabel = (slot: Project["slots"][number]) => { const stage = stages[slot.id]; if (stage === "generating_scene") return "Generating scene"; if (stage === "detecting_wall" || stage === "compositing_wallpaper") return "Applying wallpaper"; if (stage === "quality_check") return "Quality check"; if (stage === "completed" || slot.status === "ready") return "Completed"; if (stage === "failed" || slot.status === "failed") return "Failed"; if (stage === "queued" || slot.status === "queued") return "Queued"; return "Waiting"; };
  const changeCategory = (category: string) => { const next = { ...project, primaryTargetRoom: category, artDirection: { ...project.artDirection, primaryTargetRoom: category, collection: category, userOverridden: true } }; setSelected([]); void render(next.slots.map((slot) => slot.id), next); };
  const falSmokeTest = provider === "fal";
  const visibleSlots = falSmokeTest ? project.slots.slice(0, 1) : project.slots;
  return <section className="flow-screen"><Progress screen="results" /><FlowHeader eyebrow="SONUÇLAR" title={falSmokeTest ? "Real AI Scene Test" : "Altı sahneyi ayrı ayrı yönetin."} copy={falSmokeTest ? "Gerçek Fal sahnesi mevcut kategori ve ilk scene blueprint'i kullanılarak üretildi. Wallpaper compositing henüz uygulanmadı." : "Her sonuç aynı kaynak görsele bağlı, fakat farklı bir görsel göreve ve kontrollü sahne planına sahiptir."} /><div className="demo-banner"><b>{falSmokeTest ? "Real AI Scene Test" : mode === "production" ? "Production render pipeline" : "Demo Mode — Real Fal.ai generation is not connected"}</b><span>{falSmokeTest ? "Bu gerçek AI interior çıktısı bir bağlantı testidir; final wallpaper mockup olarak değerlendirilmemelidir." : mode === "production" ? "İşler güvenli backend mockup API üzerinden yürütülür." : "DEMO OUTPUT etiketli görseller, gelecekteki kategori odaklı AI üretimini temsil eden yerel kompozitlerdir."}</span><button onClick={() => openHelp("fal-ai")}>Bağlantı nasıl çalışır?</button></div>{generationError && <p className="form-error" role="alert">{generationError}</p>}<div className="category-switch"><label><span>VISUAL / ROOM CATEGORY</span><select value={project.primaryTargetRoom} disabled={busy} onChange={(event) => changeCategory(event.target.value)}>{rooms.map((room) => <option key={room}>{room}</option>)}</select></label><p>{falSmokeTest ? "Kategori değiştiğinde yeni bir gerçek AI smoke-test sahnesi üretilir." : "Kategori değiştiğinde altı sahnenin tamamı yeni görsel dünyaya göre hazırlanır."}</p></div><div className="results-toolbar"><span><b>{approved.length}</b> / {falSmokeTest ? 1 : 6} approved</span><button disabled={!selected.length || exporting} onClick={() => exportAssets(selected, "selected-wallpaper-mockups.zip")}>Selected ZIP</button><button className="primary-button" disabled={!approved.length || exporting} onClick={() => exportAssets(approved.map((asset) => asset.id), "approved-wallpaper-mockups.zip")}>ZIP all approved ↓</button></div><div className="result-grid">{visibleSlots.map((slot, index) => { const asset = project.outputAssets.find((item) => item.id === slot.outputAssetId); const scene = getSceneBlueprint(project.primaryTargetRoom, sceneRoleForSlot(slot), Math.max(0, slot.version - 1)); return <article key={slot.id} className={asset?.rejected ? "rejected" : asset?.approved ? "approved" : ""}><button className="result-preview" disabled={!asset} onClick={() => asset && openPreview(asset)} style={asset ? { backgroundImage: `url(${asset.fileUrl})` } : undefined}><span>M{index + 1}</span><b>{statusLabel(slot)}</b>{asset && <em>{falSmokeTest ? "REAL AI SCENE TEST" : asset.productionReady ? "PRODUCTION OUTPUT" : "DEMO OUTPUT"}</em>}</button><div className="result-copy"><small>{scene.roleLabel}</small><h3>{scene.title}</h3><p>{scene.cameraAngle} · {scene.lighting}</p>{asset && <label><input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggle(asset.id)} /> ZIP için seç</label>}</div><div className="result-actions">{asset && <button onClick={() => update(approveOutput(project, asset.id, true))}>{asset.approved ? "Approved ✓" : "Approve"}</button>}{asset && <button onClick={() => update(approveOutput(project, asset.id, false))}>Reject</button>}<button disabled={(mode === "demo" && !asset) || busy} onClick={() => falSmokeTest ? render([slot.id]) : mode === "production" ? retry(slot.id) : render([slot.id])}>Regenerate</button>{asset && <button onClick={async () => { const response = await fetch(asset.fileUrl); downloadBlob(await response.blob(), asset.fileName); }}>Download</button>}</div></article>; })}</div></section>;
}

function Projects({ project, update, resume }: { project: Project; update: (project: Project) => void; resume: () => void }) {
  const [editing, setEditing] = useState(false);
  return <section className="flow-screen"><FlowHeader eyebrow="PROJELERİM" title="Çalışmalarınızı kolayca ayırt edin." copy="Proje adı yalnızca uygulama içi düzen içindir; Etsy başlığına veya müşteriye görünen hiçbir alana otomatik aktarılmaz." /><article className="project-card"><div><span>ACTIVE PROJECT · {String(project.projectSequenceNumber).padStart(3, "0")}</span>{editing ? <input autoFocus aria-label="Optional internal name" value={project.projectName} onChange={(event) => update({ ...project, projectName: event.target.value, isProjectNameManuallyEdited: true })} onBlur={() => setEditing(false)} /> : <h2>{project.projectName}</h2>}<small>Optional internal name</small></div><button className="edit-button" aria-label="Proje adını düzenle" onClick={() => setEditing(true)}>✎</button><dl><div><dt>ARTWORK</dt><dd>{project.productionMaster ? project.productionMaster.fileName : "Not uploaded"}</dd></div><div><dt>TYPE</dt><dd>{project.productType}</dd></div><div><dt>ROOM</dt><dd>{project.primaryTargetRoom}</dd></div><div><dt>OUTPUTS</dt><dd>{project.outputAssets.length}/6</dd></div></dl><button className="primary-button" disabled={!project.productionMaster} onClick={resume}>Çalışmaya Devam Et →</button></article></section>;
}

function AccountSettings({ openHelp }: { openHelp: (section: string) => void }) {
  return <section className="flow-screen"><FlowHeader eyebrow="AYARLAR" title="Bağlantılar güvenli sunucu tarafında yönetilir." copy="Tarayıcıya Fal.ai anahtarı girilmez. Gerçek üretim Etsy Okulu hesabınız ve sunucuda şifrelenmiş kullanıcı bağlantınız üzerinden çalışacaktır." /><div className="flow-card account-card"><div><span>MOCKUP PROVIDER</span><h2>Demo Mode</h2><p>Real Fal.ai generation is not connected. Bu ekranda anahtar alanı yoktur; hiçbir anahtar URL, localStorage veya istemci koduna yazılmaz.</p></div><div><span>PRODUCTION CONTRACT</span><h2>Etsy Okulu Backend</h2><p>Sunucu kullanıcıyı doğrular, şifrelenmiş Fal.ai bağlantısını kullanır ve tarayıcıya yalnızca iş durumu ile güvenli çıktı URL'lerini döndürür.</p></div><button className="secondary-button" onClick={() => openHelp("fal-ai")}>Türkçe Bağlantı Kılavuzu</button></div></section>;
}

function normalizeProject(raw: Project) {
  const fallback = createDemoProject(raw.userId || DEMO_USER_ID, raw.projectSequenceNumber || 1);
  if (!raw.slots || raw.slots.length !== 6) return fallback;
  return { ...fallback, ...raw, prompt: { ...fallback.prompt, ...raw.prompt }, productionMaster: null, activeMasterVersionId: null, masterVersions: [], outputAssets: [], renderJobs: [], slots: fallback.slots, masterStatus: "AWAITING_UPLOAD" as const };
}

export default function StudioApp() {
  const [project, setProject] = useState<Project | null>(null); const [screen, setScreen] = useState<Screen>("home"); const [uploadMode, setUploadMode] = useState<UploadMode>("direct"); const [helpOpen, setHelpOpen] = useState(false); const [helpSection, setHelpSection] = useState<string | null>(null); const [rendering, setRendering] = useState(false); const [preview, setPreview] = useState<OutputAsset | null>(null); const [renderConfig, setRenderConfig] = useState<RuntimeRenderConfig | null>(null); const [renderConfigError, setRenderConfigError] = useState(""); const [remoteBatch, setRemoteBatch] = useState<MockupBatchStatus | null>(null); const [generationError, setGenerationError] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { try { const saved = localStorage.getItem(STORAGE_KEY); setProject(saved ? normalizeProject(JSON.parse(saved) as Project) : createDemoProject()); } catch { setProject(createDemoProject()); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { void getPublicRenderConfig().then((config) => { setRenderConfig(config); setRenderConfigError(""); }).catch(() => setRenderConfigError("Render provider configuration could not be loaded. Generation is disabled.")); }, []);
  useEffect(() => { if (!remoteBatch || ["completed", "failed"].includes(remoteBatch.status)) return; const timer = window.setTimeout(() => { void getMockupBatch(remoteBatch.jobId).then((batch) => { setRemoteBatch(batch); setProject((current) => current ? syncProductionBatch(current, batch) : current); }).catch((error) => setGenerationError(error instanceof Error ? error.message : "Mockup status could not be loaded.")); }, 2500); return () => window.clearTimeout(timer); }, [remoteBatch]);
  useEffect(() => { if (!project) return; const safe = { ...project, productionMaster: null, activeMasterVersionId: null, masterVersions: [], outputAssets: [], renderJobs: [], slots: createDemoProject(project.userId, project.projectSequenceNumber).slots, masterStatus: "AWAITING_UPLOAD" }; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); } catch { /* local persistence is optional */ } }, [project]);
  const update = (next: Project) => setProject({ ...next, updatedAt: new Date().toISOString() });
  const openHelp = (section = "hizli-baslangic") => { setHelpSection(section); setHelpOpen(true); };
  const startFresh = () => { if (!project) return; if (project.productionMaster && !window.confirm("Yeni bir çalışma başlatılsın mı? Mevcut demo oturumu sıfırlanacak.")) return; setProject(createDemoProject(DEMO_USER_ID, project.projectSequenceNumber + (project.productionMaster ? 1 : 0))); setScreen("home"); };
  const completeUpload = (next: Project) => { update(next); setScreen("settings"); };
  const render = async (ids: string[], sourceProject = project) => { if (!sourceProject?.productionMaster || rendering || !renderConfig) return; setRendering(true); setGenerationError(""); try { const qa = evaluateMasterQa(sourceProject, sourceProject.productionMaster, sourceProject.artworkAnalysis?.edgeMetrics); const approvedAt = new Date().toISOString(); const master = { ...sourceProject.productionMaster, approvedAt }; const prepared: Project = { ...sourceProject, qa, masterStatus: "APPROVED", productionMaster: master, masterVersions: sourceProject.masterVersions.map((item) => item.id === master.id ? master : item), artDirection: { ...sourceProject.artDirection, savedAt: sourceProject.artDirection.savedAt || approvedAt } }; if (renderConfig.provider === "fal") { const requestedIds = ids.slice(0, 1); const batch = await createMockupBatch(buildMockupBatchRequest(prepared, requestedIds)); const requested = requestRenderJobs(prepared, prepared.userId, requestedIds, "real"); const next = syncProductionBatch(requested.project, batch); update(next); setRemoteBatch(batch); setScreen("results"); return; } if (renderConfig.provider === "custom") { const batch = await createMockupBatch(buildMockupBatchRequest(prepared, ids)); const requested = requestRenderJobs(prepared, prepared.userId, ids, "real"); update(syncProductionBatch(requested.project, batch)); setRemoteBatch(batch); setScreen("results"); return; } const requested = requestRenderJobs(prepared, prepared.userId, ids, "mock"); let current = requested.project; update(current); setScreen("results"); for (const job of requested.jobs) { const output = await compositeOutput(current, job); current = completeRenderJob(current, job.jobId, output); update(current); } } catch (error) { setGenerationError(error instanceof Error ? error.message : "Mockup generation could not be started."); setScreen("results"); } finally { setRendering(false); } };
  const retry = async (slotId: string) => { if (!remoteBatch || rendering) return; setRendering(true); setGenerationError(""); try { const rejected = project?.outputAssets.some((asset) => asset.slotId === slotId && asset.rejected) ?? false; const batch = await retryMockupSlots(remoteBatch.jobId, { slotIds: [slotId], rejectedSlotIds: rejected ? [slotId] : [], idempotencyKey: `${remoteBatch.jobId}:${slotId}:retry:${Date.now()}` }); setRemoteBatch(batch); } catch (error) { setGenerationError(error instanceof Error ? error.message : "Mockup retry could not be started."); } finally { setRendering(false); } };
  const resumeScreen = useMemo<Screen>(() => project?.outputAssets.length ? "results" : project?.productionMaster ? "settings" : "home", [project]);
  if (!project || !renderConfig) return <div className="loading"><span>W</span><p>{renderConfigError || "Stüdyo ve render provider hazırlanıyor…"}</p></div>;
  return <div className="simple-app"><header className="simple-topbar"><button className="simple-brand" onClick={() => setScreen("home")}><span>W</span><strong>Wallpaper AI Studio<small>MOCKUP WORKSPACE</small></strong></button><div className="top-project"><small>{project.productionMaster ? "ACTIVE PROJECT" : "NEW WORKSPACE"}</small><b>{project.productionMaster ? project.projectName : "Choose how to begin"}</b></div><button className="new-button" onClick={startFresh}>＋ Yeni çalışma</button></header><div className="simple-shell"><aside className="simple-sidebar"><nav aria-label="Ana menü"><button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}><span>⌂</span>Ana Sayfa</button><button className={screen === "projects" ? "active" : ""} onClick={() => setScreen("projects")}><span>□</span>Projelerim</button><button onClick={() => openHelp()}><span>?</span>Kullanım Kılavuzu</button><button className={screen === "account" ? "active" : ""} onClick={() => setScreen("account")}><span>⚙</span>Ayarlar</button></nav><div className="mode-card"><b>Render Provider: {renderConfig.provider === "fal" ? "Fal" : renderConfig.provider === "custom" ? "Custom" : "Mock"}</b><span>{renderConfig.provider === "fal" ? renderConfig.configured ? "Real AI renderer" : "Missing FAL_KEY" : renderConfig.provider === "custom" ? "Production renderer" : "Development renderer"}</span></div></aside><main className="simple-main"><div className="simple-content">
    {screen === "home" && <section className="home-screen"><FlowHeader eyebrow="WALLPAPER AI STUDIO" title="Duvar kâğıdı çalışmanı nasıl başlatmak istersin?" copy="İster fikrini üretime hazır bir prompta dönüştür, ister elindeki tasarımla doğrudan mockup hazırlamaya başla." /><div className="start-options"><article><span>01 · IDEA TO ARTWORK</span><div className="option-icon">✦</div><h2>Prompt Oluştur</h2><p>Tema, stil, renk paleti ve motif seçimlerinle İngilizce bir Midjourney promptu hazırla.</p><button className="primary-button" onClick={() => setScreen("prompt")}>Prompt Oluşturmaya Başla →</button></article><article><span>02 · ARTWORK TO MOCKUP</span><div className="option-icon">↥</div><h2>Hazır Görsel Yükle</h2><p>Elindeki JPG, PNG veya WEBP tasarımı yükle; teknik bilgileri otomatik algılayalım.</p><button className="primary-button" onClick={() => { setUploadMode("direct"); setScreen("upload"); }}>Görsel Yükle →</button></article></div><div className="home-note"><b>Proje adı düşünmeniz gerekmez.</b><span>İlk görsel yüklendiğinde çalışma otomatik adlandırılır ve Projelerim alanından düzenlenebilir.</span></div></section>}
    {screen === "prompt" && <PromptBuilder project={project} update={update} onUpload={() => { setUploadMode("prompt"); setScreen("upload"); }} onBack={() => setScreen("home")} />}
    {screen === "upload" && <section className="flow-screen"><Progress screen="upload" /><FlowHeader eyebrow={uploadMode === "prompt" ? "PROMPT RESULT" : "READY ARTWORK"} title={uploadMode === "prompt" ? "Ürettiğiniz tasarımı ekleyin." : "Hazır tasarımınızı ekleyin."} copy="Kaynak görsel değişmeden korunur. Mockuplar aynı asset üzerine maske, perspektif ve ışık uygulanarak hazırlanır." /><SourceUpload project={project} mode={uploadMode} onComplete={completeUpload} onBack={() => setScreen(uploadMode === "prompt" ? "prompt" : "home")} /></section>}
    {screen === "settings" && project.productionMaster && <MockupSettings project={project} update={update} next={() => setScreen("confirm")} back={() => setScreen("upload")} />}
    {screen === "confirm" && project.productionMaster && <Confirmation project={project} back={() => setScreen("settings")} create={() => render(project.slots.map((slot) => slot.id))} falSmokeTest={renderConfig.provider === "fal"} />}
    {screen === "results" && <Results project={project} update={update} render={render} retry={retry} stages={Object.fromEntries((remoteBatch?.outputs ?? []).map((output) => [output.slotId, output.status]))} generationError={generationError} mode={renderConfig.mode} provider={renderConfig.provider} busy={rendering} openPreview={setPreview} openHelp={openHelp} />}
    {screen === "projects" && <Projects project={project} update={update} resume={() => setScreen(resumeScreen)} />}
    {screen === "account" && <AccountSettings openHelp={openHelp} />}
  </div></main></div>{preview && <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Büyük mockup önizlemesi"><button className="preview-scrim" aria-label="Önizlemeyi kapat" onClick={() => setPreview(null)} /><div><button aria-label="Önizlemeyi kapat" onClick={() => setPreview(null)}>×</button><img src={preview.fileUrl} alt={`${preview.role} büyük önizleme`} /><span>{preview.role} · {preview.productionReady ? "REAL AI SCENE TEST" : "DEMO OUTPUT"}</span></div></div>}<HelpGuide open={helpOpen} initialSection={helpSection} onClose={() => setHelpOpen(false)} /></div>;
}
