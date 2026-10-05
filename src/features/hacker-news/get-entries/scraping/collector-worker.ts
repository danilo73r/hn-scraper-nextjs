import { setTimeout as sleep } from "node:timers/promises";
import type { Entry } from "../entry";
import { collectWithRetries } from "./collect/collect-with-retries";
import { getRetryDelayMs } from "./collect/retry-policy";
import { ScrapingRequestError } from "./scraping-request-error";

const collectorCooldownMs = 60_000;

type CollectorStatus = "idle" | "waiting" | "collecting" | "cooldown";

export interface CollectorState {
  readonly status: CollectorStatus;
  readonly nextAllowedAt: number;
  readonly lastError: unknown;
}

export class CollectorWorker {
  private activeCollection: Promise<Entry[]> | undefined;
  private waiting = false;
  private nextAllowedAt = 0;
  private lastError: unknown = null;

  constructor(private readonly collect = collectWithRetries) {}

  get state(): CollectorState {
    return {
      status: this.getStatus(),
      nextAllowedAt: this.nextAllowedAt,
      lastError: this.lastError,
    };
  }

  requestCollection(): Promise<Entry[]> {
    if (this.activeCollection) return this.activeCollection;

    this.waiting = Date.now() < this.nextAllowedAt;

    // All callers share this operation, including its cooldown and retries.
    const operation = this.runCollection();
    this.activeCollection = operation.finally(() => {
      this.activeCollection = undefined;
    });
    return this.activeCollection;
  }

  private getStatus(): CollectorStatus {
    if (this.activeCollection) return this.waiting ? "waiting" : "collecting";
    if (Date.now() < this.nextAllowedAt) return "cooldown";
    return "idle";
  }

  private async runCollection(): Promise<Entry[]> {
    await this.waitForCooldown();
    try {
      const entries = await this.collect();
      this.lastError = null;
      this.nextAllowedAt = Date.now() + collectorCooldownMs;
      return entries;
    } catch (error) {
      this.lastError = error;
      const cooldownMs =
        error instanceof ScrapingRequestError
          ? (getRetryDelayMs(error) ?? collectorCooldownMs)
          : collectorCooldownMs;
      this.nextAllowedAt = Date.now() + cooldownMs;
      throw error;
    }
  }

  private async waitForCooldown(): Promise<void> {
    const remainingMs = this.nextAllowedAt - Date.now();
    if (remainingMs > 0) await sleep(remainingMs);
    this.waiting = false;
  }
}

// Store the worker on the process global so callers share the same instance.
// The type assertion declares the extra property; it does not create an object.
const processState = globalThis as typeof globalThis & {
  hackerNewsCollectorWorker?: CollectorWorker;
};

// Create the worker only if absent; otherwise return the existing instance.
export function getCollectorWorker(): CollectorWorker {
  return (processState.hackerNewsCollectorWorker ??= new CollectorWorker());
}
