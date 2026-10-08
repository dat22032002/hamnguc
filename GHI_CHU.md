# GHI CHÚ DỰ ÁN — Hầm ngục

> Đây là NHẬT KÝ + quyết định thiết kế. Luật làm việc cho AI nằm ở `AGENTS.md` (đọc file đó trước). Chỉ thêm mục mới ở CUỐI file, đừng viết lại mục cũ.
> Lưu ý: các mục cũ nhắc "1 file HTML duy nhất / gửi zip + html" là quy trình cũ; xem `AGENTS.md` mục 2 và 5 cho quy trình hiện hành.

## Yêu cầu của người chơi (đã chốt)
- Mỗi tầng = **5 khu vực** + **1 phòng boss** (không có lựa chọn, xong khu vực 5 vào thẳng boss).
- Vào game và sau mỗi khu vực: hiện **3 lối đi** (trái / giữa / phải), chọn 1.
- Mỗi lần chọn, ngẫu nhiên **1~2 lối bị ẩn** (hiện "❓ Chưa rõ"); lối nào ẩn cũng random **trừ cửa "Chiến đấu"** (không ẩn để giữ quyết định chiến thuật). Lối hiện thì ghi rõ loại. (Hiếm khi cả 3 cửa đều hiện nếu chỉ còn cửa chiến đấu/thương nhân/nghỉ ngơi — vẫn chơi bình thường.)
- Lối quái chỉ ghi **"Chiến đấu"**, không ghi tên quái.
- Loại lối đi:
  - Ẩn được: ⚔️ Đợt quái (tinh anh chỉ từ tầng `CONFIG.solo.eliteFrom`), 💎 Rương, 🕸️ Bẫy, ⛩️ Chúc phúc.
  - **Bẫy luôn bị ẩn.**
  - **Không bao giờ ẩn:** 🧙 Thương nhân, 🏕️ Khu vực nghỉ ngơi.
- 3 lối cùng lần chọn là 3 loại khác nhau; tối đa 1 Thương nhân + 1 Nghỉ ngơi mỗi lần chọn.
- Khu vực nghỉ ngơi dùng lại bảng Nghỉ ngắn/Nghỉ dài có sẵn (`showRest`, nghỉ dài 30% tập kích). Bỏ bảng nghỉ tự động sau mỗi trận.
- Thương nhân: dùng lại `openShop`, bỏ cơ chế "chặn đường mỗi tầng" trong `showRooms`.
- Boss: có ở mọi tầng, lấy theo `finalKind()`; tầng 5/10/15… là Rồng Lửa như cũ.
- Làm **solo trước**, co-op để sau.

## Kế hoạch & tiến độ
- [x] **Bước 0** Sao lưu (`hamnguc_backup.html` = bản gốc) + file ghi chú này.
- [x] **Bước 1** Thêm `CONFIG.map = { zones: 5, hideMin: 1, hideMax: 3 }`, thêm `state.zone` (khởi tạo = 1 trong `newGame`, reset = 1 khi sang tầng mới).
- [x] **Bước 2** `DOOR_TYPES` + `genDoors(floor, mode)` (ngay trước `advance()`), cùng `CONFIG.map.w` / `CONFIG.map.eliteChance`. Trả về mảng 3 phần tử `{type, icon, name, hidden, elite}`. Đã test mô phỏng 20.000 lần: 3 loại khác nhau, bẫy luôn ẩn, thương nhân/nghỉ ngơi không ẩn, số ẩn 1~3, tinh anh chỉ từ tầng 4.
- [x] **Bước 3** `showRooms()` dùng `genDoors()`: lối hiện = icon + tên, lối ẩn = "❓ Chưa rõ" (HTML `#rooms` có `rooms-title`, `rooms-note`). `enterRoom(d, door)` nhận phần tử của `genDoors`. Thêm `zoneTxt()`; topbar solo hiện "Khu vực n/5".
- [x] **Bước 4** Đã nối luồng solo:
  - `advance()` viết lại theo `state.zone`: zone 1..5 = chọn lối đi; xong khu vực → `zone++` → `showRooms()`; sau khu vực 5 → zone = 6 → `startFight(finalKind(...))` (phòng boss); xong boss → zone = 1, `monsterIndex++`, `showRooms()`.
  - `postFight()` không còn mở bảng nghỉ tự động (chỉ xử lý cờ tập kích rồi `advance()`).
  - Lối 🏕️ gọi `showRest()` (bảng Nghỉ ngắn/dài, nghỉ dài có tập kích; `restGo()` → `advance()`). Lối 🕸️ trừ 15% máu. ⛩️ → `showRewards(true)`. 🧙 → `openShop(advance)`. 💎 → `offerItem(..., advance)`.
  - `start()`: vào game hiện 3 lối ngay (quái khởi tạo bị đặt hp = 0 cho khỏi hiện trận).
  - Log trận dùng `zoneTxt()`. Đã xóa hằng `ROOMS`. `state.step`/`waveTxt` chỉ còn dùng cho co-op.
- [x] **Bước 5** Phòng boss = `zone = zones + 1`, không có lựa chọn, dùng `finalKind()`. Làm chung trong `advance()`.
- [x] **Bước 6** Co-op đã dùng luồng lối đi giống solo (`js/coop.js`): `hostAdvance`, `hostDoors`, `hostDoorVote`, `hostDoorResolve`, `hostEnterDoor`, `hostFight`, `renderCoopDoors`, `coopDoor`; `co.s.zone`, phase `"doors"`, mỗi người bỏ phiếu `p.dv` (khác ý thì random); loại thật của lối ẩn chỉ lưu ở chủ phòng (`co.doors`). Không còn `hostNextFloor`.
- [ ] **Bước 7** Test trên trình duyệt thật + cân bằng. Đã chạy mô phỏng bằng Node (DOM giả): 3 tầng liên tiếp đúng 5 khu vực → boss → tầng mới, kể cả nghỉ ngơi/tập kích. Chưa thử giao diện thật. Chưa chỉnh cân bằng: mỗi tầng giờ có thể chỉ ~3 trận quái (còn lại là rương/bẫy/nghỉ…), cần xem lại độ khó, vàng, XP.

## Bản đồ code (số dòng ước chừng)
- `CONFIG` ~dòng 1333 (`map` ở gần `monsterDelayMs`).
- `newGame()` ~1550: khởi tạo `state`. `start()` ~3350.
- `advance()`, `genDoors()`, `showRooms()`, `enterRoom()`, nghỉ `showRest/renderRest/restGo/startAmbush`, `postFight()`, `startFight()` ~2450–2640.
- `finalKind(floor)` ~1568. Thương nhân: `openShop(done)`; vàng: `addGold`, `chestGold`.
- Rương/đồ: `offerItem`, `rollItem`; Chúc phúc: `showRewards(true)`.
- Topbar: `$("floor-badge")` trong `render()` (solo) và hàm render co-op.

## Lưu ý
- Co-op giờ dùng `zone` + lối đi như solo (Bước 6). `state.step` / `waveTxt` không còn dùng cho luồng chính.
- Zip (`hamnguc.zip`, bản chia module) ĐÃ đồng bộ với bản html mới nhất (Bước 1–6): `js/config.js`, `entities.js`, `rooms.js`, `render.js`, `events.js`, `index.html` đã cập nhật; `dist/hamnguc.html` build ra giống hệt `hamnguc2.html`. Từ giờ sửa trong module rồi chạy `node tools/check.js` + `node tools/bundle.js`.

## Cập nhật 2026-10-06 (Muse) — Trang bị gắn với class
- Mỗi món đồ rơi ra giờ gắn `it.cls` (class nào). `rollItem(floor, src, cls, luck)` đã dùng tham số `cls` (trước đây bỏ qua, random cả 4 class).
- Thêm `canEquip(p, it)` / `gearClsName(c)`: chỉ đúng class mới mặc được; đồ cũ không có `cls` thì ai cũng mặc được (tương thích ngược).
- Chặn ở mọi đường mặc đồ: `equipItem` (popup nhặt đồ), `gearAct` nhánh `eq`, `gearOk` (dùng khi đổi đồ trong trận), co-op `coopGive` (tự mặc).
- UI: `itemHtml`/`itemText` hiện "🎭 <tên class>"; nút Mặc/Trang bị/Mua & mặc bị disable + ghi "⛔ Khác class" khi sai class; vẫn cho Cất vào túi / Bán lấy vàng.
- Đồ rơi solo vẫn random class như cũ (đồ class khác thì bán ở thương nhân). Co-op rơi đúng class từng người (đã có sẵn `p.cls`).
- Đã chạy `node tools/check.js` (ổn) + test logic 6 nhóm (pass) + `node tools/bundle.js` → `dist/hamnguc.html`.

## Cập nhật 2026-10-07 (Muse) — Cân bằng lại hệ thống lối đi
Sau khi mô phỏng 200.000 lần chọn cửa, phát hiện: rương quá mạnh (2.44 lần/tầng, đồ ngon hơn cả đánh quái thường), chúc phúc quá hời (2.15 lần/tầng ≈ 1 cấp miễn phí), cửa Chiến đấu bị ẩn tới 72% (mất ý nghĩa lựa chọn chiến thuật), kinh tế dư vàng. Đã chỉnh:
- `CONFIG.map.w`: rương 14→10, chúc phúc 12→8 (đánh nhau giữ 40).
- `CONFIG.map.hideMax`: 3→2; `genDoors`: không ẩn ngẫu nhiên cửa "Chiến đấu" (chỉ ẩn khi không còn cửa nào khác ẩn được).
- `CONFIG.drop.gearW.treasure`: [10,40,38,12]→[25,40,28,7] (ngang đồ tinh anh, không hơn).
- `CONFIG.gold.chest.treasure`: [35,65]→[25,45].
- Đã chạy `node tools/check.js` (ổn) + test logic genDoors mới (pass) + `node tools/bundle.js` → `dist/hamnguc.html`.

## Cập nhật 2026-10-07 (Muse) — Bỏ hoa văn viền trên nút bấm
Theo yêu cầu người chơi: bỏ hết viền khung pixel-art trang trí (border-image) trên mọi nút bấm (nút overlay, danh sách, phòng, túi đồ, nghỉ ngơi, chọn class, 4 nút chiến đấu, kỹ năng, mute/pause/tốc độ, nút chơi, logbtn, statb), kể cả hoa văn trang trí phía trên nút đang chọn. Thay bằng viền trơn (#5a4632, #8a6a45 / var(--gold) khi hover/chọn). Các hoa văn còn lại giữ nguyên (khung cửa sổ overlay, khung party/hero/avatar, huy hiệu, thanh máu).

## Cập nhật 2026-10-07 (Muse) — Khôi phục khung pixel trên nút
Người chơi làm rõ: chỉ muốn bỏ "hoa văn trang trí" (phù hiệu trang trí phía trên nút đang chọn, ::before), còn "khung pixel" (viền bậc thang border-image) thì giữ lại. Đã khôi phục toàn bộ border-image trên các nút như bản gốc, chỉ giữ lại việc xóa ::before trang trí.

## Cập nhật 2026-10-07 (Muse) — Mobile xoay ngang + đồng nhất bố cục desktop
Theo yêu cầu người chơi:
1. Trên mobile hiện màn hình nhắc "Xoay ngang màn hình để chơi game" khi để dọc; khi bấm vào game sẽ thử tự khóa xoay ngang (fullscreen + screen.orientation.lock, chỉ Android Chrome hỗ trợ, thất bại thì bỏ qua trong im lặng).
2. Mobile xoay ngang dùng chung bố cục ngang (hl) của desktop: hlWant mở rộng cho touch-mobile + landscape (không chỉ >= 1000px). Co-op giữ nguyên bố cục dọc. Thêm @media (max-width: 999px) thu gọn thanh trên/bảng dưới/nút hành động cho vừa màn hình điện thoại; dùng 100dvh thay 100vh.
Test logic: mobile ngang solo bật hl, mobile dọc không bật, desktop chuột hẹp không bật, desktop rộng bật, coop không bật.

## Cập nhật 2026-10-07 (Muse) — Ép màn hình ngang trên mobile
Người chơi muốn game mặc định luôn là màn hình ngang, bỏ hẳn màn hình dọc trên mobile (app Muse không hỗ trợ xoay ngang). Giải pháp: bọc toàn bộ game trong #viewport; khi mobile cầm dọc (touch + portrait, trừ co-op), body.fland xoay cả khung 90° bằng CSS (position:fixed; top:100%; width:100dvh; height:100vw; rotate(-90deg)), mọi overlay position:fixed tự co theo khung xoay. Bỏ màn hình nhắc xoay + tryLandscape (không cần nữa). hlWant dùng effLandscape (ngang thật hoặc đang ép xoay) nên mobile dọc vẫn dùng bố cục ngang desktop. --hu trong fland tính theo 100vw.
Test: portrait solo → fland+hl bật; landscape solo → chỉ hl; portrait coop → giữ dọc; desktop chuột hẹp → không đổi.

## Cập nhật 2026-10-07 (Muse) — Sửa lệch hiệu ứng + overlay quá to khi ép xoay
1. Hiệu ứng canvas (fx.js) và cú lao của nhân vật bị lệch vì getBoundingClientRect() trả tọa độ màn hình thật trong khi canvas vẽ theo hệ layout. Thêm hàm vRel() đổi ngược tọa độ khi body.fland (layoutX = innerHeight - tâmY_màn_hình, layoutY = tâmX_màn_hình), dùng cho playVfx và dodgeFx.
2. Overlay/menu quá to phải kéo màn hình: trong fland, .overlay padding 8px, .box max-height 100% + cuộn trong, chữ/nút/lista thu gọn.

## Cập nhật 2026-10-07 (Muse) — Thu gọn UI mobile, nhường chỗ cho sân đấu
Theo yêu cầu người chơi (mobile < 1000px): thanh trên 46→38px, bảng dưới 148→108px, sân đấu tăng từ ~166 lên ~214px; thanh máu/mana/XP 22→16px, ô trang bị 62×88→42×58, nút hành động 17→12px. UI chọn class thu gọn: avatar 98→62px, chữ/stats/skill nhỏ lại, nút bắt đầu nhỏ hơn.

## Cập nhật 2026-10-07 (Muse) — Nền menu bằng ảnh AI + animation
Người chơi chọn mẫu 1 (hành lang đuốc). Thêm assets/img/bg-menu.jpg (AI vẽ, nén còn 326KB), bundle.js đã hỗ trợ nhúng jpg. Menu dùng ảnh làm nền + 2 quầng sáng đuốc chập chờn theo kiểu pixel (steps) + 16 hạt than lửa bay lên (JS sinh ngẫu nhiên). Bỏ cổng CSS cũ (.dgm). Hỏi người chơi: có muốn animation pixel cho background không — đã làm theo cách ảnh tĩnh + hiệu ứng động phủ lên.

## Cập nhật 2026-10-07 (Muse) — Menu mobile thu còn một nửa
Theo yêu cầu người chơi: #menu .box { transform: scale(.5); } trong @media (max-width: 999px).

## Cập nhật 2026-10-07 (Muse) — Màn hình chọn class bố cục ngang
Người chơi không còn chơi màn hình dọc. Trang chọn class trên mobile (<1000px) được thiết kế ngang riêng: không scale .5 nữa, ẩn logo, dàn 2 cột (trái: tabs class + hero; phải: chỉ số + kỹ năng + mô tả), 2 nút nằm ngang. Các trang menu khác vẫn scale một nửa.

## Cập nhật 2026-10-07 — Co-op cũng ép ngang trên mobile
Người chơi muốn mobile luôn ngang, kể cả co-op. Trước đó co-op bị loại khỏi fland/hl nên khi khung xoay thì bố cục dọc của co-op bị vỡ.
1. layout.js: syncFland không còn loại co-op; hlWant = (desktop rộng và không co-op) hoặc (touch-mobile và ngang hiệu dụng) → co-op desktop giữ bố cục cũ, co-op mobile dùng bố cục ngang hl.
2. Đồng đội (#mate) đứng cạnh người chơi trên sân khấu (#party thành flex ngang); ẩn .info/.sgrid/.eqs của #mate, thêm #hl-mbar (thanh máu + tên + trạng thái dưới chân, hlBuildMbar/hlMbarSync đọc lại #mate-hp/#mate-name/#mate-status).
3. layout-h.css: khối cuối file cho "#game.hl.coop"; thanh trên co-op thu gọn ở <= 900px (chip thứ tự ra đòn nhỏ hơn, #floor-badge cắt bằng dấu …).
4. coop.js: coopStartUi gọi syncAll().
Test (giả lập co-op cục bộ, chưa thử server thật): portrait fland + landscape thật, màn chọn lối/thưởng/nghỉ/thua đều ổn; solo và desktop không đổi.

## Cập nhật 2026-10-07 — Đổi UI trận đấu theo mẫu (844×390)
Theo 2 ảnh mẫu của người chơi ("Chưa bấm Kỹ năng" / "Mở Kỹ năng"). Áp dụng cho mọi bố cục `hl` (mobile ngang/ép xoay + desktop rộng); co-op dùng chung.
- **Thang đo**: `--m` (≈1px ở 844×390) = min(100vw/844, 100vh/390) (ép xoay `body.fland` đổi chỗ vw/vh). Thanh trên + bảng dưới viết `calc(N * var(--m))`. Sân khấu/quái vẫn theo `--hu`.
- **Thanh trên** (32·m): `[Tầng · Khu] [Lượt + chip chỉ có số tốc độ] … [💰 vàng] [≡ nhật ký] [» tốc độ] [☰ menu]`. 3 nút là icon vuông (CSS mask). "Lượt của bạn" ẩn ở solo (chip của mình sáng viền vàng khi chờ bạn chọn — `renderOrder`, biến `idleMe`); co-op vẫn hiện `#turn-info`. Vàng: chip `#hl-gold` (layout.js đọc lại `#me-gold`).
- **Dưới chân nhân vật** `#hl-pbar`: "Tên · Lv" + thanh HP + MP + XP mảnh (đọc lại `#me-name/#me-lv/#me-hp/#me-mp/#me-xp`). Hết thẻ HP/Mana/XP/Lv/vàng ở bảng dưới.
- **Bảng dưới** (96·m): trái `#hl-card` = 3 ô trang bị + nút "Chỉ số" (`#hl-statbtn`, class `.statb`); giữa `#hl-mid` = gợi ý "Bấm “Kỹ năng” để chọn chiêu" (nét đứt tím) → khi mở Kỹ năng thì `#skills` (đã chuyển vào `#hl-mid`) hiện hàng 5 thẻ: 4 kỹ năng (số + icon + tên + "n MP") + Tối thượng (viền vàng, thanh đáy = hồi chiêu); phải = 4 nút vuông Đánh/Thủ/Kỹ năng/Túi đồ (icon mask + nhãn ngắn; Kỹ năng viền vàng khi mở; chấm số = số món trong túi). Mô tả kỹ năng xem bằng nhấn giữ (tooltip cũ, `data-tip`).
- HTML/JS: nút hành động có 2 nhãn `.al` (dài, bố cục cũ) / `.as` (ngắn, bố cục mới) + `.ab` (số túi); `render.js` và `coop.js` chỉ ghi `.al`/`.ab` (đừng `textContent` cả nút). Thẻ kỹ năng có thêm `.ki` (icon), `.kc` (mana kiểu cũ), `.mpc` ("n MP").
- Nhật ký: mặc định ẨN khi màn < 1000px (kể cả điện thoại ngang); mở bằng nút ≡. Ô máu quái: ẩn số HP khi màn thấp (< 680px), hiện lại khi cao hơn.
- `tools/check.js`: thêm id tạo động `hl-mid`, `hl-gold`, `me-gold`. Đã chạy `check.js` (ổn) + chụp thử 844×390, 1280×720, 390×844 (ép xoay) + thử bấm Kỹ năng/Đánh/Chỉ số/Túi đồ/nhật ký/tốc độ.

## Cập nhật 2026-10-07 (2) — Thẻ kỹ năng giữ lại hiệu ứng gốc
Người chơi thấy thẻ kỹ năng phẳng (1 màu tím) xấu → bỏ các ghi đè nền/viền/animation trong `css/layout-h.css` cho `#skills .sk` và `#btn-ult`: thẻ lại có màu theo cấp (cơ bản lục, nâng cao xanh-tím có ánh sáng quét + glow), Tối thượng cam có viền xoay + tia lửa + thanh hồi chiêu. Chỉ thu nhỏ bố cục vào hàng 5 thẻ. Bản phẳng cũ lưu ở /home/claude/layout-h.v1.css (không nằm trong zip).

## Cập nhật 2026-10-07 (3) — Tiến hóa kỹ năng (pilot: Hiệp sĩ)
- Mỗi skill có **EXP riêng**: dùng skill nào thì skill đó tăng EXP (không còn theo cấp nhân vật). Đủ EXP → sau trận thắng hiện popup "🌟 ... có thể tiến hóa!" cho chọn 1 trong 2 nhánh: **A (mặc định)** luôn mở, **B (điều kiện)** chỉ mở khi đạt điều kiện trong lúc chơi (khóa thì hiện 🔒 + tiến độ vd 0/5). Tiến hóa xong nút skill có huy hiệu ★.
- Dữ liệu: `evo: { exp, xp: { use, stuns, clutch, kills }, a: {...patch}, b: {...patch, cond} }` trong `CLASSES[cls].sk[i]` (hiện chỉ class knight). Ngưỡng: 100 EXP (skill thường), 150 (ult). Mỗi lần dùng +10; thưởng thêm: Đập khiên gây choáng +15, Hồi sức cứu nguy +20, Xung kích hạ quái +15.
- `js/evo.js` (mới): `skDef(p,i)` (def hiệu lực đã gộp patch), `mkEvoProg()`, `addEvoXp()`, `evoUnlocked()`, `checkEvo()` (gom skill đủ EXP vào `p.evoQueue` sau mỗi trận), `showEvo()/chooseEvo()` (popup, xong tự gọi `showLoot`), `autoEvo()` (dự phòng cho co-op), `evoTip()` (hiện EXP + tiến độ trong tooltip giữ-nút).
- `entities.js`: `mkPlayer` thêm `evoStage:[0,0,0,0,0]` (0=chưa,1=A,2=B), `evoProg` (exp/uses/stuns/clutch/kills mỗi skill), `evoQueue:[]`.
- `combat.js`: `perform` dùng `skDef` + cộng EXP theo sự kiện; hồi chiêu dùng `skDef(p,used).cdn`; `handleVictory` gọi `checkEvo` rồi hiện popup evo trước `showLoot` (solo).
- `fx.js` `canAct`, `render.js` nút skill/ult: dùng `skDef`; tooltip thêm dòng EXP.
- Điều kiện nhánh B: Khiêu khích dùng 10 lần; Đập khiên gây choáng 5 lần; Tường thép dùng 8 lần; Hồi sức cứu nguy 3 lần; Xung kích hạ 8 quái.
- Test: `node tools/check.js` OK; `evo-test.js` 38/38 PASS (logic); `tap-test.js` 19/19 PASS trên Chromium mobile portrait + touch, không lỗi JS (menu → class → solo → cửa Chiến đấu → combat → popup evo → chọn nhánh → ★).
- TODO: mở rộng cho 3 class còn lại; co-op hiện chưa nối popup (có `autoEvo` chờ dùng).

## Cập nhật 2026-10-07 (4) — Background battle AI
- Thêm `assets/img/bg-battle.jpg` (ảnh AI pixel-art, cùng style với bg-menu.jpg): hành lang dungeon mặt cắt ngang — tường gạch đá phẳng suốt chiều ngang, cột đá nứt + đuốc trái, đuốc phải treo lệch độ cao, xích treo, mạng nhện, sàn đá có xương khô/rễ cây. Jame duyệt qua nhiều vòng mẫu (2 → 2b → 2c → ... → chốt bản 2o: hành lang ngang đơn giản, không cửa/lối đi).
- `css/style.css`: `.dg` dùng ảnh nền battle (inline base64 khi bundle); ẩn các lớp cảnh vẽ bằng CSS cũ (dg-bones/frame/arch/chain/torch/floor/rune) vì ảnh đã có sẵn; giữ lại sương trôi (dg-fog), bụi bay (dg-dust), vignette (dg-vig) cho chiều sâu/animation. Phòng boss: vignette + sương phủ tông đỏ.
- Test: `node tools/check.js` OK; `tap-test.js` 19/19 PASS trên Chromium mobile, không lỗi JS; đã chụp màn hình arena kiểm tra ảnh nền hiển thị.

## Cập nhật 2026-10-07 (5) — Áp dụng skill UI cộng đồng (vòng critique đầu tiên)
- Chạy workflow CRITIQUE (học từ `kens-designer`) lên màn hình battle: chụp ảnh, chấm theo heuristics.
- Phát hiện bug thật: rule `.dg > i { display: block }` có specificity cao hơn nên át `display: none` → cảnh CSS cũ vẫn đè lên ảnh bg-battle mới. Sửa bằng selector `.dg > i.dg-arch...` (style.css).
- Fix đọc tên quái: viền chữ pixel 4 hướng + đổ bóng (`.mname` text-shadow) vì tên quái bị chìm khi trùng đuốc nền.
- Fix "mystery meat" thanh thứ tự: bấm vào nhãn "⚡ Thứ tự" sẽ ghi giải thích vào nhật ký ("số là tốc độ — tốc cao đi trước, viền vàng là lượt hiện tại").
- Test: check OK, bundle OK, tap-test 19/19 PASS, không lỗi JS.

## Cập nhật 2026-10-07 (6) — Tách hàm lớn (clean-code) + nối tiến hóa vào co-op
**1. Tách 5 hàm "god function" thành hàm nhỏ (mỗi hàm 1 việc):**
- `renderShop` (83d) → shopHeader + shopBuyGear/shopBuyPots + shopSellWorn/shopSellGear/shopSellPots + builders (shopSec/shopNone/shopBtn/shopRow/shopConfirm/shopCmp)
- `render` (66d) → renderArena + renderMons + renderHead + renderActions + renderSkills + renderBag
- `perform` (56d) → dealHit + castHeal + castSkill (module-level, dùng chung cx)
- `coopApply` (41d) → coopSyncState + coopReward + coopEnd
- `openBag` (39d) → bagWorn + bagGear + bagPots + builders (bagSec/bagNone/bagBtn/bagRow)
- Giữ nguyên 100% hành vi (kể cả nút "Chắc chưa?" 2 lần bấm).
**5. Nối tiến hóa vào co-op:** `hostVictory()` gọi `autoEvo(p)` cho mỗi người chơi sau trận thắng — tự lên nhánh A (hoặc B nếu đủ điều kiện), log đồng bộ cho cả đội qua snapshot. Co-op không hiện popup chọn nhánh (tránh 2 người chọn lệch nhau).
- Test: check OK; evo-test 38/38; coop-evo-test 7/7 (mới); tap-test 19/19 (có flaky sẵn ở bước "cửa Chiến đấu" — code gốc cũng bị, không do refactor).

## Cập nhật 2026-10-08 — Đổi BG battle sang bản của Claude
- Jame gửi 2 file làm bên Claude (hamnguc-3_0_d5kh.html + hamnguc_1_z9nz.zip): bản đã đổi background battle.
- Đã lấy `assets/img/bg-battle.jpg` từ bản Claude (phòng dungeon kín: tường đá 3 mặt, đuốc trái/phải, xích treo, mạng nhện, cửa vòm bên phải, xương khô trên sàn) gắn vào bản mới nhất bên này.
- Giữ nguyên mọi code mới nhất (tách hàm clean-code, autoEvo co-op, fix specificity ẩn cảnh CSS cũ, viền chữ tên quái, tooltip thứ tự).
- CSS: `.dg` dùng `center bottom / cover` (theo bản Claude) để sàn đá nằm sát đáy sân khấu.
- Test: check OK, bundle OK, tap-test 19/19 PASS, không lỗi JS; đã chụp màn hình arena kiểm tra BG hiện đúng.

## Cập nhật 2026-10-08 (2) — Sửa lỗi trắng/không hiện UI trên web mobile (file > 1 MB bị cắt)
- Nguyên nhân: `dist/hamnguc.html` nặng ~2,1 MB; nơi lưu/host trên web mobile chỉ nhận tối đa 1 MiB (1.048.576 byte) nên file bị CẮT CỤT (mất `</html>`, JS không chạy → UI không hiện). Desktop/Claude xem trực tiếp không giới hạn nên vẫn chạy.
- Đã nén còn ~858 KB: `bg-battle.jpg`→`bg-battle.webp` (1920px, 120 KB), `bg-menu.jpg`→`bg-menu.webp` (1600px, 89 KB), `fire-sheet.png`→`fire-sheet.webp` (63 KB), font `.ttf`→`.woff` (8 KB, giữ đủ 358 ký tự). Đã sửa tham chiếu trong `css/style.css`, `js/fx.js`, `tools/bundle.js` (hỗ trợ webp).
- `tools/bundle.js` giờ in CẢNH BÁO (exit code 1) nếu `dist/hamnguc.html` > 1.000.000 byte. LUẬT MỚI: giữ file bundle < 1 MB; ảnh mới thêm phải là webp đã nén.
- Test: check.js OK; bản bundle chạy tốt ở 1280×720, 844×390, 390×844, không lỗi JS, font + ảnh nạp đủ.

## Cập nhật 2026-10-08 (3) — Dọn quy trình làm việc (bước 1 của kế hoạch quy trình mới)
- Claude: thêm `AGENTS.md` (luật chung cho mọi AI), `CLAUDE.md` (trỏ về AGENTS), `.gitignore` (bỏ `dist/`, `*.zip`), `tools/battle-shot.py` (chụp trận đấu thật, có chế độ điện thoại).
- Sửa chỗ cũ mâu thuẫn: README/ARCHITECTURE (bỏ `LAYOUT_PLAN.md` không tồn tại; layout `hl` giờ dùng cả điện thoại + co-op; thêm `evo.js` vào bản đồ; giao kết quả trỏ về AGENTS.md); đầu GHI_CHU đổi thành chú thích trỏ về AGENTS.md.
- Chưa làm: tạo kho GitHub, nối Cloudflare Pages, GitHub Actions (bước 2–5).

## Cập nhật 2026-10-08 (4) — Thanh thứ tự lượt hiện hình nhân vật/quái
- Claude: trong bố cục ngang `hl`, chip trên thanh "Lượt" trước chỉ có số tốc độ; giờ hiện thêm ảnh biểu tượng nhân vật/quái (icon sprite, hoặc emoji nếu chưa có sprite), số tốc độ nhỏ đè ở góc dưới phải. Chỉ sửa `css/layout-h.css` (bỏ `.oc > :not(small){display:none}`, thêm 3 luật cuối nhóm `.oc`); JS không đổi (`renderOrder` vốn đã sinh sẵn icon).
- Hạ tầng: kho GitHub `dat22032002/hamnguc` nối Cloudflare (Workers, tên `hamnguc-git`); thêm `wrangler.jsonc` + `.assetsignore` vào gốc dự án. Mỗi lần commit vào `main` Cloudflare tự đăng lại.
- Test: check.js OK; chụp 1280×720 và 844×390 (điện thoại) thấy icon + số rõ; chưa thử co-op và phòng trùm.

## Ghi chép từ bản dev (Muse) — đã hợp nhất 2026-10-08
- Tách hàm lớn (clean-code): renderShop, render, perform, coopApply, openBag — không đổi behavior.
- Co-op autoEvo: hostVictory() tự cho cả 2 người tiến hóa sau thắng trận (đủ điều kiện nhánh B thì B, không thì A).
- Fix CSS: ẩn cảnh vẽ cũ khi dùng ảnh bg-battle; viền chữ tên quái; bấm "Thứ tự" hiện giải thích.
- Test: evo solo 38/38, co-op evo 7/7, tap-test 19/19 (flaky đã biết ở cửa Chiến đấu).

## Cập nhật 2026-10-08 — Bỏ hiển thị stat tốc độ
- Muse: theo yêu cầu của Jame, bỏ số tốc độ trên chip thanh "Lượt" (chỉ còn icon nhân vật/quái) và bỏ dòng "⚡ tốc độ" trên thẻ quái trong trận.
- File: `js/render.js` (renderOrder, renderMonsters, tooltip), `css/layout-h.css` (xóa luật `.oc small` thừa).
- Logic tốc độ (thứ tự ra đòn, né tránh) giữ nguyên, chỉ bỏ phần hiển thị.
- Test: check.js OK, bundle 825KB, chụp màn hình kiểm tra, tap-test 19/19 PASS (2 lần fail giữa chừng ở cửa Chiến đấu do flaky đã biết, chạy lại pass).

## Cập nhật 2026-10-08 — Buff/debuff + skill quái xuống dưới thanh HP/MP
- Muse: theo yêu cầu của Jame, đưa hiển thị buff/debuff của nhân vật (`#player-status`), buff/debuff quái (`.mst`) và skill quái (`.msk`) xuống dưới thanh HP/MP, thu gọn font/khoảng cách.
- Trước đây 3 cụm này nổi lơ lửng quanh nhân vật/quái (cạnh bên/trên đầu) ở layout ngang.
- File: `css/layout-h.css` (3 selector). Không đổi JS/logic.
- Test: check.js OK, bundle 825KB, đo vị trí thực tế bằng JS (không đè nhau), chụp màn hình, tap-test 19/19 PASS (2 lần fail ở cửa Chiến đấu do flaky đã biết, chạy lại pass).

## Cập nhật 2026-10-08 — Đẩy nhân vật/quái lên cao tránh bị UI che
- Muse: theo phản hồi của Jame (trên mobile thật, debuff bị UI dưới che), tăng `bottom` của `#party` và `--feet` của `.mon` từ 68*m lên 88*m (lên cao thêm 20px).
- File: `css/layout-h.css` (2 dòng).
- Test: check.js OK, bundle 825KB, chụp màn hình kiểm tra, tap-test 19/19 PASS.

## Cập nhật 2026-10-08 — Icon buff/debuff sát thanh bar, bỏ viền khung
- Muse: theo yêu cầu của Jame, icon buff/debuff (`#player-status`, `.mst`) kéo sát vào thanh bar phía trên; bỏ background + viền khung chữ nhật, chỉ giữ icon.
- File: `css/layout-h.css` (3 selector: player-status, mst, msk).
- Test: check.js OK, bundle 825KB, chụp màn hình kiểm tra, tap-test 19/19 PASS.

## Cập nhật 2026-10-08 — Căn giữa nhân vật với thanh bar
- Muse: theo phản hồi của Jame (nhân vật trông lệch phải so với tên/thanh bar), sprite hiệp sĩ có kiếm chĩa sang phải làm trọng tâm thị giác lệch. Đẩy avatar sang trái 10*m bằng `translate` để thân người căn giữa với thanh bar (không ảnh hưởng layout).
- File: `css/layout-h.css` (1 dòng).
- Test: check.js OK, bundle 825KB, chụp cận cảnh kiểm tra.

## Cập nhật 2026-10-08 — Scene cửa hàng thương nhân
- Muse: theo yêu cầu của Jame, cửa Thương nhân giờ hiện scene riêng thay vì mở shop ngay: background shop (bg-shop.webp) + nhân vật thương nhân (merchant.webp, bấm được) + nút Rời đi.
- Luồng mới: vào cửa → scene → bấm thương nhân → mở shop → đóng shop quay lại scene → Rời đi để đi tiếp.
- Asset mới: assets/img/bg-shop.webp (102KB), assets/sprites/merchant.webp (35KB, nền trong suốt). Bundle 960KB (< 1MB).
- File: index.html (#shop-scene), css/style.css, js/shop.js (showShopScene/hideShopScene), js/rooms.js.
- Test: check.js OK, chụp màn hình scene, verify handler, tap-test 19/19 PASS.

## Cập nhật 2026-10-08 — Đổi hình thương nhân theo yêu cầu Jame
- Jame không thích hình thương nhân cũ (tự vẽ không cho xem mẫu trước — rút kinh nghiệm: từ giờ hình ảnh phải cho Jame chốt mẫu trước khi làm).
- Hình mới: thương nhân áo choàng bí ẩn, mắt vàng nham hiểm (không cười), ngồi trên thảm trơn, trước thảm bày vũ khí/trang bị, sau lưng 4 bao tải to nhỏ xếp ngay ngắn dưới đất.
- Asset: assets/sprites/merchant.webp (35KB). Bundle 960KB (< 1MB).

## Cập nhật 2026-10-08 — BG shop mới + chỉnh thương nhân
- Theo yêu cầu Jame: đổi BG shop sang hẻm chợ đen (bg-shop.webp mới, 83KB) cho hợp với thương nhân bí ẩn; Jame chốt mẫu sau khi sửa ánh sáng đèn lồng (bỏ tia xuyên tường, bỏ vệt bóng chéo, đuốc tím -> lửa cam).
- Thương nhân: thu nhỏ (cao 250px thay vì 340px), bỏ animation nhấp nhô, đặt ngồi dưới đèn lồng (trái 27%).
- Bài học: Jame yêu cầu xem mẫu trước khi làm với mọi thứ liên quan hình ảnh — đã tuân thủ từ vòng này.

## Cập nhật 2026-10-08 — Đòn mạnh ẩn + QTE đỡ/né
- Theo ý tưởng của Jame: mỗi quái có 1 đòn mạnh ẩn (không hiện trong list skill), tính là skill có cooldown riêng.
- Khi quái dùng đòn mạnh: hiện cảnh báo "⚠️ ĐÒN MẠNH!" + nút 🛡️ ĐỠ (Hiệp sĩ) / 💨 NÉ (class khác) trong 1.2s.
- Bấm kịp: đỡ giảm 70% sát thương, né tránh hoàn toàn. Không bấm: ăn đủ.
- File: js/combat.js (MSK thêm heavy, mkSk, heavyQTE, monsterAct async), js/render.js (ẩn skill heavy), js/coop.js (await), index.html + css/style.css (#qte).
- Test: check.js OK, bundle 939KB, QTE hiện/bấm được, tap-test 19/19 PASS, không lỗi JS.

## Cập nhật 2026-10-08 — QTE đỡ/né dùng nút Thủ có sẵn (bỏ popup)
- Theo ý Jame: bỏ popup QTE, dùng luôn nút "Thủ" đang hiện. Quái phát sáng đỏ 0.7s báo trước (class .telegraph), rồi nút Thủ phát sáng vàng để bấm.
- Bấm kịp: Hiệp sĩ đỡ (-70% st), class khác né (tránh hẳn). Không bấm: ăn đủ.
- File: index.html (bỏ #qte), css/style.css (bỏ #qte, thêm .telegraph + #btn-defend.qte-glow), js/combat.js (heavyQTE mới).
- Test: check OK, bundle 938KB, tap-test 19/19 PASS, không lỗi JS.

## Cập nhật 2026-10-08 — Nút Thủ chỉ dùng ở lượt quái, Tu sĩ/Pháp sư đổi thành Né
- Theo yêu cầu Jame: bỏ action Phòng thủ ở lượt người chơi; nút Thủ/Né chỉ sáng để bấm khi quái tung đòn mạnh (QTE).
- Tu sĩ và Pháp sư: nút đổi thành "💨 Né tránh"/"Né"; Hiệp sĩ và Sát thủ giữ "🛡️ Phòng thủ"/"Thủ".
- File: js/render.js (renderActions luôn khóa nút, render đổi nhãn theo class), js/combat.js (bỏ act defend, QTE phân biệt né/đỡ).
- Test: check OK, bundle 939KB, tap-test 19/19 PASS (lần đầu 2 FAIL do flaky cửa Chiến đấu đã biết, chạy lại PASS).
