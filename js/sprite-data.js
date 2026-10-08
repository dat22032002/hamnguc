/* js/sprite-data.js — Dữ liệu sprite nhân vật: đường dẫn ảnh sheet + bảng hoạt ảnh (SPRITE_DATA). Thêm/đổi hình nhân vật ở đây. */
/* =====================================================
   DỮ LIỆU SPRITE NHÂN VẬT (ảnh PNG nhúng dạng base64)
   - src : bảng sprite, mỗi khung 100x100, mỗi hàng 1 hoạt ảnh
   - rows: [chỉ số hàng, số khung] cho từng hoạt ảnh (idle, walk, atk1, atk2, atk3, hurt, death)
   - box : [x, y, rộng, cao] vùng cắt từ mỗi khung 100x100 (đủ chứa cả vệt chém / phép)
   - core: [x, y, rộng, cao] thân nhân vật, dùng để canh vị trí / kích thước trong giao diện
   - icon: ảnh nhỏ dùng làm biểu tượng (thẻ chọn class, thanh thứ tự đánh...)
   Muốn đổi nhân vật: thay đúng 1 mục (knight / mage / cleric) bằng sheet mới.
   ===================================================== */
const SPR_KNIGHT = {
  src: "assets/sprites/knight.png",
  icon: "assets/sprites/knight-icon.png",
  rows: { idle: [0, 6], walk: [1, 8], atk1: [2, 7], atk2: [3, 10], atk3: [4, 11], block: [5, 4], hurt: [6, 4], death: [7, 4] },
  box: [30, 24, 64, 36], core: [38, 36, 20, 23]
};
const SPR_PRIEST = {
  src: "assets/sprites/priest.png",
  icon: "assets/sprites/priest-icon.png",
  rows: { idle: [0, 6], walk: [1, 8], atk1: [3, 9], atk2: [2, 9], atk3: [2, 9], heal: [5, 6], block: [6, 6], hurt: [8, 4], death: [9, 4] },
  box: [34, 22, 66, 42], core: [37, 35, 22, 26], sc: 0.9   // thân Priest cao hơn Hiệp sĩ ~10% → thu 0.9; core canh giữa thân (x≈51), cùng cỡ khung với Hiệp sĩ
};
const SPR_WIZARD = {
  src: "assets/sprites/wizard.png",
  icon: "assets/sprites/wizard-icon.png",
  rows: { idle: [0, 6], walk: [1, 8], atk1: [3, 6], atk2: [6, 9], atk3: [6, 9], fire: [6, 9], ice: [3, 6], block: [3, 6], hurt: [8, 4], death: [9, 4] },
  box: [34, 28, 50, 34], core: [37, 37, 20, 23]   // thân Wizard cao bằng Hiệp sĩ (sc = 1); core canh theo tâm đầu
};
const SPR_SWORDMASTER = {
  src: "assets/sprites/swordmaster.webp",
  icon: "assets/sprites/swordmaster-icon.webp",
  rows: { idle: [0, 6], walk: [1, 8], atk1: [2, 7], atk2: [3, 15], atk3: [4, 12], hurt: [5, 5], death: [6, 4] },
  box: [32, 26, 68, 40], core: [42, 36, 22, 24]   // sheet 15x7 ô 100px: atk2 chém dài 15 khung, atk3 kiếm khí xanh 12 khung; core canh thân
};
/* QUÁI: Dơi Đêm (sheet 7 cột x 5 hàng, khung 100x100). idle dùng hàng bay · atk1 = lao cắn (vệt gió) · atk2 = vuốt (vết cào đỏ) */
const SPR_BAT = {
  src: "assets/sprites/bat.png",
  icon: "assets/sprites/bat-icon.png",
  rows: { idle: [0, 6], atk1: [1, 6], atk2: [2, 7], hurt: [3, 4], death: [4, 4] },
  box: [20, 28, 58, 38], core: [38, 33, 22, 22], sc: 0.7   // box đối xứng quanh tâm thân (x=49) để lật ngang không bị lệch
};
// Hiệp sĩ = Knight · Kiếm sư = Swordmaster · Nữ tu sĩ = Priest · Pháp sư = Wizard
const SPRITE_DATA = { knight: SPR_KNIGHT, swordmaster: SPR_SWORDMASTER, mage: SPR_WIZARD, cleric: SPR_PRIEST, bat: SPR_BAT };   // bat = quái (gắn qua trường sprite trong MT)
