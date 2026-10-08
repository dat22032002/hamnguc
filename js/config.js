/* js/config.js — CONFIG: toàn bộ số liệu cân bằng game (người chơi, lên cấp, rơi đồ, nghỉ, solo). */
/* =====================================================
   PHẦN 1: CẤU HÌNH (chỉnh số liệu cân bằng game ở đây)
   Sau này thêm cấp độ / roguelike: thêm danh sách quái,
   chỉ số tăng theo tầng... vào phần này.
   ===================================================== */
const CONFIG = {
  player: { name: "Hiệp sĩ", maxHp: 100, atkMin: 10, atkMax: 18, critChance: 0.15, evasion: 0.05,
            healMin: 20, healMax: 30, healUses: 3, defendReduce: 0.6 },
  // Tăng cấp: XP cần = baseXp + (cấp - 1) * xpPerLevel + (cấp - 1)² * xpPerLevel2 (số càng lớn càng lên cấp chậm). Mỗi lần lên cấp nhận các phần thưởng dưới đây.
  levelUp: { baseXp: 50, xpPerLevel: 25, xpPerLevel2: 1.5, hp: 15, atk: 2, healUses: 1, healPercent: 0.4, manaPercent: 0.4 },   // CHỈ hồi máu / mana khi lên cấp (healPercent / manaPercent = % tối đa)
  // Mỗi tầng: đợt 1 → đợt 2 → chọn phòng → đợt 3 (đợt cuối: tinh anh, tầng 3/8/13... là boss phụ, tầng 5/10/15... là boss chính)
  waves: 3, miniBossAt: 3,
  // Nghỉ giữa các đợt (sau mỗi đợt quái thường/tinh anh/boss, KHÔNG tính đợt tập kích): chọn Nghỉ ngắn (an toàn, hồi ít) hoặc Nghỉ dài (hồi nhiều nhưng có tỉ lệ bị tập kích).
  // Bị tập kích = KHÔNG hồi gì hết + phải đánh 1 đợt quái riêng (không tính vào đợt của tầng). Co-op: 2 người bỏ phiếu, khác ý thì game random.
  rest: { shortHp: 0.15, shortMana: 0.15, longHp: 0.45, longMana: 0.5, ambush: 0.3 },
  // Chỉ số quái tính theo CẤP quái (cấp quái bám theo cấp người chơi). Mỗi cấp quái mạnh thêm lvScale; cứ bossEvery tầng gặp trùm.
  boss: { name: "Rồng Lửa", avatar: "🐉", evasion: 0.1, maxHp: 380, atkMin: 20, atkMax: 30, xp: 220, spd: 12 },
  bossEvery: 5,
  lvScale: 0.1,
  lvScale2: 0.006,      // tăng thêm theo bình phương cấp quái, để đời sau không quá dễ (chỉnh số này để cân bằng)
  /* RƠI ĐỒ sau mỗi tầng. Nguồn: normal (quái thường) · elite (tinh anh) · boss (trùm) · treasure (kho báu).
     gearChance: tỉ lệ rơi trang bị · gearW: trọng số [Thường, Cao cấp, Hiếm, Huyền thoại]
     itemChance: tỉ lệ rơi vật phẩm (thuốc) · itemW: trọng số [Thường, Cao cấp, Hiếm] · bossExtraItem: tỉ lệ trùm rơi thêm 1 vật phẩm */
  drop: {
    gearChance: { normal: .40, elite: 1, boss: 1, treasure: 1 },
    gearW: { normal: [58, 30, 11, 1], elite: [25, 40, 28, 7], boss: [0, 30, 50, 20], treasure: [25, 40, 28, 7] },   // rương: ngon ngang tinh anh, không hơn
    itemChance: { normal: .5, elite: .75, boss: 1 }, bossExtraItem: .5,
    itemW: { normal: [70, 25, 5], elite: [45, 40, 15], boss: [20, 50, 30] }
  },
  /* VÀNG (💰): rơi từ quái sau mỗi đợt + rương (Kho báu, rương cũ ở Phòng bí ẩn). Chỉ solo.
     mon: [thấp, cao] vàng gốc mỗi quái theo cỡ s/m/l · nhân thêm: tinh anh / boss phụ / trùm · floorScale: +% mỗi tầng · may mắn cộng thêm theo luckDrop */
  gold: {
    start: 20,
    mon: { s: [4, 8], m: [10, 18], l: [22, 36] }, eliteMul: 1.8, miniMul: 2.5, bossMul: 4,
    floorScale: 0.12,
    chest: { treasure: [25, 45], mystery: [15, 35] }
  },
  /* THƯƠNG NHÂN. Giá trang bị = gearBase + điểm chỉ số x gearPerScore (làm tròn 5). Bán lại = sellRate x giá mua.
     wander: thương nhân lang thang, gặp 1 lần mỗi tầng (trước khi chọn cửa): bán gear món trang bị + pots vật phẩm, giá nhân priceMul, thu mua lại sellRate x giá mua.
     pots: [loại, bậc (0 Thường / 1 Cao cấp / 2 Hiếm), số lượng] */
  shop: {
    gearBase: 8, gearPerScore: 2.6, sellRate: 0.4,
    potion: { hp: [14, 28, 55], mp: [12, 24, 48], cure: [10, 26, 44] },
    wander: { gear: 4, pots: [["hp", 0, 2], ["hp", 1, 2], ["hp", 2, 1], ["mp", 1, 2], ["cure", 1, 2]], priceMul: 1.15, sellRate: 0.55 }
  },
  /* BẢN ĐỒ TẦNG (hệ thống mới): mỗi tầng = `zones` khu vực, mỗi khu vực chọn 1 trong 3 lối đi, sau đó vào phòng boss.
     hideMin/hideMax: mỗi lần chọn có ngẫu nhiên từ hideMin đến hideMax lối bị ẩn (hiện "❓ Chưa rõ").
     Thương nhân / Nghỉ ngơi không bao giờ bị ẩn, Bẫy luôn bị ẩn. (Đã nối vào luồng solo — xem GHI_CHU.md) */
  map: { zones: 5, hideMin: 1, hideMax: 2,
         w: { fight: 40, treasure: 10, trap: 12, blessing: 8, merchant: 10, rest: 12 },   // trọng số xuất hiện của từng loại lối đi
         eliteChance: 0.25 },                                                                // lối "Chiến đấu" là tinh anh (chỉ từ tầng solo.eliteFrom) — người chơi vẫn chỉ thấy chữ "Chiến đấu"
  monsterDelayMs: 700,  // thời gian chờ trước khi quái ra đòn
  speedEvasion: 0.005,  // mỗi 1 điểm tốc độ hơn/kém đối thủ: +/-0,5% né
  luckCrit: 0.01,       // mỗi 1 điểm may mắn: +1% tỉ lệ chí mạng
  luckDrop: 0.01,       // mỗi 1 điểm may mắn: +1% tỉ lệ rơi trang bị / vật phẩm (cộng thẳng vào tỉ lệ, tối đa 100%)
  luckRarity: 0.03,     // mỗi 1 điểm may mắn: trọng số phẩm chất tăng +3% x bậc (Cao cấp +3%, Hiếm +6%, Huyền thoại +9%) nên đồ ngon dễ ra hơn
  // Riêng chế độ chơi một mình (co-op không dùng). Chỉnh số ở đây để cân bằng solo.
  solo: {
    hp: 0.8, atk: 0.8,          // quái thường: nhân máu / sát thương
    bossHp: 0.6, bossAtk: 0.7,  // trùm: nhân THÊM
    eliteMul: 0.75,                  // tinh anh: nhân THÊM (cả máu lẫn sát thương)
    xp: 0.7,                          // nhân kinh nghiệm (solo)
    startPotions: 2,   // số Thuốc máu (Thường) mang theo lúc bắt đầu
    gearBag: 10,        // số ô chứa TRANG BỊ trong túi đồ
    eliteFrom: 4,                // tinh anh chỉ xuất hiện từ tầng này
    floorScale: 0.05                 // mỗi tầng quái mạnh thêm %
  }
};

