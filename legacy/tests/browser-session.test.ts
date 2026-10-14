import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BrowserManager } from "../src/browser/manager.js";
import { BrowserObserver } from "../src/browser/observer.js";
import { SessionManager } from "../src/sessions/manager.js";

test("browser manager reuses an account context and observer captures DOM as RAW", async () => {
  const root = await mkdtemp(join(tmpdir(), "sportsbook-browser-"));
  const browser = new BrowserManager({ headless: true, sessionStoragePath: root });
  const sessions = new SessionManager(root);
  const captured: unknown[] = [];
  const server = createServer((_request, response) => { response.end("<main>market data</main>"); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start test server");
  try {
    const page = await browser.getPage("book", "personal");
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.evaluate(() => window.sessionStorage.setItem("state", "private-value"));
    const observer = new BrowserObserver({ sportsbook: "book", accountAlias: "personal", parserVersion: "test", sink: {
      async saveRawPayload(payload) { captured.push(payload); }
    } });
    await observer.attach(page);
    await observer.captureDom(page);
    const samePage = await browser.getPage("book", "personal");
    assert.equal(samePage.context(), page.context());
    assert.equal((captured[0] as { sourceType: string }).sourceType, "dom");
    await sessions.saveStorageState("book", "personal", await page.context().storageState());
    await sessions.saveSessionStorage("book", "personal", await browser.captureSessionStorage(page));
    observer.stop();
  } finally {
    await browser.shutdown();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
