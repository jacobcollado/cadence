// Runs the probe on a live site by injecting it, with analytics blocked so
// tests don't count as visits. Usage: node scripts/site-test.mjs <url> <out> <mode> <desktop|phone>
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";
const [url = "https://byinertia.com/", out = "shots/site", mode = "steady", device = "desktop"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader=false"] });
const { defaultBrowserType, ...phone } = devices["iPhone 13"];
const ctx = await browser.newContext(device === "phone" ? phone : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.route(/i\.posthog\.com|connect\.facebook\.net|facebook\.com\/tr|va\.vercel-scripts|vercel-insights|\/ingest\//, (r) => r.abort());
const page = await ctx.newPage();
if (process.env.THROTTLE) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.THROTTLE) });
}
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "load" });
await page.addScriptTag({ path: "public/probe.js" });
await page.waitForFunction(() => window.__cadence);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}-1-live.png` });
await page.evaluate((m) => window.__cadence.start(m), mode);
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}-2-running.png` });
await page.waitForFunction(() => document.querySelector("cadence-probe")?.shadowRoot?.querySelector(".big"), null, { timeout: 180000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}-3-result.png` });
const info = await page.evaluate(() => {
  const root = document.querySelector("cadence-probe").shadowRoot;
  return { sentence: root.querySelector(".sentence")?.textContent, rows: [...root.querySelectorAll(".bar-row")].map((r) => r.textContent) };
});
console.log(JSON.stringify(info));
const link = await page.evaluate(() => new Promise((res) => {
  window.open = (u) => res(u);
  [...document.querySelector("cadence-probe").shadowRoot.querySelectorAll("button")].find((b) => b.textContent.includes("Open report")).click();
}));
writeFileSync(`${out}-link.txt`, link);
console.log("link length", link.length);
await browser.close();
