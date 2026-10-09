# RELEASE.md — Checklist phát hành Hầm Ngục (chạy trước MỖI lần deploy)

Quy trình: làm trên nhánh `ten-ai/viec` → push nhánh → Cloudflare tự deploy preview
→ kiểm tra hết checklist dưới → Jame duyệt trên máy thật → merge vào `main`.

## 1. Build
- [ ] `node tools/check.js` → "Tất cả ổn"
- [ ] `node tools/bundle.js` → dist < 1.000.000 byte, không cảnh báo
- [ ] Đóng dấu build đúng commit: `head -2 dist/hamnguc.html` hiện đúng SHA nhánh

## 2. Test tự động
- [ ] `node tools/tap-test.js` → tất cả PASS (giả lập mobile)
- [ ] `node tools/tap-test.js --desktop` → tất cả PASS

## 3. Kiểm tra bằng mắt (ít nhất 1 lần trước khi báo Jame)
- [ ] Mở dist/hamnguc.html: menu hiện, bấm được bằng touch/chuột
- [ ] Chọn class: đủ 4 class, sprite không lệch/mờ, đủ 5 skill mỗi class
- [ ] Vào trận: quái đứng đúng vị trí, không lỗi JS (F12 console sạch)

## 4. Deploy preview
- [ ] Push nhánh lên GitHub, đợi Cloudflare deploy xong
- [ ] `curl -s <preview-URL> | head -1` hiện đúng dấu build của nhánh
- [ ] KHÔNG báo Jame test khi chưa thấy dấu build mới trên URL (bài học vụ slime 2026-10-09)

## 5. Jame duyệt trên máy thật (Brave)
- [ ] Jame xác nhận OK trên điện thoại → mới merge vào `main`
- [ ] Sau merge: `curl -s <URL-chính> | head -1` đúng dấu build mới rồi mới báo xong
