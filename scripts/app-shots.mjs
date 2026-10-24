// Screenshots of the app pages, desktop and phone.
import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";
const out = process.argv[2] ?? "shots";
const link = readFileSync(`${out}/link.txt`, "utf8");
const hash = link.slice(link.indexOf("#"));
const browser = await chromium.launch();
for (const [name, opts] of [["desk", { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }], ["phone", { ...devices["iPhone 13"] }]]) {
  const { defaultBrowserType, ...o } = opts;
  const page = await (await browser.newContext(o)).newPage();
  page.on("pageerror", (e) => console.log(name, "pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log(name, "console:", m.text()));
  await page.goto(`http://localhost:5173/r${hash}`);
  await page.waitForSelector(".tile");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-report.png`, fullPage: true });
  const tl = await page.$(".timeline");
  const box = await tl.boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + 80);
  await page.waitForTimeout(300);
  await tl.screenshot({ path: `${out}/${name}-hover.png` });
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-home.png`, fullPage: true });
}
await browser.close();
