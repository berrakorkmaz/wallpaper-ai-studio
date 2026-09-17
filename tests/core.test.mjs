import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { createDemoProject, changeProductType, refreshProjectName, updateMeasurements, validateProject } from "../lib/core/project.ts";
import { compilePrompt } from "../lib/core/prompt.ts";
import { getOwned, listOwned } from "../lib/core/ownership.ts";
import { MockEtsyAdapter, getOwnedEtsyConnection } from "../integrations/etsy/index.ts";
import { ZipExportAdapter } from "../integrations/export/index.ts";
import { publicConnectionView } from "../lib/server/ownership-repository.ts";

test("a user can only list and retrieve their own projects", () => {
  const records = [{ id: "a", userId: "user-a" }, { id: "b", userId: "user-b" }];
  assert.deepEqual(listOwned(records, "user-a"), [{ id: "a", userId: "user-a" }]);
  assert.equal(getOwned(records, "user-a", "b"), null);
});

test("seamless prompts contain --tile --ar 1:1", () => {
  assert.match(compilePrompt(createDemoProject()), /--tile --ar 1:1/);
});

test("mural dimensions reduce to the correct aspect ratio", () => {
  const project = updateMeasurements(changeProductType(createDemoProject(), "mural"), { width: 400, height: 250, unit: "cm" });
  assert.equal(project.calculatedAspectRatio, "8:5");
  assert.match(compilePrompt(project), /--ar 8:5/);
});

test("mural project validation blocks missing measurements", () => {
  const errors = validateProject(changeProductType(createDemoProject(), "mural"));
  assert.ok(errors.physicalWidth && errors.physicalHeight && errors.measurementUnit);
});

test("changing product type clears fields owned by the previous type", () => {
  const mural = changeProductType(createDemoProject(), "mural");
  assert.equal(mural.patternScale, null);
  const measured = updateMeasurements(mural, { width: 400, height: 250, unit: "cm" });
  const seamless = changeProductType(measured, "seamless");
  assert.equal(seamless.physicalWidth, null);
  assert.equal(seamless.physicalHeight, null);
  assert.equal(seamless.measurementUnit, null);
});

test("project name never changes listing title automatically", () => {
  const project = createDemoProject();
  const title = project.listing.title;
  const changed = refreshProjectName({ ...project, prompt: { ...project.prompt, theme: "Coastal" } });
  assert.notEqual(changed.projectName, project.projectName);
  assert.equal(changed.listing.title, title);
  assert.equal(changed.listing.useProjectNameAsTitleSuggestion, false);
});

test("manual project names are not overwritten", () => {
  const project = { ...createDemoProject(), projectName: "My private project", isProjectNameManuallyEdited: true };
  assert.equal(refreshProjectName({ ...project, prompt: { ...project.prompt, theme: "Coastal" } }).projectName, "My private project");
});

test("core application functions without an Etsy connection", () => {
  const project = createDemoProject();
  assert.ok(compilePrompt(project));
  assert.equal(project.listing.shopId, null);
});

test("ZIP export works without Etsy", async () => {
  const blob = await new ZipExportAdapter().exportProject(createDemoProject());
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files);
  assert.ok(names.some((name) => name.endsWith("project.json")));
  assert.ok(names.some((name) => name.includes("listing-content/title.txt")));
  assert.ok(names.filter((name) => name.includes("mockups/") && name.endsWith(".txt")).length >= 6);
});

test("mock Etsy adapter makes no real API request", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("network should not be called"); };
  try {
    const project = createDemoProject();
    await new MockEtsyAdapter().createDraft({ userId: project.userId, project, listing: project.listing, idempotencyKey: "no-network" });
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("draft creation is idempotent and a double click creates one listing", async () => {
  const project = createDemoProject();
  const adapter = new MockEtsyAdapter();
  const input = { userId: project.userId, project, listing: project.listing, idempotencyKey: "same-operation" };
  const [first, second] = await Promise.all([adapter.createDraft(input), adapter.createDraft(input)]);
  assert.equal(first.externalId, second.externalId);
  assert.equal(first.state, "draft");
});

test("one user cannot access another user's Etsy connection", () => {
  const connections = [{ id: "connection-a", userId: "user-a", shopId: "shop-a", encryptedAccessToken: "cipher", encryptedRefreshToken: "cipher", expiresAt: new Date().toISOString() }];
  assert.equal(getOwnedEtsyConnection(connections, "user-b", "connection-a"), null);
});

test("token fields are excluded from public connection responses", () => {
  const safe = publicConnectionView({ id: "connection-a", shopId: "shop-a", expiresAt: "2028-01-01" });
  assert.deepEqual(Object.keys(safe), ["id", "shopId", "expiresAt"]);
  assert.doesNotMatch(JSON.stringify(safe), /token|secret/i);
});

test("the default project exposes six independent mockup roles", () => {
  const project = createDemoProject();
  assert.equal(project.slots.length, 6);
  assert.equal(new Set(project.slots.map((slot) => slot.role)).size, 6);
});
