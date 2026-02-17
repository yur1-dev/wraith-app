import type { Node } from "@xyflow/react";

export class WaitExecutor {
  constructor(private node: Node) {}

  async execute(context: Record<string, any> = {}): Promise<any> {
    const duration = (this.node.data.duration as number) || 60;
    const unit = (this.node.data.unit as string) || "seconds";

    let milliseconds = duration * 1000;

    if (unit === "minutes") {
      milliseconds = duration * 60 * 1000;
    } else if (unit === "hours") {
      milliseconds = duration * 60 * 60 * 1000;
    }

    // Add randomization if enabled
    if (this.node.data.randomize) {
      const variance = ((this.node.data.randomRange as number) || 10) / 100;
      const randomFactor = 1 + (Math.random() * 2 - 1) * variance;
      milliseconds = Math.floor(milliseconds * randomFactor);
    }

    console.log(`⏳ Waiting for ${milliseconds / 1000} seconds...`);

    await new Promise((resolve) => setTimeout(resolve, milliseconds));

    return {
      success: true,
      waited: milliseconds / 1000,
      unit: "seconds",
    };
  }
}
