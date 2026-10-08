/* js/classes.js — Biến trạng thái toàn cục (state, animSpeed, gameId) + CLASSES: 4 class và 5 kỹ năng mỗi class. */
/* =====================================================
   PHẦN 2: TRẠNG THÁI GAME (mọi dữ liệu thay đổi nằm đây)
   ===================================================== */
let state;
let animSpeed = 1;   // 1 = chậm (mặc định, gấp đôi thời gian cũ) · 2 = nhanh (bằng tốc độ cũ)
try { if (localStorage.getItem("rpgAnim") === "2") animSpeed = 2; } catch (e) {}
const TS = () => 2 / animSpeed, sleep = ms => new Promise(r => setTimeout(r, ms * TS()));
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
  assassin: { name: "Sát thủ", icon: "🥷", wp: "🗡️", col: "#8a5cf5", role: "DPS", tag: "Nhanh, chí mạng, ra đòn chí tử", rt: [1, 5, 5, 1], hp: 110, mana: 50, lv: { hp: 16, atk: 2 }, a: [14, 20], crit: .22, luck: 8, cd: 1.7, spd: 16, eva: .15, red: .5, sk: [
    { n: "Đâm lén", tier: "basic", cdn: 1, i: "🗡️", c: 10, t: "hit", m: 2.2, st: [["bleed", 3, .6, .3]], d: "Sát thương lớn 1 mục tiêu, 60% gây chảy máu" },
    { n: "Phi tiêu", i: "🎯", c: 6, tier: "basic", cdn: 1, t: "hit", m: 1.5, d: "Ném phi tiêu, sát thương vừa 1 mục tiêu" },
    { n: "Liên hoàn", tier: "adv", cdn: 2, i: "🌀", c: 18, t: "multi", m: .8, d: "3 nhát chém ngẫu nhiên" },
    { n: "Ẩn thân", tier: "adv", cdn: 3, i: "🌫️", c: 14, t: "hide", d: "Né cao + chí mạng 2 lượt" },
    { n: "Tử huyệt", tier: "ult", cdn: 6, i: "☠️", c: 28, t: "hit", m: 5.0, d: "Đòn chí tử 1 mục tiêu" }] },
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

