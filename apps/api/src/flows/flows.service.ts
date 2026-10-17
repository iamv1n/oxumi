import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { type Flow, type FlowIssue, parseFlow } from "@oxumi/flow-core";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AppConfig } from "../config";

export interface LoadedFlow {
  flow: Flow;
  issues: FlowIssue[];
}

// The JSON files in /flows are starting templates. An agent copies one when
// it is created and owns its flow from then on.
@Injectable()
export class FlowsService implements OnModuleInit {
  private flows = new Map<string, LoadedFlow>();

  constructor(private config: AppConfig) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const flows = new Map<string, LoadedFlow>();
    for (const file of (await fs.readdir(this.config.flowsDir)).sort()) {
      if (!file.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(this.config.flowsDir, file), "utf8");
      const loaded = parseFlow(JSON.parse(raw));
      flows.set(loaded.flow.id, loaded);
    }
    this.flows = flows;
  }

  list(): LoadedFlow[] {
    return [...this.flows.values()];
  }

  get(id: string): LoadedFlow {
    const loaded = this.flows.get(id);
    if (!loaded) throw new NotFoundException(`Flow "${id}" not found.`);
    return loaded;
  }
}
