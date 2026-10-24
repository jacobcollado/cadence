// Opens a report with "How to read this" expanded. Usage: node scripts/glossary-shot.mjs <link file> <out png>
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const [file, out] = process.argv.slice(2);
const link = readFileSync(file, "utf8");
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:5173/r" + link.slice(link.indexOf("#")));
await page.waitForSelector(".hero-value");
await page.click("text=How to read this");
await page.waitForTimeout(800);
const el = await page.$("text=How to read this");
await el.scrollIntoViewIfNeeded();
await page.screenshot({ path: out, fullPage: true });
await b.close();
