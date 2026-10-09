#!/usr/bin/env node
/* tools/bundle.js — gộp cả dự án thành MỘT file HTML duy nhất để chia sẻ:  node tools/bundle.js
   Kết quả: dist/hamnguc.html (CSS, JS, ảnh, font đều nhúng vào). Không sửa file nào trong dự án. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const MIME = { png: "image/png", svg: "image/svg+xml", ttf: "font/ttf", woff2: "font/woff2", woff: "font/woff", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const inline = (text, prefix) => text.replace(new RegExp(prefix + "(assets/[\\w\\-/.]+\\.(png|svg|ttf|woff2?|jpe?g|webp))", "g"), (all, p, ext) => {
  const f = path.join(ROOT, p);
  return fs.existsSync(f) ? "data:" + MIME[ext] + ";base64," + fs.readFileSync(f).toString("base64") : all;
});
let html = rd("index.html");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => "<style>\n" + inline(rd(href), "\\.\\./") + "</style>");
html = html.replace(/<script src="([^"]+)"><\/script>\n?/g, (m, src) => {
  const code = inline(rd(src), "");
  if (code.includes("</script")) throw new Error(src + " chứa </script>, không gộp được");
  return "<script>\n" + code + "\n</script>\n";
});
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
// Đóng dấu build: commit SHA + giờ build → kiểm tra bằng `curl -s URL | head -1`
// hoặc trong game: window.__BUILD__ (Jame thấy lỗi trên điện thoại là biết ngay bản nào)
let sha = "dev", when = new Date().toISOString();
try {
  sha = require("child_process").execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
} catch (e) { /* không phải git repo: giữ "dev" */ }
const stamp = `build ${sha} @ ${when}`;
html = html.replace("<!DOCTYPE html>", `<!DOCTYPE html>\n<!-- ${stamp} -->`);
html = html.replace("</head>", `<script>window.__BUILD__=${JSON.stringify({ sha, time: when })};</script>\n</head>`);
const out = path.join(ROOT, "dist", "hamnguc.html");
fs.writeFileSync(out, html);
console.log("Đã tạo " + path.relative(ROOT, out) + " (" + Math.round(html.length / 1024) + " KB)");
const bytes = Buffer.byteLength(html);
if (bytes > 1000000) { console.error("⚠️ CẢNH BÁO: " + bytes + " byte > 1 MB — web mobile/hosting sẽ cắt cụt file (màn hình trống). Hãy nén bớt ảnh/font."); process.exitCode = 1; }
