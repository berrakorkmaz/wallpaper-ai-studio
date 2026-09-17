import { createHmac, timingSafeEqual } from "node:crypto";

export interface StorageAdapter {
  put(input: { userId: string; key: string; data: Blob }): Promise<{ storageKey: string }>;
  get(input: { userId: string; key: string }): Promise<Blob | null>;
  createSignedDownload(input: { userId: string; key: string; expiresInSeconds: number; now?: number }): Promise<string>;
  resolveSignedDownload(input: { userId: string; signedUrl: string; now?: number }): Promise<Blob | null>;
}

export class SecureMemoryStorageAdapter implements StorageAdapter {
  private readonly files = new Map<string, Blob>();
  private readonly signingSecret: string;
  constructor(signingSecret = "development-only-memory-secret") { this.signingSecret = signingSecret; }
  private ownedKey(userId: string, key: string) { return `${userId}/${key.replace(/^\/+/, "")}`; }
  private signature(value: string) { return createHmac("sha256", this.signingSecret).update(value).digest("hex"); }
  async put(input: { userId: string; key: string; data: Blob }) { const storageKey = this.ownedKey(input.userId, input.key); this.files.set(storageKey, input.data); return { storageKey }; }
  async get(input: { userId: string; key: string }) { return this.files.get(this.ownedKey(input.userId, input.key)) ?? null; }
  async createSignedDownload(input: { userId: string; key: string; expiresInSeconds: number; now?: number }) {
    const expires = Math.floor((input.now ?? Date.now()) / 1000) + input.expiresInSeconds; const owned = this.ownedKey(input.userId, input.key); const payload = `${owned}:${expires}`; return `secure-memory://download?key=${encodeURIComponent(owned)}&expires=${expires}&signature=${this.signature(payload)}`;
  }
  async resolveSignedDownload(input: { userId: string; signedUrl: string; now?: number }) {
    const url = new URL(input.signedUrl); const key = url.searchParams.get("key") || ""; const expires = Number(url.searchParams.get("expires")); const signature = url.searchParams.get("signature") || "";
    if (!key.startsWith(`${input.userId}/`) || !Number.isFinite(expires) || Math.floor((input.now ?? Date.now()) / 1000) > expires) return null;
    const expected = this.signature(`${key}:${expires}`); if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return this.files.get(key) ?? null;
  }
}

export class DemoStorageAdapter extends SecureMemoryStorageAdapter {}
