import type { SportsbookConnector } from "./types.js";
import { classifyFailure, type FailureKind } from "../health/errors.js";

export type ConnectorRunResult =
  | { ok: true; connectorId: string; collection: Awaited<ReturnType<SportsbookConnector["collectEvents"]>> }
  | { ok: false; connectorId: string; error: Error; failureKind: FailureKind; retryable: boolean };

export class ConnectorRunner {
  async run(connector: SportsbookConnector, mode: "events" | "prematch" | "live"): Promise<ConnectorRunResult> {
    try {
      const method = mode === "events" ? connector.collectEvents : mode === "prematch" ? connector.collectPrematch : connector.collectLive;
      return { ok: true, connectorId: connector.id, collection: await method.call(connector) };
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const failure = classifyFailure(cause);
      return { ok: false, connectorId: connector.id, error, failureKind: failure.kind, retryable: failure.retryable };
    }
  }
}
