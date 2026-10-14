import { chromium, type BrowserContext, type Page } from "playwright";
import { resolve } from "node:path";
import type { DomNode, DomProfile } from "./extractor.js";

export async function launchPersistentChrome(): Promise<BrowserContext> {
  return chromium.launchPersistentContext(resolve(".engine/sessions/browser-profile"), {
    channel: "chrome",
    headless: false,
  });
}

export type DomBrowserOptions = {
  signal?: AbortSignal;
  renderWaitMs?: number;
  maxScrolls?: number;
  maxNodes?: number;
  maxDepth?: number;
  maxEvents?: number;
  rootSelector?: string;
  /** Keep only elements intersecting the current viewport: what the user actually sees. */
  viewportOnly?: boolean;
};

/** Read visible content only.  This is not an HTML dump and intentionally
 * excludes inputs, scripts, styles, and non-visible account/page chrome. */
export async function captureVisibleDom(page: Page, options: DomBrowserOptions = {}): Promise<DomNode> {
  const maxNodes = options.maxNodes ?? 3_000;
  const maxDepth = options.maxDepth ?? 10;
  // `tsx` decorates nested callbacks with a Node-only helper. Passing this
  // small, self-contained browser program as data prevents that helper from
  // crossing the Playwright serialization boundary.
  const program = `(() => {
    const limit = ${JSON.stringify(maxNodes)}; const depthLimit = ${JSON.stringify(maxDepth)};
    const rootSelector = ${JSON.stringify(options.rootSelector ?? null)};
    const viewportOnly = ${JSON.stringify(Boolean(options.viewportOnly))};
    let seen = 0;
    function visible(element) {
      const html = element;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      if (viewportOnly && !(rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth)) return false;
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    }
    function path(element) {
      const parts = [];
      let current = element;
      while (current && current !== document.body && parts.length < 64) {
        const parent = current.parentElement;
        const index = parent ? [...parent.children].indexOf(current) + 1 : 1;
        parts.unshift(current.tagName.toLowerCase() + ":" + index);
        current = parent;
      }
      return "body/" + parts.join("/");
    }
    function attrs(element) { return Object.fromEntries([...element.attributes]
      .filter((attribute) => /^(data-(?:(?:event|fixture|match|game|market|selection|outcome)(?:-(?:id|name))?|event-start|start-time|date|period|line|odds|testid|mu|li|b)|aria-label|role|id|title|datetime|href|class)$/i.test(attribute.name))
      .slice(0, 12)
      .map((attribute) => [attribute.name, attribute.value.slice(0, 160)])); }
    function walk(element, depth) {
      if (seen >= limit || depth > depthLimit || !visible(element) || /^(script|style|noscript|svg|path|input|textarea|select|option)$/i.test(element.tagName) || (rootSelector && element.matches("table.odds-table-responsive-header"))) return null;
      seen += 1;
      const children = [...element.children].map((child) => walk(child, depth + 1)).filter((child) => child !== null);
      const text = (rootSelector ? element.textContent : element.innerText)?.replace(/\\s+/g, " ").trim() ?? "";
      return { tag: element.tagName.toLowerCase(), text: text.slice(0, 8_000), path: path(element), attrs: attrs(element), children };
    }
    if (rootSelector) return { tag: "body", text: "", path: "body", children: [...document.querySelectorAll(rootSelector)].map((root) => walk(root, 0)).filter(Boolean) };
    return walk(document.body, 0) ?? { tag: "body", text: "", path: "body", children: [] };
  })()`;
  return page.evaluate((source) => (0, eval)(source) as DomNode, program);
}

/** Bounded scrolling reveals conventional lazy lists without interacting with
 * wager, account, or payment controls. */
export async function revealLazyContent(page: Page, options: DomBrowserOptions = {}): Promise<number> {
  options.signal?.throwIfAborted();
  const maxScrolls = Math.max(0, Math.min(options.maxScrolls ?? 6, 30));
  let scrolls = 0;
  let unchanged = 0;
  let previous = await page.evaluate(() => document.body.scrollHeight);
  for (; scrolls < maxScrolls && unchanged < 2; scrolls += 1) {
    options.signal?.throwIfAborted();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(350);
    options.signal?.throwIfAborted();
    const current = await page.evaluate(() => document.body.scrollHeight);
    unchanged = current <= previous ? unchanged + 1 : 0;
    previous = current;
  }
  return scrolls;
}

/** Profile selectors are optional.  They only identify a reproducible event
 * container; generic parsing remains responsible for semantic validation. */
export async function profileEventCount(page: Page, profile: DomProfile | null | undefined): Promise<number> {
  if (!profile?.eventSelector) return 0;
  try { return await page.locator(profile.eventSelector).count(); } catch { return 0; }
}
