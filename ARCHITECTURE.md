# ARCHITECTURE — bản đồ cho AI và người

Đọc `AGENTS.md` (luật) rồi file này trước khi sửa code. Mục tiêu: biết cần mở file nào, đừng đọc cả dự án.

## 1. Quy tắc nền tảng
- **Không dùng ES module, không bundler.** Mọi file js là script thường, nạp bằng `<script src>` theo thứ tự trong `index.html`. Biến `const`/`let`/`function` ở cấp cao nhất là **toàn cục dùng chung** giữa các file.
- **Thứ tự nạp rất quan trọng**: code chạy ngay lúc nạp chỉ được dùng thứ đã khai báo ở file nạp trước. Hàm khai báo ở file sau KHÔNG dùng được lúc nạp (chỉ dùng được lúc chạy, sau khi mọi file đã nạp xong). `boot.js` luôn cuối.
- **Thêm file js mới**: tạo trong `js/`, thêm `<script src>` vào `index.html` ở đúng vị trí, rồi chạy `node tools/check.js`.
- Chú thích bằng tiếng Việt. Giữ dòng ngắn khi viết code mới (code cũ có nhiều dòng dài).
- Đường dẫn ảnh/font viết tương đối: trong js là `assets/...`, trong css là `../assets/...`.

## 2. Bản đồ file (theo thứ tự nạp)
| File | Nội dung chính |
|---|---|
| `sprite-data.js` | `SPRITE_DATA` (ảnh sheet + hoạt ảnh từng class). Đổi hình nhân vật ở đây |
| `config.js` | `CONFIG`: số liệu cân bằng (máu, lên cấp, rơi đồ, nghỉ, solo) |
| `classes.js` | `state`, `animSpeed`, `TS()`, `gameId`, `CLASSES` (4 class × 5 kỹ năng) |
| `sprites.js` | engine sprite canvas, `setAv(el, cls)` |
| `entities.js` | `mkPlayer`, `newGame`, `MT` (bảng quái), `spawnGroup`, `xpNeed` |
| `utils.js` | `rand`, `esc`, `pct`, `dodgeChance`, `critBase`, âm thanh `tone`/`sfx`, `log` |
| `fx.js` | hạt/ánh sáng canvas, `VFX`, `playVfx`, `VF`, `canAct`, `FXX`, `idOf` |
| `combat.js` | `STATUS`, `perform`, `monsterAct`, `buildOrder`, `actorTurn`, `takeTurn`, `handleVictory`, `endGame` |
| `evo.js` | Tiến hóa kỹ năng (EXP riêng từng skill, nhánh A/B): `skDef`, `addEvoXp`, `checkEvo`, `showEvo`/`chooseEvo`, `autoEvo` (co-op). Hiện chỉ Hiệp sĩ. Chi tiết: `GHI_CHU.md` |
| `rewards.js` | `REWARDS` (12 nâng cấp khi lên cấp), `saveBest` |
| `items.js` | `RARITIES`, `GEAR`, `ITEM_TYPES`, `rollItem`, túi đồ `openBag`, `useItem`, màn nhặt đồ |
| `rooms.js` | luồng 1 tầng solo: `genDoors` (sinh 3 lối đi), `showRooms`, `enterRoom`, `advance` (theo `state.zone`), nghỉ `showRest`, tập kích `startAmbush`. Chi tiết: `GHI_CHU.md` |
| `shop.js` | Vàng 💰 + thương nhân (chỉ solo). `rollGold`/`chestGold`/`addGold` (vàng rơi từ quái, rương), giá `gearPrice`/`potPrice`, kho hàng `makeStock`, màn Mua/Bán `openShop(done)`/`renderShop`. Vàng ở `p.gold`. Thương nhân là 1 loại lối đi 🧙: `enterRoom()` (rooms.js) gọi `openShop(advance)`. Số liệu: `CONFIG.gold`, `CONFIG.shop` |
| `coop.js` | co-op: `co`, `mkWs`, `hostCoop`/`joinCoop`, logic chủ phòng `host*`, `publish`, `coopApply` |
| `render.js` | `render()` cập nhật toàn bộ giao diện, `fillPanel`, `renderOrder`, `floatText` |
| `events.js` | `start()` (bắt đầu solo), nút bấm, phím tắt, âm thanh bật/tắt |
| `menu.js` | `showPage`, lobby, màn chọn class (`cpShow`, `cpSkill`), cài đặt, theme |
| `overlays.js` | menu tạm dừng, bảng chỉ số, tooltip kỹ năng |
| `layout.js` | (HUD mới 2026-10-07: thêm `#hl-mid` chứa `#skills`, `#hl-gold`, `#hl-statbtn`, `#hl-pbar` mới — xem `GHI_CHU.md`) Bố cục chiến đấu NGANG (desktop ≥1000px hoặc điện thoại cảm ứng ngang/ép xoay, cả co-op; nạp sau `overlays.js`, trước `boot.js`). `hlSync()` (gọi từ `render()` + `resize`) bật/tắt class `hl` trên `#game` và `body.hl-on`; `hlMove`/`hlRestore` chuyển nút DOM (giữ nguyên `id`) sang `#hl-top` · `#hl-card` · `#hl-actions` rồi trả lại đúng chỗ khi tắt. Thêm: `#hl-pbar` (thanh máu dưới chân nhân vật, cập nhật bằng MutationObserver đọc `#me-hp`), trình nghe click cho 📊/ô trang bị trên `#hl-card`, nút ✕ đóng nhật ký. CSS ở `css/layout-h.css`, **chỉ viết dưới `#game.hl`**; kích thước sân khấu theo `--hu` (= 100vh/720). Chi tiết: `GHI_CHU.md` |
| `boot.js` | gọi `showMenu()` |

## 3. Biến toàn cục quan trọng
- `state` — ván hiện tại: `{ mode: "solo"|"coop", player, monsters, turn, busy, over, step, monsterIndex, order, cur }`. Trong co-op `state.player` là bản sao của người chơi mình lấy từ snapshot.
- `co` — phiên co-op (null nếu không chơi co-op): `{ code, me (0=chủ phòng,1=người vào), names, cls, s (trạng thái thật, chỉ chủ phòng tính), conn, evs }`.
- `CONFIG`, `CLASSES`, `MT` — dữ liệu cân bằng, class/kỹ năng, quái. Sửa số liệu ở đây, không hard-code chỗ khác.
- `TS()` — hệ số thời gian hiệu ứng (`2 / animSpeed`); mọi `sleep`/`setTimeout` hiệu ứng phải nhân với nó.
- `gameId` — tăng mỗi ván mới; mọi hàm `async` phải thoát nếu `gid !== gameId` sau khi `await`.

## 4. Luồng chính
- **Solo**: `start()` → `newGame()` → người chơi bấm → `takeTurn(action)` → `actorTurn` lần lượt theo `buildOrder` → `checkEnd` → `handleVictory` → `showLoot` → `postFight` → `advance` → `showRooms` (3 lối đi) → `enterRoom` → ... Mỗi tầng = 5 khu vực (`state.zone` 1..5) + phòng boss (zone 6).
- **Co-op**: chủ phòng giữ luật chơi. Người vào gửi `{t:"act"|"pick"|"rest"|"restgo"}`; chủ phòng kiểm tra rồi `resolveRound()` → `publish()` gửi `{t:"snap", s, ev}`; người vào chỉ hiển thị (`guestOnData` → `coopApply` + `playEvents`). **Mọi dữ liệu từ mạng phải được kiểm tra/escape** (dùng `esc()` khi đưa vào `innerHTML`).
- Tin nhắn WebSocket: `hello`, `lobby`, `snap`, `act`, `pick`, `rest`, `restgo` (game) và `joined`, `left`, `host-left` (máy chủ). Mã đóng kết nối: `exists`, `none`, `playing`, `full`. Mã nguồn máy chủ relay (worker.js) **không nằm trong dự án này**.

## 5. Cách thêm thứ mới
- **Chỉnh vàng / giá**: `CONFIG.gold` (vàng quái, rương, vàng khởi đầu) và `CONFIG.shop` (giá, tỉ lệ thu mua, số món hàng của thương nhân) trong `config.js`.
- **Quái mới**: thêm vào `MT` (`entities.js`); kỹ năng quái trong `MSK` (`combat.js`).
- **Class/kỹ năng mới**: `CLASSES` (`classes.js`) + hiệu ứng `ATKFX`/`SKFX`/`VFX` (`fx.js`) + `RES_BASE` (`combat.js`) + trang bị `GEAR` (`items.js`); nếu có sprite thì thêm vào `sprite-data.js` và `assets/sprites/`.
- **Phần thưởng lên cấp**: `REWARDS` (`rewards.js`).
- **Đồ/vật phẩm**: `RARITIES`, `GEAR`, `ITEM_TYPES` (`items.js`).
- **Nút/màn hình mới**: HTML trong `index.html` (cần có `id`), gắn sự kiện trong `events.js`/`menu.js`, CSS trong `css/style.css`.

## 6. Lưu ý đã biết
- **Bố cục ngang (`hl`)**: chuyển nút DOM đi nơi khác thì trình nghe gắn vào phần tử cha cũ (`#party`, `#me`) không còn bắt được click → phải gắn lại ở nơi mới (xem `hlBuildCardEvents`). `#party` và `#mons` là `position:absolute` trong `#arena` khi `hl`; vị trí quái theo số quái bằng `#mons:has(.mon:nth-child(N):last-child)`. Điện thoại cảm ứng dùng `hl` kể cả co-op; chuột + cửa sổ <1000px thì không (xem `GHI_CHU.md`).
- `render()` được gọi rất nhiều và dựng lại nhiều `innerHTML`; đừng gọi trong vòng lặp.
- CSS có nhiều lớp ghi đè chồng nhau (nhiều `!important`, một số selector khai báo 2–3 lần, ví dụ `#cp-skills`). Khi sửa style nên tìm theo selector rồi sửa cả các khai báo trùng.
- Khung nhân vật trong trận: CSS ở cuối `css/style.css` (mục "Khung nhân vật trong trận"). `dash()` trong `fx.js` chỉ di chuyển canvas sprite nên khung đứng yên khi nhân vật lao tới.
- Solo không lưu ván; co-op không kết nối lại khi mất mạng.
- Dữ liệu `localStorage`: `rpgClass`, `rpgBest`, `rpgTheme`, `rpgMute`, `rpgAnim`, `rpgLog`.

## 7. Kiểm tra trước khi giao
Nếu môi trường có Python + playwright: `python3 tools/screenshot.py out.png 390 844` chụp trận đấu để xem giao diện thật.

`node tools/check.js` kiểm: thứ tự nạp, cú pháp, khai báo trùng, đường dẫn ảnh, `$("id")` thiếu trong HTML, và lỗi khi nạp file trong DOM giả. Nó **không** thay cho việc chơi thử.

## 8. Giao kết quả
Xem `AGENTS.md` mục 5 (quy trình giao kết quả hiện hành) và mục 2 (giới hạn 1 MB cho bản gộp).
