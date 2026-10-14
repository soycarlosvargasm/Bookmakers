import type { CDPSession, Page, Response } from "playwright";
import type { RawPayloadSink } from "../collectors/raw.js";
import type { RawPayloadInput } from "../normalization/types.js";
import { MAX_RAW_BYTES, rawUrlAllowed } from "../collectors/raw-policy.js";
import { redactUrl } from "../health/logger.js";

export type BrowserObservationType = "dom" | "html" | "xhr" | "fetch" | "json" | "websocket" | "diffusion" | "sse";
export type BrowserObservation = RawPayloadInput & { observationType: BrowserObservationType };

export type BrowserObserverOptions = {
  sportsbook: string;
  accountAlias: string;
  parserVersion: string;
  sink?: RawPayloadSink;
};

const jsonContentType = (contentType: string): boolean => /application\/json|\+json/i.test(contentType);

export class BrowserObserver {
  private readonly disposers: Array<() => void> = [];
  private cdp?: CDPSession;
  private lastDiffusionAt?: number;

  constructor(private readonly options: BrowserObserverOptions) {}

  async attach(page: Page): Promise<void> {
    const onResponse = (response: Response) => {
      void this.captureResponse(response).catch(() => undefined);
    };
    page.on("response", onResponse);
    this.disposers.push(() => page.off("response", onResponse));

    // CDP preserves the actual WebSocket opcode. Playwright exposes binary
    // frames as strings, which made their encoding ambiguous in RAW storage.
    this.cdp = await page.context().newCDPSession(page);
    await this.cdp.send("Network.enable");
    const onFrame = (direction: "sent" | "received") => (event: { requestId: string; response: { opcode: number; mask: boolean; payloadData: string } }) => {
      if (direction === "sent") return;
      const frame = event.response;
      if (Buffer.byteLength(frame.payloadData) > MAX_RAW_BYTES) return;
      const encoding = frame.opcode === 2 ? "base64" : "utf8";
      const payload = frame.payloadData;
      this.lastDiffusionAt = Date.now();
      void this.save("diffusion", page.url(), {
        requestId: event.requestId,
        direction,
        opcode: frame.opcode,
        mask: frame.mask,
        payloadEncoding: encoding,
        payload
      }, {
        sourceRequestId: event.requestId,
        observationDirection: direction,
        sourceTopic: extractObservedTopic(payload, encoding),
        payloadSizeBytes: encoding === "base64" ? Buffer.from(payload, "base64").byteLength : Buffer.byteLength(payload)
      });
    };
    const onSent = onFrame("sent");
    const onReceived = onFrame("received");
    this.cdp.on("Network.webSocketFrameSent", onSent);
    this.cdp.on("Network.webSocketFrameReceived", onReceived);
    this.disposers.push(() => {
      this.cdp?.off("Network.webSocketFrameSent", onSent);
      this.cdp?.off("Network.webSocketFrameReceived", onReceived);
      void this.cdp?.detach().catch(() => undefined);
      this.cdp = undefined;
    });
  }

  async captureDom(page: Page): Promise<void> {
    const html = await page.content();
    await this.save("dom", page.url(), { html });
  }

  stop(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
  }

  hasRecentDiffusionActivity(maxAgeMs = 30_000): boolean {
    return this.lastDiffusionAt !== undefined && Date.now() - this.lastDiffusionAt <= maxAgeMs;
  }

  private async captureResponse(response: Response): Promise<void> {
    const request = response.request();
    const resourceType = request.resourceType();
    const contentType = response.headers()["content-type"] ?? "";
    const type: BrowserObservationType | undefined = resourceType === "xhr" ? "xhr" : resourceType === "fetch" ? "fetch" : resourceType === "eventsource" ? "sse" : undefined;
    if (!type || !rawUrlAllowed(this.options.sportsbook, response.url())) return;
    if (Number(response.headers()["content-length"] ?? 0) > MAX_RAW_BYTES) return;
    // Streaming SSE bodies are intentionally represented by response metadata;
    // reading them to completion would block a collector indefinitely.
    if (type === "sse") {
      await this.save(type, response.url(), { status: response.status(), contentType });
      return;
    }
    try {
      const body = await response.body();
      if (body.byteLength > MAX_RAW_BYTES) return;
      const text = body.toString("utf8");
      await this.save(jsonContentType(contentType) ? "json" : type, response.url(), {
        status: response.status(), contentType, body: text
      });
    } catch (error) {
      await this.save(type, response.url(), { status: response.status(), contentType, captureError: String(error) });
    }
  }

  private async save(observationType: BrowserObservationType, sourceUrl: string, rawPayload: unknown, metadata: Pick<RawPayloadInput, "sourceTopic" | "sourceRequestId" | "observationDirection" | "payloadSizeBytes"> = {}): Promise<void> {
    const payload: BrowserObservation = {
      observationType,
      sportsbook: this.options.sportsbook,
      accountAlias: this.options.accountAlias,
      sourceType: observationType,
      sourceUrl: redactUrl(sourceUrl),
      retrievedAt: new Date().toISOString(),
      providerTimestamp: null,
      externalEventId: null,
      rawPayload,
      parserVersion: this.options.parserVersion,
      ...metadata
    };
    await this.options.sink?.saveRawPayload(payload);
  }
}

const extractObservedTopic = (payload: string, encoding: "base64" | "utf8"): string | null => {
  const value = encoding === "base64" ? Buffer.from(payload, "base64").toString("utf8") : payload;
  // The topic is a printable protocol string found verbatim in observed
  // frames. Other binary fields remain opaque until documented by evidence.
  const match = value.match(/(?:c?\/)?rdd\/ui\/bol\/[A-Za-z0-9 ._()\-/]+/i);
  return match?.[0]?.replace(/\/+$/, "") ?? null;
};
