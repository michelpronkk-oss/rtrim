/**
 * Export RunTrim X posts as individual 1600×900 PNGs.
 *
 * Usage:
 *   node scripts/export-x-posts.js
 *
 * Output: design_handoff_runtrim_brand/exports/post-01.png … post-08.png
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const HTML_FILE = path.resolve(__dirname, "../design_handoff_runtrim_brand/X Posts.html");
const OUT_DIR   = path.resolve(__dirname, "../design_handoff_runtrim_brand/exports");

const POST_IDS = ["p01","p02","p03","p04","p05","p06","p07","p08"];
const POST_W = 1600;
const POST_H = 900;

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Load the file at full desktop viewport so layout is stable
  await page.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`file://${HTML_FILE}`, { waitUntil: "networkidle0" });

  // Wait for Google Fonts to render (belt-and-suspenders)
  await new Promise(r => setTimeout(r, 1200));

  for (const id of POST_IDS) {
    const n = id.slice(1); // "01" … "08"
    const outPath = path.join(OUT_DIR, `post-${n}.png`);

    const el = await page.$(`#${id}`);
    if (!el) {
      console.warn(`  ! #${id} not found — skipping`);
      continue;
    }

    // Force the element to exactly 1600×900 before screenshotting
    await page.evaluate((elId) => {
      const el = document.getElementById(elId);
      el.style.width  = "1600px";
      el.style.height = "900px";
      el.style.overflow = "hidden";
    }, id);

    await el.screenshot({ path: outPath });
    console.log(`  ✓ post-${n}.png`);
  }

  await browser.close();
  console.log(`\nDone. PNGs saved to:\n  ${OUT_DIR}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
