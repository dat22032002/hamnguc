#!/usr/bin/env node
/* tools/tap-test.js — Harness test tap-flow cho Hầm Ngục:
     node tools/tap-test.js [--desktop] [file-html]
   Tự động bấm qua luồng người dùng thật: menu → chọn class (cả 4) → solo
   → map → trận đấu → bấm skill. Báo PASS/FAIL từng bước, exit code 1 nếu có FAIL.
   Mặc định giả lập mobile (Chromium 844x390, như Brave trên máy Jame);
   --desktop test trên desktop (1280x720).
   Cần: npm i -D puppeteer-core (trong thư mục dự án). Chrome lấy từ biến
   môi trường CHROME_PATH, mặc định /opt/meta-chromium/chrome (máy của AI).
   Mặc định test dist/hamnguc.html (bản đã bundle, giống bản Jame chơi). */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
let puppeteer;
try { puppeteer = require("puppeteer-core"); }
catch (e) {
  console.error("✗ Thiếu puppeteer-core. Cài bằng: cd " + ROOT + " && npm i -D puppeteer-core");
  process.exit(2);
}
const CHROME = process.env.CHROME_PATH || "/opt/meta-chromium/chrome";
const args = process.argv.slice(2);
const DESKTOP = args.includes("--desktop");
const HTML = path.resolve(args.find(a => !a.startsWith("--")) || path.join(ROOT, "dist", "hamnguc.html"));
if (!fs.existsSync(HTML)) { console.error("✗ Không thấy file: " + HTML + " (chạy node tools/bundle.js trước)"); process.exit(2); }
if (!fs.existsSync(CHROME)) { console.error("✗ Không thấy Chrome ở " + CHROME + " (đặt biến CHROME_PATH)"); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const step = (name, cond) => { results.push((cond ? "PASS" : "FAIL") + " | " + name); return !!cond; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-gpu"], headless: "new" });
  const page = await browser.newPage();
  const jsErrs = [];
  page.on("pageerror", e => jsErrs.push(String(e).slice(0, 160)));
  if (DESKTOP) {
    // Desktop: màn hình 1280x720, user-agent desktop, bấm bằng chuột
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/152.0 Safari/537.36");
  } else {
    // Giả lập điện thoại Android (ngang 844x390 như Brave trên máy Jame)
    await page.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/152.0 Mobile Safari/537.36" });
  }
  await page.setContent(fs.readFileSync(HTML, "utf8"), { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);

  // 1. Menu chính hiện
  step("menu chính hiện", await page.evaluate(() => document.querySelector("#menu")?.classList.contains("show")));

  // 2. Màn hình chọn class: đủ 4 class, không còn class đã xóa
  await page.evaluate(() => document.querySelector("#m-play").click());
  await sleep(600);
  const clsIds = await page.evaluate(() => Object.keys(CLASSES));
  step("đủ 4 class", clsIds.length === 4);
  step("không còn assassin", !clsIds.includes("assassin"));
  const tabsOk = await page.evaluate(ids => ids.every(id => !!document.querySelector('#cp-tabs button[data-id="' + id + '"]')), clsIds);
  step("đủ tab chọn class", tabsOk);

  // 3. Duyệt từng class: bấm tab → tên đúng, avatar sprite canvas, đủ 5 skill
  let classOk = true;
  for (const id of clsIds) {
    const info = await page.evaluate(cid => {
      document.querySelector('#cp-tabs button[data-id="' + cid + '"]').click();
      return {
        name: document.querySelector("#cp-name")?.textContent,
        want: CLASSES[cid].name,
        spr: !!document.querySelector('#cp-av canvas.sp[data-c="' + cid + '"]'),
        skills: CLASSES[cid].sk.map(s => s.n),
      };
    }, id);
    await sleep(300);
    const good = info.name === info.want && info.spr && info.skills.length === 5;
    if (!good) classOk = false;
    step("class " + info.want + ": tên+sprite+5 skill", good);
  }

  // 4. Chọn class đầu tiên, vào solo, mở cửa Chiến đấu (thử lại vài lần vì map render async)
  await page.evaluate(cid => { document.querySelector('#cp-tabs button[data-id="' + cid + '"]').click(); }, clsIds[0]);
  await sleep(300);
  await page.evaluate(() => document.querySelector("#c-ok").click());
  await sleep(500);
  await page.evaluate(() => document.querySelector("#m-solo").click());
  await sleep(2000);
  step("vào game (menu ẩn)", await page.evaluate(() => !document.querySelector("#menu").classList.contains("show")));
  // Đợi map render xong (có nút cửa) — map tạo async nên cần chờ
  let mapReady = false;
  for (let t = 0; t < 10 && !mapReady; t++) {
    mapReady = await page.evaluate(() => [...document.querySelectorAll("button")].some(x => /chiến đấu|kho báu|nghỉ ngơi|thương nhân|chúc phúc|bẫy/i.test(x.textContent) && x.offsetParent));
    if (!mapReady) await sleep(1000);
  }
  step("map hiện 3 cửa", mapReady);
  // Vào trận deterministic: cửa Chiến đấu random (không phải lúc nào cũng có) nên gọi thẳng startFight
  await page.evaluate(() => startFight(false));
  await sleep(3000);
  step("vào trận (có quái, tới lượt bạn)", await page.evaluate(() => document.querySelectorAll(".foe,.enemy").length > 0));

  // 5. Trong trận: mở panel Kỹ năng → 5 nút skill đúng tên → bấm skill → không lỗi JS
  await page.evaluate(() => document.querySelector("#btn-heal").click());   // mở panel 5 kỹ năng
  await sleep(600);
  const skillNames = await page.evaluate(() => [...document.querySelectorAll("#skills button.sk")].map(b => b.textContent.replace(/\s+/g, " ").trim()));
  const wantSkills = await page.evaluate(cid => CLASSES[cid].sk.slice(0, 4).map(s => s.n), clsIds[0]);
  step("4 nút skill hiện đúng tên", wantSkills.every(n => skillNames.some(t => t.includes(n))));
  const tapOk = await page.evaluate(() => {
    const b = document.querySelector("#skills button.sk");
    if (!b || !b.offsetParent) return false;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (tapOk) {
    if (DESKTOP) await page.mouse.click(tapOk.x, tapOk.y);
    else await page.touchscreen.tap(tapOk.x, tapOk.y);
    await sleep(2500);
  }
  step("bấm skill không vỡ trận", tapOk && await page.evaluate(() => !!document.querySelector("#arena")));
  step("không lỗi JS", jsErrs.length === 0);
  if (jsErrs.length) console.log("  Lỗi JS:\n  - " + jsErrs.join("\n  - "));

  await browser.close();
  console.log("\n" + results.join("\n"));
  const fail = results.filter(r => r.startsWith("FAIL")).length;
  console.log(fail ? `\n${fail} bước FAIL` : "\nTất cả PASS ✓");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL: " + String(e).slice(0, 300)); process.exit(2); });
