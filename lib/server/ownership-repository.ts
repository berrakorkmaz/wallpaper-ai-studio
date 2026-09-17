type QueryResult<T> = { results?: T[] };
type Statement<T> = { bind: (...values: unknown[]) => Statement<T>; first: () => Promise<T | null>; all: () => Promise<QueryResult<T>> };
export type Database = { prepare: <T>(sql: string) => Statement<T> };

export async function listProjectsForUser<T>(db: Database, userId: string) {
  const result = await db.prepare<T>("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC").bind(userId).all();
  return result.results ?? [];
}

export async function getProjectForUser<T>(db: Database, userId: string, projectId: string) {
  return db.prepare<T>("SELECT * FROM projects WHERE id = ? AND user_id = ?").bind(projectId, userId).first();
}

export async function getAssetForUser<T>(db: Database, userId: string, assetId: string) {
  return db.prepare<T>("SELECT * FROM design_assets WHERE id = ? AND user_id = ?").bind(assetId, userId).first();
}

export async function getListingDraftForUser<T>(db: Database, userId: string, listingDraftId: string) {
  return db.prepare<T>("SELECT * FROM listing_drafts WHERE id = ? AND user_id = ?").bind(listingDraftId, userId).first();
}

export async function getEtsyConnectionForUser<T>(db: Database, userId: string, connectionId: string) {
  return db.prepare<T>("SELECT * FROM etsy_connections WHERE id = ? AND user_id = ?").bind(connectionId, userId).first();
}

export function publicConnectionView(connection: { id: string; shopId: string; expiresAt: string }) {
  return { id: connection.id, shopId: connection.shopId, expiresAt: connection.expiresAt };
}
