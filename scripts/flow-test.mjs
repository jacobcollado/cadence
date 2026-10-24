// The real loading flow on a local Inertia: ?perf turns the probe on, it
// survives navigation and reloads, closing it turns it off.
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch({ args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/i\.posthog\.com|connect\.facebook\.net|facebook\.com\/tr|va\.vercel-scripts|vercel-insights|\/ingest\//, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && /cadence|probe|Content Security/i.test(m.text()) && errors.push(m.text()));
const has = () => page.evaluate(() => !!window.__cadence && !!document.querySelector("cadence-probe"));
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(`${base}/`, { waitUntil: "load" }); await wait(2500);
console.log("plain visit, probe:", await has());
await page.goto(`${base}/?perf`, { waitUntil: "load" });
await page.waitForFunction(() => window.__cadence, null, { timeout: 90000 });
console.log("?perf visit, probe:", await has());
console.log("sections:", await page.evaluate(() => [...document.querySelector("cadence-probe").shadowRoot.querySelectorAll(".where span")].map((s) => s.textContent)));
await page.evaluate(() => window.__cadence.start("fast"));
await page.waitForFunction(() => document.querySelector("cadence-probe")?.shadowRoot?.querySelector(".big"), null, { timeout: 120000 });
console.log("fast run:", await page.evaluate(() => document.querySelector("cadence-probe").shadowRoot.querySelector(".sentence").textContent));
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => window.__cadence, null, { timeout: 90000 }).catch(() => {});
console.log("reload without ?perf, probe:", await has());
await page.evaluate(() => document.querySelector("a[href='/aether']")?.click() ?? history.pushState(null, "", "/aether"));
await wait(4000);
console.log("after client navigation to", await page.evaluate(() => location.pathname), "probe:", await has());
await page.evaluate(() => [...document.querySelector("cadence-probe").shadowRoot.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === "Close Cadence").click());
await wait(300);
console.log("after close, probe:", await has());
await page.reload({ waitUntil: "load" }); await wait(3000);
console.log("reload after close, probe:", await has());
console.log("errors:", errors.length ? errors : "none");
await b.close();
