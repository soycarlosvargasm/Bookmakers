import type { CDPSession, ConsoleMessage, Page, Request, Response } from "playwright";
import { redactSecrets, redactUrl } from "../health/logger.js";

export type NetworkDiagnostic = {
  kind: "request" | "response" | "requestfailed" | "console" | "pageerror";
  url?: string;
  method?: string;
  resourceType?: string;
  errorText?: string | null;
  status?: number | null;
  timing?: Record<string, number> | null;
  initiator?: Record<string, unknown> | null;
  headers?: Record<string, string>;
  message?: string;
  name?: string;
};

export type NetworkProbeResult = { host: string; ok: boolean; status: number | null; error?: string };

const SAFE_RESPONSE_HEADERS = new Set(["content-type", "cf-mitigated", "server", "www-authenticate", "access-control-allow-origin"]);

const safeHeaders = (headers: Record<string, string>): Record<string, string> => Object.fromEntries(
  Object.entries(headers).filter(([key]) => SAFE_RESPONSE_HEADERS.has(key.toLowerCase()))
);

const requestTiming = (request: Request): Record<string, number> | null => {
  const timing = request.timing();
  const values = Object.fromEntries(Object.entries(timing).filter(([, value]) => typeof value === "number" && Number.isFinite(value))) as Record<string, number>;
  return Object.keys(values).length ? values : null;
};

const consoleMessage = (message: ConsoleMessage): string => String(redactSecrets(message.text()));

export class BrowserNetworkDiagnostics {
  private readonly entries: NetworkDiagnostic[] = [];
  private readonly disposers: Array<() => void> = [];
  private cdp?: CDPSession;
  private readonly cdpRequests = new Map<string, { url: string; method: string; resourceType?: string; initiator?: object | null }>();

  constructor(private readonly hosts: readonly string[]) {}

  async attach(page: Page): Promise<void> {
    const hostSet = new Set(this.hosts.map((host) => host.toLowerCase()));
    const relevant = (url: string): boolean => {
      try { return hostSet.has(new URL(url).hostname.toLowerCase()); } catch { return false; }
    };
    const onRequest = (request: Request) => {
      if (!relevant(request.url())) return;
      this.entries.push({ kind: "request", url: redactUrl(request.url()), method: request.method(), resourceType: request.resourceType(), timing: requestTiming(request) });
    };
    const onResponse = (response: Response) => {
      if (!relevant(response.url())) return;
      this.entries.push({ kind: "response", url: redactUrl(response.url()), method: response.request().method(), resourceType: response.request().resourceType(), status: response.status(), headers: safeHeaders(response.headers()), timing: requestTiming(response.request()) });
    };
    const onRequestFailed = (request: Request) => {
      if (!relevant(request.url())) return;
      const cdp = [...this.cdpRequests.values()].reverse().find((item) => item.url === redactUrl(request.url()) && item.method === request.method());
      this.entries.push({ kind: "requestfailed", url: redactUrl(request.url()), method: request.method(), resourceType: request.resourceType(), errorText: request.failure()?.errorText ?? null, status: null, timing: requestTiming(request), initiator: cdp?.initiator ? cdp.initiator as Record<string, unknown> : null });
    };
    const onConsole = (message: ConsoleMessage) => this.entries.push({ kind: "console", message: consoleMessage(message) });
    const onPageError = (error: Error) => this.entries.push({ kind: "pageerror", message: String(redactSecrets(error.message)), name: error.name });
    page.on("request", onRequest);
    page.on("response", onResponse);
    page.on("requestfailed", onRequestFailed);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    this.disposers.push(() => page.off("request", onRequest), () => page.off("response", onResponse), () => page.off("requestfailed", onRequestFailed), () => page.off("console", onConsole), () => page.off("pageerror", onPageError));

    try {
      this.cdp = await page.context().newCDPSession(page);
      await this.cdp.send("Network.enable");
      const onWillBeSent = (event: { requestId: string; request: { url: string; method: string }; type?: string; initiator?: object }) => {
        if (!relevant(event.request.url)) return;
        this.cdpRequests.set(event.requestId, { url: redactUrl(event.request.url), method: event.request.method, resourceType: event.type, initiator: event.initiator ?? null });
      };
      const onResponseReceived = (event: { requestId: string; response: { url: string; status: number; headers?: Record<string, string> }; type?: string }) => {
        if (!relevant(event.response.url)) return;
        const request = this.cdpRequests.get(event.requestId);
        this.entries.push({ kind: "response", url: redactUrl(event.response.url), method: request?.method, resourceType: event.type ?? request?.resourceType, status: event.response.status, headers: safeHeaders(event.response.headers ?? {}), initiator: request?.initiator ? request.initiator as Record<string, unknown> : null });
      };
      const onLoadingFailed = (event: { requestId: string; errorText?: string; canceled?: boolean }) => {
        const request = this.cdpRequests.get(event.requestId);
        if (!request) return;
        this.entries.push({ kind: "requestfailed", url: request.url, method: request.method, resourceType: request.resourceType, errorText: event.errorText ?? null, status: null, initiator: request.initiator ? request.initiator as Record<string, unknown> : null });
      };
      this.cdp.on("Network.requestWillBeSent", onWillBeSent);
      this.cdp.on("Network.responseReceived", onResponseReceived);
      this.cdp.on("Network.loadingFailed", onLoadingFailed);
      this.disposers.push(() => {
        this.cdp?.off("Network.requestWillBeSent", onWillBeSent);
        this.cdp?.off("Network.responseReceived", onResponseReceived);
        this.cdp?.off("Network.loadingFailed", onLoadingFailed);
      });
    } catch {
      // CDP is optional; Playwright events still provide request/response data.
    }
  }

  async probeHosts(page: Page): Promise<NetworkProbeResult[]> {
    return page.evaluate(async (hosts) => Promise.all(hosts.map(async (host) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch(`https://${host}/`, { credentials: "omit", mode: "no-cors", cache: "no-store", signal: controller.signal });
        return { host, ok: true, status: response.type === "opaque" ? 0 : response.status };
      } catch (error) {
        return { host, ok: false, status: null, error: String(error) };
      } finally {
        window.clearTimeout(timeout);
      }
    })), [...this.hosts]);
  }

  snapshot(): NetworkDiagnostic[] { return this.entries.map((entry) => redactSecrets(entry) as NetworkDiagnostic); }

  stop(): void { for (const dispose of this.disposers.splice(0)) dispose(); void this.cdp?.detach().catch(() => undefined); this.cdp = undefined; }
}
