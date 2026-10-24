// Drives the probe in headless Chromium and saves screenshots along the way.
import { chromium, devices } from "playwright";
const [url = "http://localhost:5173/demo.html", out = "shots", mode = "steady", device = "desktop"] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext(device === "phone" ? { ...devices["iPhone 13"], defaultBrowserType: undefined } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__cadence, null, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1-live.png` });
await page.evaluate((m) => window.__cadence.start(m), mode);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/2-running.png` });
await page.waitForFunction(() => {
  const root = document.querySelector("cadence-probe")?.shadowRoot;
  return root && root.querySelector(".big");
}, null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/3-result.png` });
const info = await page.evaluate(() => {
  const root = document.querySelector("cadence-probe").shadowRoot;
  return { sentence: root.querySelector(".sentence")?.textContent, rows: [...root.querySelectorAll(".bar-row")].map((r) => r.textContent) };
});
console.log(JSON.stringify(info, null, 1));
// Capture the report link without opening a tab.
const link = await page.evaluate(() => new Promise((res) => {
  window.open = (u) => res(u);
  const root = document.querySelector("cadence-probe").shadowRoot;
  [...root.querySelectorAll("button")].find((b) => b.textContent.includes("Open report")).click();
}));
console.log("link length", link.length);
(await import("node:fs")).writeFileSync(`${out}/link.txt`, link);
await browser.close();
