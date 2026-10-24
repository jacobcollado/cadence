// Opens report links in the app (which saves them), then compares them.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const links = process.argv.slice(2).map((f) => readFileSync(f, "utf8"));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:5173/");
await page.evaluate(() => localStorage.clear());
for (const l of links) {
  await page.goto("http://localhost:5173/r" + l.slice(l.indexOf("#")));
  await page.waitForSelector(".hero-value");
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "shots/report-last.png", fullPage: true });
await page.goto("http://localhost:5173/");
await page.waitForSelector(".run-row");
for (const c of await page.$$(".run-row .check")) await c.click();
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/home-selected.png" });
await page.click("text=Compare");
await page.waitForSelector(".group");
await page.waitForTimeout(1200);
const bar = await page.$$(".gbar-hit");
const box = await bar[3].boundingBox();
await page.mouse.move(box.x + 20, box.y + 5);
await page.waitForTimeout(300);
await page.screenshot({ path: "shots/compare.png", fullPage: true });
await b.close();
