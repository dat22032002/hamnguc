#!/usr/bin/env node
/* tools/screenshot.js — chụp màn chiến đấu solo bằng Playwright (Node):  node tools/screenshot.js out.png [rộng=1280] [cao=720] [class=knight|mage|cleric]
   Cần playwright cho Node (nếu thiếu: NODE_PATH=$(npm root -g) node tools/screenshot.js ...). In ra lỗi JS + class "hl" có bật không. */
const { chromium } = require("playwright"), path = require("path");
const [out, w = 1280, h = 720, cls = "knight"] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: +w, height: +h } }), errs = [];
  p.on("pageerror", e => errs.push(String(e)));
  await p.goto("file://" + path.join(__dirname, "..", "index.html"));
  await p.evaluate(c => localStorage.setItem("rpgClass", c), cls); await p.reload(); await p.waitForTimeout(400);
  await p.click("#m-play"); await p.click("#c-ok"); await p.click("#m-solo"); await p.waitForTimeout(1800);
  await p.screenshot({ path: out });
  console.log("hl:", await p.evaluate(() => document.getElementById("game").classList.contains("hl")), "· lỗi JS:", JSON.stringify(errs));
  await b.close();
})();
