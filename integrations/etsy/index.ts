import type { EtsyConnection } from "../../lib/core/types.ts";
import type { MarketplaceAdapter, MarketplaceDraftResult } from "../marketplace/types.ts";

const mockDrafts = new Map<string, string>();

export class MockEtsyAdapter implements MarketplaceAdapter {
  readonly name = "Mock Etsy";
  readonly enabled = true;

  async createDraft(input: Parameters<MarketplaceAdapter["createDraft"]>[0]): Promise<MarketplaceDraftResult> {
    if (input.userId !== input.project.userId || input.userId !== input.listing.userId) throw new Error("RESOURCE_NOT_FOUND");
    const existing = mockDrafts.get(input.idempotencyKey);
    if (existing) return { externalId: existing, state: "draft" };
    const externalId = `MOCK-${Math.floor(10000000 + Math.random() * 89999999)}`;
    mockDrafts.set(input.idempotencyKey, externalId);
    return { externalId, state: "draft" };
  }
}

export function getOwnedEtsyConnection(connections: readonly EtsyConnection[], userId: string, connectionId: string) {
  return connections.find((connection) => connection.id === connectionId && connection.userId === userId) ?? null;
}

export class EtsyAdapter implements MarketplaceAdapter {
  readonly name = "Etsy";
  readonly enabled = false;

  async createDraft(): Promise<MarketplaceDraftResult> {
    throw new Error("ETSY_ADAPTER_NOT_CONFIGURED");
  }
}
