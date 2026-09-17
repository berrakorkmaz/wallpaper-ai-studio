export interface StorageAdapter {
  put(input: { userId: string; key: string; data: Blob }): Promise<{ url: string }>;
  get(input: { userId: string; key: string }): Promise<Blob | null>;
}

export class DemoStorageAdapter implements StorageAdapter {
  private readonly files = new Map<string, Blob>();
  async put(input: { userId: string; key: string; data: Blob }) {
    const ownedKey = `${input.userId}/${input.key}`;
    this.files.set(ownedKey, input.data);
    return { url: `memory://${ownedKey}` };
  }
  async get(input: { userId: string; key: string }) {
    return this.files.get(`${input.userId}/${input.key}`) ?? null;
  }
}
