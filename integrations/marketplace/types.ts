import type { ListingDraft, Project } from "../../lib/core/types.ts";

export type MarketplaceDraftResult = { externalId: string; state: "draft" };

export interface MarketplaceAdapter {
  readonly name: string;
  readonly enabled: boolean;
  createDraft(input: { userId: string; project: Project; listing: ListingDraft; idempotencyKey: string }): Promise<MarketplaceDraftResult>;
}
