const SECRET_KEY = /(password|passwd|secret|token|cookie|authorization|api[-_]?key|set-cookie)/i;
const SECRET_VALUE = /Bearer\s+[^\s]+|Basic\s+[^\s]+/gi;
const INLINE_SECRET = /((?:token|key|secret|password|passwd|cookie|authorization|api[-_]?key)[=:])[^&\s]+/gi;

export const redactUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.username = ""; url.password = "";
    for (const key of [...url.searchParams.keys()]) if (SECRET_KEY.test(key)) url.searchParams.set(key, "[REDACTED]");
    if (url.hash && SECRET_KEY.test(url.hash)) url.hash = "#[REDACTED]";
    return url.toString();
  } catch {
    return value;
  }
};

export const redactSecrets = (value: unknown): unknown => {
  if (typeof value === "string") return redactUrl(value).replace(SECRET_VALUE, "[REDACTED]").replace(INLINE_SECRET, "$1[REDACTED]");
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redactSecrets(item)]));
  }
  return value;
};

export type StructuredLog = {
  level?: "info" | "warn" | "error";
  connector?: string;
  sportsbook?: string;
  run?: string;
  eventsParsed?: number;
  marketsParsed?: number;
  quotesParsed?: number;
  duration?: number;
  errors?: unknown;
  [key: string]: unknown;
};

export const structuredLog = (entry: StructuredLog): string => JSON.stringify(redactSecrets({ timestamp: new Date().toISOString(), ...entry }));
