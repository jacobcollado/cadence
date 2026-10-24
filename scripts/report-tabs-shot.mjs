// Screenshots each report tab and the device panel. Usage: node scripts/report-tabs-shot.mjs <link file> <out dir> [phone]
import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";
const [file, out, phone] = process.argv.slice(2);
const link = readFileSync(file, "utf8");
const b = await chromium.launch();
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];
const page = await (await b.newContext(phone ? iphone : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
const tag = phone ? "phone" : "desk";
await page.goto("http://localhost:5173/r" + link.slice(link.indexOf("#")));
await page.waitForSelector(".tile");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/${tag}-smooth.png`, fullPage: true });
for (const [id, name] of [["load", "Page load"], ["memory", "Memory"]]) {
  await page.click(`.tile:has-text("${name}")`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${tag}-${id}.png`, fullPage: true });
}
console.log("url after tabs:", page.url().slice(0, 50));
await page.click("text=Device");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/${tag}-device.png` });
await b.close();
