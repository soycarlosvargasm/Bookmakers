import type { Frame, Page } from "playwright";
import { randomUUID } from "node:crypto";

const BODY_PATTERN = /(?:complete|solve|enter|verify)[^\n]{0,60}captcha|captcha (?:challenge|required)|verify (?:you are|that you(?:'re| are)) (?:a )?human|security verification|two[- ]factor|2fa|one[- ]time (?:code|password)|cf-chl-|just a moment|checking your browser|complete the security check|unusual traffic|additional verification|authentication required|access denied|sign in to continue|log in to continue|too many requests|rate limit exceeded/i;
const FRAME_PATTERN = /(?:google\.com\/recaptcha|recaptcha\.net|hcaptcha\.com|challenges\.cloudflare\.com|turnstile)/i;
const URL_PATTERN = /(?:^|\/)(?:captcha|challenge|verification|verify(?:-human|-identity)?|security-check|two-factor|2fa|login|sign-in)(?:\/|$|[?#-])/i;
const STATUS = new Set([401, 403, 429]);

export type ChallengeDetection = { reason: string; url: string };
export type ChallengeProgress = { blockedForMs: number; reappearances: number; manualAttempts?: number; lastAttemptAgeMs?: number; secondAttemptAgeMs?: number };

const verificationUrl = (url: string, requestedUrl?: string): boolean => {
  try {
    const candidate = new URL(url);
    if (!URL_PATTERN.test(candidate.pathname)) return false;
    return !requestedUrl || candidate.href !== new URL(requestedUrl).href;
  } catch { return false; }
};

export function detectHttpChallenge(status: number, url: string, body: string, requestedUrl?: string): ChallengeDetection | null {
  if (verificationUrl(url, requestedUrl)) return { reason: `Redirect to verification page (HTTP ${status})`, url };
  if (FRAME_PATTERN.test(body) && /<iframe\b/i.test(body)) return { reason: `Challenge iframe (HTTP ${status})`, url };
  if (BODY_PATTERN.test(body.slice(0, 16_000))) return { reason: `Challenge content (HTTP ${status})`, url };
  if (STATUS.has(status) && /verify|challenge|security|rate.?limit|too many requests|authentication required|sign in|log in/i.test(body.slice(0, 16_000)))
    return { reason: `HTTP ${status} verification required`, url };
  return null;
}

export async function detectPageChallenge(page: Page, status?: number, requestedUrl?: string): Promise<ChallengeDetection | null> {
  const url = page.url();
  if (verificationUrl(url, requestedUrl)) return { reason: `Redirect to verification page${status ? ` (HTTP ${status})` : ""}`, url };
  const iframe = page.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"]');
  for (let index = 0, count = await iframe.count().catch(() => 0); index < count; index++)
    if (await iframe.nth(index).isVisible().catch(() => false)) return { reason: "Challenge iframe", url };
  for (const frame of page.frames().filter((frame) => FRAME_PATTERN.test(frame.url()))) {
    const element = await frame.frameElement().catch(() => null);
    if (!element) continue;
    const visible = await element.isVisible().catch(() => false);
    await element.dispose().catch(() => undefined);
    if (visible) return { reason: "Challenge frame", url };
  }
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  return detectHttpChallenge(status ?? 200, url, body, requestedUrl);
}

/** Observes the visible page only. It never reloads, submits, or solves a challenge. */
export async function waitForChallengeClear(page: Page, requestedUrl: string, signal: AbortSignal, intervalMs = 1_000, onProgress?: (progress: ChallengeProgress) => void): Promise<void> {
  let cleanChecks = 0;
  let reappearances = 0;
  let manualAttempts = 0, lastAttemptAt = 0, secondAttemptAt = 0, observing = true;
  const started = Date.now();
  // Observe real user pointer presses only. Cloudflare's parent page can remain
  // "Verify you are human" throughout every retry; a clean body is not required.
  // No checkbox is clicked, no token is read, and no verification is submitted.
  const binding = `__collector_manual_attempt_${randomUUID().replaceAll("-", "")}`;
  const marker = `${binding}_installed`;
  const releases: Array<() => Promise<unknown>> = [];
  // A literal script also avoids Node-only helpers inserted by transpilers
  // when functions are serialized for evaluate/addInitScript.
  const observe = String.raw`(() => {
    const binding = ${JSON.stringify(binding)}, marker = ${JSON.stringify(marker)};
    if (window[marker]) return;
    const pressed = event => {
      if (!event.isTrusted) return;
      if (event.type === 'pointerdown' ? event.button !== 0 : event.repeat || ![' ', 'Enter'].includes(event.key)) return;
      const challengeFrame = /challenges\.cloudflare\.com|(?:google\.com|recaptcha\.net)\/recaptcha|hcaptcha\.com/i.test(location.href);
      const path = event.composedPath();
      const challengeControl = path.some(target => target instanceof Element && target.matches('input[type="checkbox"], [role="checkbox"], label, #challenge-stage, .cf-turnstile'));
      // In a closed shadow root event.target is the host, not the checkbox.
      // A trusted press in the challenge frame still records manual activity.
      if (challengeFrame || (challengeControl && /verify.*human|security verification|just a moment|checking your browser/i.test(document.body?.innerText ?? ''))) {
        void window[binding]?.().catch(() => {});
      }
    };
    document.addEventListener('pointerdown', pressed, true);
    document.addEventListener('keydown', pressed, true);
    window[marker] = () => {
      document.removeEventListener('pointerdown', pressed, true);
      document.removeEventListener('keydown', pressed, true);
      delete window[marker];
    };
  })()`;
  const install = (frame: Frame) => {
    if (observing && !signal.aborted) void frame.evaluate(observe).catch(() => {});
  };
  try {
    if (typeof page.exposeBinding === "function" && typeof page.addInitScript === "function") {
      try {
        const exposed = await page.exposeBinding(binding, () => {
          if (!observing || signal.aborted || Date.now() - lastAttemptAt < 800) return;
          manualAttempts++; lastAttemptAt = Date.now();
          if (manualAttempts === 2) secondAttemptAt = lastAttemptAt;
        });
        if (exposed?.dispose) releases.push(() => exposed.dispose());
        const initialized = await page.addInitScript({ content: observe });
        if (initialized?.dispose) releases.push(() => initialized.dispose());
        page.on?.("frameattached", install);
        page.on?.("framenavigated", install);
        await Promise.all(page.frames().map(frame => frame.evaluate(observe).catch(error => {
          if (!frame.isDetached()) console.warn("Challenge input observer could not attach to a frame:", String(error));
        })));
      } catch (error) { console.warn("Challenge input observer could not start:", String(error)); }
    }
  while (!signal.aborted) {
    if (page.isClosed()) throw new Error("Visible browser page was closed during human intervention");
    const clear = page.url() !== "about:blank" && !(await detectPageChallenge(page, undefined, requestedUrl));
    if (!clear && cleanChecks > 0) reappearances++;
    cleanChecks = clear ? cleanChecks + 1 : 0;
    if (cleanChecks >= 2) return;
    if (!clear) onProgress?.({ blockedForMs: Date.now() - started, reappearances, manualAttempts, lastAttemptAgeMs: lastAttemptAt ? Date.now() - lastAttemptAt : undefined, secondAttemptAgeMs: secondAttemptAt ? Date.now() - secondAttemptAt : undefined });
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, intervalMs);
      function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }
      signal.addEventListener("abort", done, { once: true });
    });
  }
  throw new Error("Human intervention cancelled");
  } finally {
    observing = false;
    page.off?.("frameattached", install);
    page.off?.("framenavigated", install);
    await Promise.all(page.frames().map(frame => frame.evaluate(`window[${JSON.stringify(marker)}]?.()`).catch(() => {})));
    for (const release of releases.reverse()) await release().catch(() => {});
  }
}
