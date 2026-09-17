export type OwnedRecord = { id: string; userId: string };

export function listOwned<T extends OwnedRecord>(records: readonly T[], userId: string): T[] {
  return records.filter((record) => record.userId === userId);
}

export function getOwned<T extends OwnedRecord>(records: readonly T[], userId: string, id: string): T | null {
  return records.find((record) => record.id === id && record.userId === userId) ?? null;
}

export function assertOwnership(record: OwnedRecord | null | undefined, userId: string): asserts record is OwnedRecord {
  if (!record || record.userId !== userId) throw new Error("RESOURCE_NOT_FOUND");
}
