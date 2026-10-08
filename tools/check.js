#!/usr/bin/env node
/* tools/check.js — kiểm tra dự án sau mỗi lần sửa (AI hay người đều chạy được):  node tools/check.js
   1. Mọi file js/*.js đều được index.html nạp, đúng thứ tự, và tồn tại.
   2. Cú pháp từng file + toàn bộ ghép lại (bắt khai báo const/let trùng giữa các file).
   3. Mọi đường dẫn assets/... trong css/js đều có file thật.
   4. Mọi $("id") trong js đều có id tương ứng trong index.html (trừ id tạo động, liệt kê ở DYNAMIC_IDS).
   5. Chạy thử nạp toàn bộ file trong môi trường DOM giả: bắt ReferenceError như gọi hàm chưa được định nghĩa. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");
let errors = 0, warns = 0;
const bad = m => { errors++; console.log("✗ " + m); }, warn = m => { warns++; console.log("⚠ " + m); }, ok = m => console.log("✓ " + m);

// id được tạo bằng JS (panelHTML, render...) nên không có sẵn trong index.html
const DYNAMIC_IDS = new Set(["player-avatar", "mate-avatar", "me-name", "me-lv", "me-hp", "me-mp", "me-xp", "me-stats", "me-eq",
  "mate-name", "mate-lv", "mate-hp", "mate-mp", "mate-xp", "mate-stats", "mate-eq", "mate-status", "mate-fx", "player-status",
  "hl-top", "hl-bottom", "hl-card", "hl-mid", "hl-actions", "hl-pbar", "hl-mbar", "hl-gold", "me-gold"]);   // các id hl-* do js/layout.js tạo; me-gold do panelHTML (render.js) tạo

// 1. thứ tự nạp
const html = rd("index.html");
const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!order.length) bad("index.html không nạp script nào");
order.forEach(f => { if (!fs.existsSync(path.join(ROOT, f))) bad("index.html nạp file không tồn tại: " + f); });
const onDisk = fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);
onDisk.filter(f => !order.includes(f)).forEach(f => bad("file chưa được nạp trong index.html: " + f));
if (order[order.length - 1] !== "js/boot.js") bad("js/boot.js phải nạp CUỐI CÙNG");
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
if (!cssFiles.includes("css/style.css")) bad("index.html thiếu link css/style.css");
cssFiles.forEach(f => { if (!fs.existsSync(path.join(ROOT, f))) bad("index.html link css không tồn tại: " + f); });
fs.readdirSync(path.join(ROOT, "css")).filter(f => f.endsWith(".css") && !cssFiles.includes("css/" + f)).forEach(f => bad("file css chưa được link trong index.html: css/" + f));
ok("thứ tự nạp: " + order.length + " file js");

// 2. cú pháp
const srcs = order.map(f => [f, rd(f)]);
srcs.forEach(([f, t]) => { try { new vm.Script(t, { filename: f }); } catch (e) { bad("lỗi cú pháp " + f + ": " + e.message); } });
try { new vm.Script(srcs.map(x => x[1]).join("\n"), { filename: "(ghép tất cả)" }); ok("cú pháp từng file và bản ghép đều ổn"); }
catch (e) { bad("bản ghép lỗi (thường là khai báo trùng giữa các file): " + e.message); }

// 3. tài nguyên
const refs = new Set();
[...cssFiles.map(f => [f, /\.\.\/(assets\/[\w\-\/.]+\.\w+)/g]), ...srcs.map(([f]) => [f, /["'](assets\/[\w\-\/.]+\.\w+)["']/g])].forEach(([f, re]) => {
  for (const m of rd(f).matchAll(re)) refs.add(m[1]);
});
refs.forEach(a => { if (!fs.existsSync(path.join(ROOT, a))) bad("thiếu tài nguyên: " + a); });
ok("tài nguyên: " + refs.size + " đường dẫn đều có file");

// 4. id trong DOM
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const missing = new Set();
srcs.forEach(([f, t]) => { for (const m of t.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)) if (!ids.has(m[1]) && !DYNAMIC_IDS.has(m[1])) missing.add(m[1] + " (" + f + ")"); });
if (missing.size) missing.forEach(x => bad("$(\"id\") không có trong index.html: " + x)); else ok("mọi $(\"id\") đều có trong index.html");

// 5. nạp thử trong DOM giả
const stub = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === "then" ? undefined : k === Symbol.iterator ? function* () {} :
    ["innerHTML", "textContent", "value", "className", "id", "src"].includes(k) ? "" : k === "length" ? 0 : stub(),
  apply: () => stub(), construct: () => stub(), set: () => true, has: () => true
});
const store = { getItem: () => null, setItem() {}, removeItem() {} };
const ctx = vm.createContext({ console, Math, JSON, Date, Object, Array, String, Number, Promise, Map, Set, RegExp, Error, parseInt, parseFloat, isNaN, encodeURIComponent,
  document: stub(), localStorage: store, navigator: { userAgent: "" }, location: { protocol: "file:", host: "", search: "" },
  performance: { now: () => 0 }, requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }), Image: function () {}, WebSocket: function () {}, MutationObserver: function () { this.observe = () => {}; },
  addEventListener() {}, removeEventListener() {} });
ctx.window = ctx;
let loaded = true;
for (const [f, t] of srcs) {
  try { vm.runInContext(t, ctx, { filename: f, timeout: 2000 }); }
  catch (e) { loaded = false; bad("lỗi khi nạp " + f + ": " + e.name + ": " + e.message); break; }
}
if (loaded) ok("nạp thử toàn bộ file trong DOM giả: không lỗi");

console.log(errors ? "\n" + errors + " lỗi, " + warns + " cảnh báo" : "\nTất cả ổn" + (warns ? " (" + warns + " cảnh báo)" : ""));
process.exit(errors ? 1 : 0);
