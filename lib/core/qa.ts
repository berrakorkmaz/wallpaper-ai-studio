import type { DesignAsset, MasterQa, Project, QaCheck } from "./types.ts";

const supported = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);
const check = (key: string, label: string, ok: boolean, pass: string, fail: string, severity: "fail" | "warn" = "fail"): QaCheck => ({ key, label, status: ok ? "pass" : severity, detail: ok ? pass : fail });

export function evaluateMasterQa(project: Project, asset: DesignAsset, edgeMetrics?: { horizontal: number; vertical: number; motifCutRisk: boolean }): MasterQa {
  const requiredWidth = Math.max(project.requiredPixelWidth, project.productType === "seamless" ? 3000 : 1);
  const requiredHeight = Math.max(project.requiredPixelHeight, project.productType === "seamless" ? 3000 : 1);
  const sourceRatio = asset.width / asset.height;
  const targetRatio = project.productType === "seamless" ? 1 : (project.physicalWidth || 1) / (project.physicalHeight || 1);
  const ratioOk = Math.abs(sourceRatio - targetRatio) / targetRatio <= .025;
  const resolutionOk = asset.width >= requiredWidth && asset.height >= requiredHeight;
  const integrityOk = /^[a-f0-9]{64}$/i.test(asset.fileHash);
  const checks: QaCheck[] = [
    check("file-type", "File type", supported.has(asset.mimeType), asset.mimeType, "Use JPG, PNG or WebP."),
    check("pixels", "Pixel dimensions", resolutionOk, `${asset.width} × ${asset.height} meets the profile.`, `Needs ${requiredWidth} × ${requiredHeight}; source is ${asset.width} × ${asset.height}.`),
    check("aspect", "Aspect ratio", ratioOk, `${sourceRatio.toFixed(3)} matches the target.`, `Source ${sourceRatio.toFixed(3)} does not match target ${targetRatio.toFixed(3)}.`),
    check("profile", "Color profile", asset.colorProfile === "sRGB", asset.colorProfile, "Browser could not confirm sRGB; normalize during real render.", "warn"),
    check("size", "File size", asset.fileSize > 0 && asset.fileSize <= 250 * 1024 * 1024, `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB`, "File is empty or exceeds 250 MB."),
    check("alpha", "Transparency", true, asset.hasTransparency ? "Transparency detected and preserved." : "No transparency detected.", ""),
    check("integrity", "Source integrity", integrityOk, `SHA-256 ${asset.fileHash.slice(0, 12)}…`, "Source hash is invalid."),
  ];
  if (project.productType === "seamless") {
    const horizontalOk = edgeMetrics ? edgeMetrics.horizontal <= 20 : false; const verticalOk = edgeMetrics ? edgeMetrics.vertical <= 20 : false;
    checks.push(check("repeat-x", "Horizontal continuity", horizontalOk, "Left and right edges are within tolerance.", "Horizontal seam risk detected."));
    checks.push(check("repeat-y", "Vertical continuity", verticalOk, "Top and bottom edges are within tolerance.", "Vertical seam risk detected."));
    checks.push(check("motif", "Motif continuity", !edgeMetrics?.motifCutRisk, "No dominant edge break detected.", "Review motifs crossing tile boundaries.", "warn"));
  } else {
    checks.push(check("edge-safe", "Edge-safe composition", ratioOk, "Crop stays within the mural ratio.", "Critical content may be cropped."));
    checks.push(check("panels", "Panel boundaries", asset.width >= requiredWidth, "Panel profile can be derived from source pixels.", "Not enough horizontal pixels for the selected wall."));
  }
  const hasFailure = checks.some((item) => item.status === "fail");
  const score = Math.max(0, Math.round(checks.reduce((sum, item) => sum + (item.status === "pass" ? 100 : item.status === "warn" ? 60 : 0), 0) / checks.length));
  return { status: hasFailure ? "QA_FAILED" : "QA_PASSED", score, checks, requiredWidth, requiredHeight, missingWidth: Math.max(0, requiredWidth - asset.width), missingHeight: Math.max(0, requiredHeight - asset.height), upscaleRequired: !resolutionOk };
}
