import { TELEMETRY_BATCH_INTERVAL_MS } from "@shared/constants";
import type { TelemetryEvent, TelemetryBatch } from "@shared/types";
import { apiFetch } from "@/lib/api";

const queue: TelemetryEvent[] = [];

export function enqueueTelemetry(event: TelemetryEvent) {
  queue.push(event);
}

export async function flushTelemetry(sessionId: string) {
  const batch: TelemetryBatch = { sessionId, events: queue.splice(0) };

  if (!batch.events.length) {
    return null;
  }

  return apiFetch("/api/telemetry", {
    method: "POST",
    body: JSON.stringify(batch),
  });
}

export const telemetryBatchIntervalMs = TELEMETRY_BATCH_INTERVAL_MS;
