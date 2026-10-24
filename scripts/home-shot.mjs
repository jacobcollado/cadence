// Saves a few runs, then screenshots the home page. Usage: node scripts/home-shot.mjs <out dir> <link files...>
import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";
const [out, ...files] = process.argv.slice(2);
const b = await chromium.launch();
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];
for (const [tag, opts] of [["desk", { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }], ["phone", iphone]]) {
  for (const theme of ["light", "dark"]) {
    const ctx = await b.newContext(opts);
    await ctx.addInitScript((t) => localStorage.setItem("cadence.theme", t), theme);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    for (const f of files) {
      const l = readFileSync(f, "utf8");
      await page.goto("http://localhost:5173/r" + l.slice(l.indexOf("#")));
      await page.waitForSelector(".tile");
    }
    await page.goto("http://localhost:5173/");
    await page.waitForSelector(".run-row");
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${tag}-${theme}.png`, fullPage: true });
    await page.hover(".run-row");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-${theme}-hover.png`, fullPage: true });
    await ctx.close();
  }
}
await b.close();
