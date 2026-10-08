# Hầm Ngục

Game RPG theo lượt chạy trên trình duyệt: solo roguelike hoặc co-op 2 người qua mạng. Không dùng framework, không cần cài gì để chơi.

## Chạy game
- **Chơi qua link (khuyên dùng):** đưa thư mục lên host tĩnh (Cloudflare Pages / GitHub Pages) rồi mở link trên điện thoại hoặc PC. Không bị giới hạn dung lượng.
- **Máy tính, chạy tại chỗ:** mở `index.html` bằng trình duyệt, hoặc `npx serve .` / `python3 -m http.server`.
- **Một file duy nhất (để gửi nhanh):** `node tools/bundle.js` → `dist/hamnguc.html` (phải < 1 MB, quá thì web mobile cắt cụt file). Mở `index.html` trực tiếp bằng `file://` trên điện thoại sẽ hiện thô vì không tải được css/js đi kèm.
- Co-op cần mạng vì kết nối tới máy chủ relay (`SERVER` trong `js/coop.js`).

## Cấu trúc
```
index.html      khung HTML + danh sách script (THỨ TỰ NẠP QUAN TRỌNG)
css/style.css   toàn bộ giao diện (bản cũ/điện thoại/co-op)
css/layout-h.css  bố cục chiến đấu ngang (chỉ khi solo + desktop)
js/             logic game, chia theo chức năng (xem ARCHITECTURE.md)
assets/         ảnh sprite, font, hoa văn viền
tools/          check.js (kiểm tra) và bundle.js (gộp 1 file)
dist/           bản gộp 1 file để chia sẻ
docs/           file mẫu bố cục (chỉ để tham khảo, game không nạp)
AGENTS.md       luật làm việc cho mọi AI (ĐỌC ĐẦU TIÊN)
ARCHITECTURE.md bản đồ file/biến/luồng
GHI_CHU.md      nhật ký lịch sử + quyết định thiết kế
```

## Lệnh cần nhớ (cần Node.js)
| Lệnh | Việc |
|---|---|
| `node tools/check.js` | Kiểm tra dự án sau mỗi lần sửa. Chạy trước khi giao việc cho người khác |
| `node tools/bundle.js` | Gộp thành `dist/hamnguc.html` (một file duy nhất; báo lỗi nếu > 1 MB) |
| `python3 tools/battle-shot.py out.png 1280 720` | Chụp trận đấu thật để xem giao diện (cần playwright) |

## Làm việc với AI
Mọi AI đọc `AGENTS.md` trước (luật, cách kiểm tra, cách giao kết quả), rồi `ARCHITECTURE.md`, rồi chỉ file cần sửa. `CLAUDE.md` chỉ trỏ về `AGENTS.md`.
