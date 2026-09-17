import type { Project } from "../../lib/core/types.ts";

export interface ImageGenerationAdapter {
  readonly name: string;
  renderMockup(input: { userId: string; project: Project; slotId: string }): Promise<{ assetUrl: string }>;
}

export class DemoImageGenerationAdapter implements ImageGenerationAdapter {
  readonly name = "Demo renderer";
  async renderMockup(input: { userId: string; project: Project; slotId: string }) {
    if (input.userId !== input.project.userId) throw new Error("RESOURCE_NOT_FOUND");
    return { assetUrl: `demo://${input.project.id}/${input.slotId}` };
  }
}
