/* js/classes.js — Biến trạng thái toàn cục (state, animSpeed, gameId) + CLASSES: 4 class và 5 kỹ năng mỗi class. */
/* =====================================================
   PHẦN 2: TRẠNG THÁI GAME (mọi dữ liệu thay đổi nằm đây)
   ===================================================== */
let state;
let animSpeed = 1;   // 1 = chậm (mặc định) · 2 = nhanh, đúng gấp đôi x1
try { if (localStorage.getItem("rpgAnim") === "2") animSpeed = 2; } catch (e) {}
const TS_X1 = 2.5, TS = () => animSpeed === 2 ? TS_X1 / 2 : TS_X1, sleep = ms => new Promise(r => setTimeout(r, ms * TS()));
function setAnimSpeed(v, save) {
  animSpeed = v; document.documentElement.style.setProperty("--ts", TS());
  const b = $("speedbtn"); if (b) { b.textContent = v === 2 ? "⏩ x2" : "▶ x1"; b.classList.toggle("on", v === 2); }
  if (save) try { localStorage.setItem("rpgAnim", v); } catch (e) {}
}

/* ----- CLASS: mỗi class 5 kỹ năng (c = mana, t = loại, m = hệ số sát thương, a = lượng hồi)
         tier: basic (cơ bản) · adv (nâng cao) · ult (tối thượng, luôn là kỹ năng số 5, nút lớn cuối bảng Kỹ năng)
         cdn: hồi chiêu (số lượt phải chờ sau khi dùng; giảm 1 sau mỗi lượt của chủ và thêm 1 sau mỗi trận thắng) ----- */
const CLASSES = {
  knight: { name: "Hiệp sĩ", icon: "🤺", wp: "🛡️", col: "#5b8def", role: "Tank", tag: "Chắn đòn, bảo vệ cả đội", rt: [5, 2, 2, 3], hp: 185, mana: 60, rg: 9, lv: { hp: 18, atk: 2 }, a: [8, 13], crit: .07, luck: 3, cd: 1.5, spd: 8, eva: .03, red: .6, sk: [
    { n: "Khiêu khích", tier: "basic", cdn: 2, i: "📣", c: 10, t: "taunt", dur: 4, d: "Hút đòn 3 lượt, giảm 40% sát thương",
      evo: { exp: 100, xp: { use: 10 },
        a: { n: "Khiêu khích thép", d: "Hút đòn 6 lượt, giảm 40% sát thương", dur: 6 },
        b: { n: "Khiêu khích dồn dập", d: "Hút đòn 5 lượt, tốn 6 mana, hồi chiêu 1 lượt", dur: 5, c: 6, cdn: 1, cond: { k: "uses", n: 10, txt: "Dùng Khiêu khích đủ 10 lần" } } } },
    { n: "Đập khiên", tier: "basic", cdn: 1, i: "🔨", c: 12, t: "hit", m: 1.6, ls: 0.4, st: [["stun", 1, .3]], d: "Đòn mạnh 1 mục tiêu, hút 40% sát thương thành máu, 30% gây choáng",
      evo: { exp: 100, xp: { use: 10, stuns: 15 },
        a: { n: "Đập khiên chấn động", d: "Đòn cực mạnh 1 mục tiêu, hút 50% sát thương thành máu, 30% gây choáng", m: 2.4, ls: 0.5 },
        b: { n: "Đập khiên áp chế", d: "Đòn mạnh 1 mục tiêu, hút 40% sát thương thành máu, 55% gây choáng", m: 2.0, st: [["stun", 1, .55]], cond: { k: "stuns", n: 5, txt: "Gây choáng bằng Đập khiên đủ 5 lần" } } } },
    { n: "Tường thép", tier: "adv", cdn: 3, i: "🧱", c: 15, t: "guard", dur: 4, d: "Giảm 70% sát thương 3 lượt",
      evo: { exp: 100, xp: { use: 10 },
        a: { n: "Tường thành", d: "Giảm 70% sát thương 6 lượt", dur: 6 },
        b: { n: "Tường thép cơ động", d: "Giảm 70% sát thương 5 lượt, tốn 10 mana", dur: 5, c: 10, cond: { k: "uses", n: 8, txt: "Dùng Tường thép đủ 8 lần" } } } },
    { n: "Hồi sức", i: "💪", c: 14, tier: "adv", cdn: 3, t: "heal", a: 45, d: "Hồi máu cho người yếu nhất (bản thân khi chơi một mình)",
      evo: { exp: 100, xp: { use: 10, clutch: 20 },
        a: { n: "Hồi sức mạnh", d: "Hồi 70 máu cho người yếu nhất", a: 70 },
        b: { n: "Hồi sức thần tốc", d: "Hồi 60 máu cho người yếu nhất, hồi chiêu chỉ 1 lượt", a: 60, cdn: 1, cond: { k: "clutch", n: 3, txt: "Cứu nguy đủ 3 lần (hồi máu khi mục tiêu dưới 30% máu)" } } } },
    { n: "Xung kích", tier: "ult", cdn: 6, i: "💥", c: 25, t: "aoe", m: 1.8, ls: 0.5, d: "Đánh mọi quái, hút 50% sát thương thành máu",
      evo: { exp: 150, xp: { use: 10, kills: 15 },
        a: { n: "Xung kích hủy diệt", d: "Đánh mọi quái cực mạnh, hút 60% sát thương thành máu", m: 2.6, ls: 0.6 },
        b: { n: "Xung kích liên hoàn", d: "Đánh mọi quái, hồi chiêu chỉ 4 lượt", m: 2.2, cdn: 4, cond: { k: "kills", n: 8, txt: "Hạ đủ 8 quái bằng Xung kích" } } } } ] },
  swordmaster: { name: "Kiếm sư", icon: "⚔️", wp: "🗡️", col: "#38bdf8", role: "DPS", tag: "Chém liên hoàn, kiếm khí sắc bén", rt: [1, 5, 5, 1], hp: 130, mana: 60, lv: { hp: 20, atk: 2 }, a: [13, 19], crit: .15, luck: 6, cd: 1.6, spd: 14, eva: .10, red: .5, sk: [
    { n: "Chém ngang", tier: "basic", cdn: 1, i: "🗡️", c: 10, t: "hit", m: 2.2, d: "Chém mạnh 1 mục tiêu",
      evo: { exp: 100, xp: { use: 10 },
        a: { n: "Chém ngang phá sơn", d: "Chém cực mạnh 1 mục tiêu", m: 3.0 },
        b: { n: "Chém ngang thần tốc", d: "Chém mạnh 1 mục tiêu, tốn 6 mana", m: 2.6, c: 6, cond: { k: "uses", n: 10, txt: "Dùng Chém ngang đủ 10 lần" } } } },
    { n: "Kiếm khí", tier: "basic", cdn: 2, i: "💨", c: 12, t: "hit", m: 1.7, st: [["bleed", 3, .5, .25]], d: "Phóng kiếm khí, 50% gây chảy máu 3 lượt",
      evo: { exp: 100, xp: { use: 10 },
        a: { n: "Kiếm khí phá không", d: "Phóng kiếm khí mạnh, 70% gây chảy máu 3 lượt", m: 2.4, st: [["bleed", 3, .7, .25]] },
        b: { n: "Kiếm khí liên phát", d: "Phóng kiếm khí, tốn 8 mana", m: 2.0, c: 8, cond: { k: "uses", n: 8, txt: "Dùng Kiếm khí đủ 8 lần" } } } },
    { n: "Liên trảm", tier: "adv", cdn: 2, i: "🌀", c: 18, t: "multi", m: .9, d: "3 nhát chém liên hoàn ngẫu nhiên",
      evo: { exp: 100, xp: { use: 10, kills: 15 },
        a: { n: "Liên trảm cuồng phong", d: "3 nhát chém cuồng phong ngẫu nhiên", m: 1.2 },
        b: { n: "Liên trảm chớp nhoáng", d: "3 nhát chém liên hoàn, tốn 12 mana, hồi chiêu 1 lượt", c: 12, cdn: 1, cond: { k: "kills", n: 6, txt: "Hạ đủ 6 quái bằng Liên trảm" } } } },
    { n: "Ngự kiếm", tier: "adv", cdn: 3, i: "🛡️", c: 14, t: "guard", dur: 3, d: "Giảm 70% sát thương 3 lượt",
      evo: { exp: 100, xp: { use: 10 },
        a: { n: "Ngự kiếm kim cang", d: "Giảm 70% sát thương 5 lượt", dur: 5 },
        b: { n: "Ngự kiếm linh động", d: "Giảm 70% sát thương 3 lượt, tốn 10 mana, hồi chiêu 2 lượt", c: 10, cdn: 2, cond: { k: "uses", n: 8, txt: "Dùng Ngự kiếm đủ 8 lần" } } } },
    { n: "Vạn kiếm quy tông", tier: "ult", cdn: 6, i: "🌊", c: 32, t: "aoe", m: 2.4, d: "Kiếm khí xanh chém mọi quái",
      evo: { exp: 150, xp: { use: 10, kills: 15 },
        a: { n: "Vạn kiếm diệt thế", d: "Kiếm khí hủy diệt chém mọi quái", m: 3.4 },
        b: { n: "Vạn kiếm liên miên", d: "Kiếm khí xanh chém mọi quái, hồi chiêu chỉ 4 lượt", m: 2.8, cdn: 4, cond: { k: "kills", n: 8, txt: "Hạ đủ 8 quái bằng Vạn kiếm quy tông" } } } } ] },
  cleric: { name: "Nữ tu sĩ", icon: "😇", wp: "✝️", col: "#f2c230", role: "Healer", tag: "Hồi máu, hồi sinh đồng đội", rt: [3, 2, 3, 5], hp: 130, mana: 90, lv: { hp: 28, atk: 3 }, a: [12, 17], crit: .03, luck: 5, cd: 1.5, spd: 10, eva: .05, red: .5, sk: [
    { n: "Chữa lành", tier: "basic", cdn: 1, i: "💚", c: 12, t: "heal", a: 55, d: "Hồi cho người yếu nhất, giải trừ hiệu ứng xấu" },
    { n: "Trừng phạt", i: "⚡", c: 8, tier: "basic", cdn: 1, t: "hit", m: 1.8, d: "Giáng sét thánh lên 1 mục tiêu" },
    { n: "Thánh quang", tier: "adv", cdn: 3, i: "✨", c: 24, t: "smite", m: 1.6, a: 30, d: "Đánh mọi quái và hồi máu cả đội" },
    { n: "Phước lành", tier: "adv", cdn: 4, i: "🙏", c: 16, t: "buff", dur: 5, d: "Cả đội +40% sát thương 4 lượt" },
    { n: "Tái sinh", tier: "ult", cdn: 6, i: "🕊️", c: 30, t: "revive", d: "Hồi sinh đồng đội (60% máu) và hồi 30% máu cả đội; không ai gục thì hồi 60% máu cả đội" }] },
  mage: { name: "Pháp sư", icon: "🧙", wp: "🔮", col: "#ff7a45", role: "AOE", tag: "Thiêu rụi cả bầy quái", rt: [2, 5, 3, 2], hp: 140, mana: 110, lv: { hp: 28, atk: 2 }, a: [7, 11], crit: .07, luck: 5, cd: 1.6, spd: 10, eva: .05, red: .5, sk: [
    { n: "Cầu lửa", tier: "basic", cdn: 1, i: "🔥", c: 10, t: "hit", m: 3.2, st: [["burn", 3, .5, .2]], d: "Sát thương lớn 1 mục tiêu, 50% gây bỏng" },
    { n: "Tia sét", i: "🌩️", c: 7, tier: "basic", cdn: 1, t: "hit", m: 2.0, d: "Tia sét nhanh lên 1 mục tiêu" },
    { n: "Bão lửa", tier: "adv", cdn: 2, i: "🌪️", c: 22, t: "aoe", m: 1.7, d: "Đánh mọi quái" },
    { n: "Băng giá", tier: "adv", cdn: 4, i: "❄️", c: 26, t: "freeze", m: .7, st: [["freeze", 1, .75]], d: "Đánh mọi quái, 75% đóng băng 1 lượt (sau đó kháng khống chế)" },
    { n: "Thiên thạch", tier: "ult", cdn: 6, i: "☄️", c: 42, t: "aoe", m: 4.2, d: "Đòn hủy diệt mọi quái" }] }
};
let gameId = 0, myClass = "knight";
try { const c = localStorage.getItem("rpgClass"); if (CLASSES[c]) myClass = c; } catch (e) {}

