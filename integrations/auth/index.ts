export type AuthUser = { id: string; name: string; email: string };

export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
}

export class DemoAuthAdapter implements AuthAdapter {
  async getCurrentUser() {
    return { id: "demo-user", name: "Demo Maker", email: "demo@example.invalid" };
  }
}
