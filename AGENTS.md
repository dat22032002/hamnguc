# AGENTS.md — luật làm việc cho MỌI AI (đọc hết file này trước khi sửa)

Dự án: **Hầm Ngục** — game RPG theo lượt chạy trên trình duyệt (solo roguelike + co-op 2 người). HTML/CSS/JS thuần, không framework, không bundler, không ES module. Người chơi dùng điện thoại (luôn ngang) và PC. Chủ dự án nói tiếng Việt: trả lời và viết chú thích bằng tiếng Việt.

## 1. Đọc gì, theo thứ tự
1. File này.
2. `ARCHITECTURE.md` — bản đồ file, biến toàn cục, luồng chính. Chỉ mở thêm đúng file js/css cần sửa, đừng đọc cả dự án.
3. `GHI_CHU.md` — NHẬT KÝ lịch sử + quyết định thiết kế. Chỉ đọc khi cần biết "vì sao đang làm thế này". Đầu file có phần "Yêu cầu của người chơi (đã chốt)": đọc khi đụng tới lối đi/khu vực/boss.

## 2. Luật bắt buộc
1. **Sửa bằng thay chuỗi chính xác**, KHÔNG viết lại cả file. Không đổi những thứ ngoài yêu cầu.
2. **Chạy `node tools/check.js` sau mỗi thay đổi** (thứ tự nạp, cú pháp, khai báo trùng, đường dẫn ảnh, id thiếu, lỗi lúc nạp). Phải ra "Tất cả ổn". Nó không thay cho việc xem giao diện thật (xem mục 4).
3. **Giữ bản gộp < 1 MB.** Nơi lưu/host trên web mobile cắt file > 1.048.576 byte → mất `</html>` → màn hình trống. `node tools/bundle.js` báo lỗi nếu > 1.000.000 byte; coi đó là LỖI phải sửa, không được bỏ qua.
   - Ảnh mới: dùng **WebP** đã nén (nền ≤ 1920px, quality ~55–60). Không thêm PNG/JPG lớn. Sprite nhỏ có alpha: PNG hoặc WebP lossless.
   - Font: `.woff`. Không thêm font mới nếu không thật cần.
4. **Không ES module, không bundler.** Mọi file js là script thường; `const/let/function` cấp cao nhất là toàn cục dùng chung. Thứ tự `<script>` trong `index.html` quan trọng; `boot.js` luôn cuối. Thêm file js mới: tạo trong `js/`, thêm vào `index.html` đúng vị trí, chạy `check.js`.
5. **Mọi hiệu ứng/async:** nhân thời gian với `TS()`; sau mỗi `await` phải thoát nếu `gid !== gameId`.
6. **Dữ liệu từ mạng (co-op) luôn kiểm tra và `esc()`** trước khi đưa vào `innerHTML`. Máy chủ relay (worker) không nằm trong dự án này, không sửa.
7. **Số liệu cân bằng ở một chỗ:** `CONFIG` (`js/config.js`), `CLASSES`, `MT`. Không hard-code số ở nơi khác.
8. **Đường dẫn:** trong js viết `assets/...`; trong css viết `../assets/...`.
9. **Chú thích tiếng Việt, dòng ngắn** khi viết code mới.

## 3. Giao diện — những điều dễ vỡ
- Chiến đấu dùng bố cục ngang `hl` (`js/layout.js` + `css/layout-h.css`) cho desktop ≥ 1000px VÀ điện thoại cảm ứng. Điện thoại cầm dọc thì cả game bị xoay 90° bằng `body.fland` (xem GHI_CHU) — mọi thứ `position: fixed` mới phải thử cả hai trạng thái.
- Kích thước: `--m` (≈ 1px ở 844×390) cho thanh trên/dưới; `--hu` (= 100vh/720) cho sân khấu. Viết `calc(N * var(--m))`, đừng dùng px cố định.
- **Chân nhân vật/quái phải đứng trên sàn đá của ảnh nền** (`assets/img/bg-battle.webp`, neo `center bottom / cover`): nhân vật `bottom: 60·m`, quái hàng trước `--feet: 56·m`, hàng sau `76·m` (sàn chỉ cao ~85·m). Đổi ảnh nền → phải chỉnh lại các số này.
- CSS có nhiều lớp ghi đè chồng nhau. Khi sửa style, tìm theo selector và sửa cả các khai báo trùng. Chỉ viết bố cục ngang dưới `#game.hl`.
- Kỹ năng/nút hành động có 2 nhãn `.al` (dài) / `.as` (ngắn): đừng `textContent` cả nút.

## 4. Kiểm tra giao diện thật
Cần Python + playwright + chromium:
```
python3 tools/battle-shot.py out.png 1280 720        # desktop
python3 tools/battle-shot.py out.png 1920 1080
python3 tools/battle-shot.py out.png 844 390 "$PWD/index.html" m   # điện thoại ngang
python3 tools/battle-shot.py out.png 390 844 "$PWD/index.html" m   # điện thoại dọc (bị xoay)
```
Sửa giao diện: xem ít nhất 1280×720 và 844×390. Sửa logic: chạy thử 1 ván (menu → chọn class → solo → chiến đấu). Không có môi trường chạy được thì nói rõ là CHƯA thử, đừng nói "đã test".

## 5. Giao kết quả
**Giai đoạn chuyển đổi (hiện tại, chưa có kho git):** sửa nguồn → `node tools/check.js` → `node tools/bundle.js` → trả cả `hamnguc.zip` (toàn bộ dự án, có thể bỏ `dist/`) và `hamnguc.html` (= `dist/hamnguc.html` vừa build). Hai file phải khớp nhau.

**Khi đã có kho GitHub + link xem thử:** làm trên nhánh riêng `ten-ai/viec-dang-lam`, không đẩy thẳng `main`; xong thì báo chủ dự án xem link nhánh rồi mới nhập. Không cần đóng zip. (Khi chủ dự án xác nhận kho đã chạy, xóa đoạn "giai đoạn chuyển đổi" này.)

## 6. Nhật ký
Mỗi lần xong việc, thêm 1 mục ≤ 8 dòng ở CUỐI `GHI_CHU.md`: `## Cập nhật <ngày> — <việc>`, nói rõ: AI nào làm, đổi gì, file nào, đã test gì (và chưa test gì), còn dở gì. Đừng viết lại hay xóa mục cũ.

## 7. Điều chủ dự án đã chốt (đừng tự đổi)
- Mỗi tầng = 5 khu vực + 1 phòng boss. Mỗi khu vực chọn 1 trong 3 lối đi; một số lối bị ẩn "❓ Chưa rõ"; lối "Chiến đấu" không bị ẩn; Bẫy luôn ẩn; Thương nhân và Nghỉ ngơi không bao giờ ẩn.
- Trang bị gắn với class: sai class thì không mặc được (chỉ cất túi/bán).
- Mobile luôn chơi ngang. Giữ khung pixel (border-image) trên nút; đã bỏ hoa văn trang trí phía trên nút đang chọn.
- Tiến hóa kỹ năng: mới làm cho Hiệp sĩ; co-op dùng `autoEvo` (không popup).
