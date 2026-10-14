export type FailureKind = "auth_required" | "rate_limited" | "server_error" | "timeout" | "dns_failure" | "invalid_html" | "invalid_json" | "websocket_disconnect" | "browser_crash" | "database_unavailable" | "unknown";

export type ClassifiedFailure = { kind: FailureKind; message: string; retryable: boolean };

export const classifyFailure = (cause: unknown): ClassifiedFailure => {
  const message = cause instanceof Error ? cause.message : String(cause);
  const status = typeof cause === "object" && cause !== null && "status" in cause ? Number((cause as { status?: unknown }).status) : undefined;
  if (status === 401 || status === 403 || /auth|required|unauthori[sz]ed|forbidden/i.test(message)) return { kind: "auth_required", message, retryable: false };
  if (status === 429 || /429|rate.?limit|too many requests/i.test(message)) return { kind: "rate_limited", message, retryable: true };
  if (status !== undefined && status >= 500 || /\b(500|502|503|504)\b|server error/i.test(message)) return { kind: "server_error", message, retryable: true };
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return { kind: "timeout", message, retryable: true };
  if (/ENOTFOUND|EAI_AGAIN|DNS/i.test(message)) return { kind: "dns_failure", message, retryable: true };
  if (/invalid html|unexpected token.*html/i.test(message)) return { kind: "invalid_html", message, retryable: false };
  if (/invalid json|JSON\.parse|unexpected token/i.test(message)) return { kind: "invalid_json", message, retryable: false };
  if (/websocket|socket.*closed|disconnect/i.test(message)) return { kind: "websocket_disconnect", message, retryable: true };
  if (/browser.*(closed|crash)|target page.*closed/i.test(message)) return { kind: "browser_crash", message, retryable: true };
  if (/postgres|database|ECONNREFUSED/i.test(message)) return { kind: "database_unavailable", message, retryable: true };
  return { kind: "unknown", message, retryable: false };
};

