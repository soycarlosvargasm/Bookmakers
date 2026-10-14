import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { waitForChallengeClear, type ChallengeProgress } from "../src/engine/challenge.js";

async function until(read: () => boolean) {
  const deadline = Date.now() + 3_000;
  while (!read() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(read(), "The real browser input did not reach the challenge counter");
}

test("trusted clicks inside a cross-origin closed shadow challenge reach the counter", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const controller = new AbortController();
  let progress: ChallengeProgress | undefined;
  let waiting: Promise<void> | undefined;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.route("https://challenges.cloudflare.com/collector-fixture", route => route.fulfill({
      contentType: "text/html", body: `<div id="host"></div><script>
        const root = document.querySelector('#host').attachShadow({mode:'closed'});
        root.innerHTML = '<label style="display:block;padding:30px"><input type="checkbox">Local QA control</label>';
      </script>`,
    }));
    await page.route("https://sports.example/fixture", route => route.fulfill({ contentType: "text/html", body:
      `<h1>Verify you are human</h1><button>Unrelated control</button>
      <iframe src="https://challenges.cloudflare.com/collector-fixture" style="width:400px;height:120px"></iframe>` }));
    await page.goto("https://sports.example/fixture");
    await until(() => page.frames().some(frame => frame.url().includes("collector-fixture")));
    waiting = waitForChallengeClear(page, page.url(), controller.signal, 20, value => { progress = value; });
    // The first progress report follows installation in the existing frames.
    await until(() => progress !== undefined);
    await page.getByRole("button").click();
    assert.equal(progress!.manualAttempts, 0);
    const box = await page.locator("iframe").boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x + 50, box.y + 48);
    await until(() => progress?.manualAttempts === 1);
    await new Promise(resolve => setTimeout(resolve, 850));
    await page.mouse.click(box.x + 50, box.y + 48);
    await until(() => progress?.manualAttempts === 2);
    const secondAge = progress!.secondAttemptAgeMs;
    assert.equal(typeof secondAge, "number");
    // A replacement frame must keep counting without rearming the whole run.
    const frame = page.frames().find(frame => frame.url().includes("collector-fixture"))!;
    await frame.goto("https://challenges.cloudflare.com/collector-fixture");
    await new Promise(resolve => setTimeout(resolve, 850));
    await page.mouse.click(box.x + 50, box.y + 48);
    await until(() => progress?.manualAttempts === 3);
    assert.ok(progress!.secondAttemptAgeMs! >= 800);
    assert.ok(progress!.lastAttemptAgeMs! < 800);
    // Script-created presses are not manual attempts.
    await frame.evaluate(`document.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,button:0}))`);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(progress!.manualAttempts, 3);
    await new Promise(resolve => setTimeout(resolve, 850));
    await page.keyboard.press("Space");
    await until(() => progress?.manualAttempts === 4);
    assert.deepEqual(errors, []);
    await page.setContent("<h1>Sports board</h1>");
    await waiting;
    assert.deepEqual(await page.evaluate(`Object.keys(window).filter(key => key.startsWith('__collector_manual_attempt_'))`), []);
  } finally {
    controller.abort();
    await waiting?.catch(() => {});
    await browser.close();
  }
});
