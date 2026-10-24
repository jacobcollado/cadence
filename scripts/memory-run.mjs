// Records a demo run with precise memory and a deliberate leak, so the memory chart has something to show.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const out = process.argv[2] ?? "shots/mem-link.txt";
const b = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:5173/demo.html");
await page.waitForFunction(() => window.__cadence);
await page.evaluate(() => { const keep = []; setInterval(() => keep.push(new Array(200000).fill(Math.random())), 100); });
await page.evaluate(() => window.__cadence.start("steady"));
await page.waitForFunction(() => document.querySelector("cadence-probe")?.shadowRoot?.querySelector(".big"), null, { timeout: 60000 });
const link = await page.evaluate(() => new Promise((res) => {
  window.open = (u) => res(u);
  [...document.querySelector("cadence-probe").shadowRoot.querySelectorAll("button")].find((x) => x.textContent.includes("Open report")).click();
}));
writeFileSync(out, link);
await b.close();
