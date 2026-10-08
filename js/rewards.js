/* js/rewards.js — Phần thưởng lên cấp (REWARDS) và lưu kỷ lục (roguelike). */
/* =====================================================
   PHẦN 5B: ROGUELIKE (phần thưởng sau mỗi tầng + kỷ lục)
   Thêm phần thưởng mới: thêm một dòng vào REWARDS.
   ===================================================== */
const REWARDS = [
  { icon: "❤️", name: "Tim sắt",     desc: "+25 máu tối đa, hồi 25",  apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { icon: "⚔️", name: "Kiếm sắc",    desc: "+3 sát thương",           apply: p => { p.atkMin += 3; p.atkMax += 3; } },
  { icon: "🎯", name: "Mắt đại bàng", desc: "+10% chí mạng",           apply: p => { p.critChance = Math.min(0.7, p.critChance + 0.1); } },
  { icon: "🔷", name: "Pha lê mana", desc: "+25 mana tối đa, hồi đầy",  apply: p => { p.maxMana += 25; p.mana = p.maxMana; } },
  { icon: "💧", name: "Hấp thụ",     desc: "+3 hồi mana mỗi lượt",     apply: p => { p.regen += 3; } },
  { icon: "🛡️", name: "Khiên cứng",  desc: "Phòng thủ giảm thêm 10%", apply: p => { p.defendReduce = Math.min(0.85, p.defendReduce + 0.1); } },
  { icon: "👟", name: "Giày nhẹ",    desc: "+8% né tránh",            apply: p => { p.evasion = Math.min(0.6, p.evasion + 0.08); } },
  { icon: "🍀", name: "Cỏ bốn lá",   desc: "+4 may mắn (+4% chí mạng, đồ rơi nhiều và ngon hơn)", apply: p => { p.luck += 4; } },
  { icon: "💢", name: "Đòn hiểm",    desc: "+25% sát thương chí mạng", apply: p => { p.critDmg = Math.round((p.critDmg + 0.25) * 100) / 100; } },
  { icon: "🔰", name: "Ý chí thép", desc: "+12% kháng hiệu ứng", apply: p => { p.res = Math.min(.8, (p.res || 0) + 0.12); } },
  { icon: "🏃", name: "Nước rút",    desc: "+3 tốc độ",                apply: p => { p.spd += 3; } },
  { icon: "🏕️", name: "Nghỉ ngơi",   desc: "Hồi 60% máu tối đa",      apply: p => { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.6)); } }
];

let rewardFree = false;   // true: phần thưởng tặng không (bàn thờ), không tốn lượt chọn lên cấp
function showRewards(free) {
  rewardFree = !!free;
  const p = state.player, picks = [...REWARDS].sort(() => Math.random() - 0.5).slice(0, 3), list = $("reward-list");
  $("reward").querySelector("h2").textContent = free ? "⛩️ Bàn thờ ban phúc" : "⭐ Lên cấp " + p.level + "!";
  $("reward").querySelector("p").textContent = free ? "Chọn 1 nâng cấp" : "Chọn 1 nâng cấp chỉ số" + (p.pending > 1 ? " (còn " + p.pending + " lần chọn)" : "");
  list.innerHTML = "";
  picks.forEach(r => {
    const b = document.createElement("button");
    b.textContent = r.icon + " " + r.name + " — " + r.desc;
    b.onclick = () => chooseReward(r);
    list.appendChild(b);
  });
  $("reward").classList.add("show");
}

function chooseReward(r) {
  const p = state.player;
  r.apply(p);
  log("🎁 Nhận: " + r.name + " (" + r.desc + ")", "good");
  $("reward").classList.remove("show");
  const free = rewardFree;   // true = bàn thờ ở phòng bí ẩn (không phải sau trận)
  if (!rewardFree && p.pending > 0) p.pending--;
  rewardFree = false;
  if (p.pending > 0) { render(); return showRewards(); }   // lên nhiều cấp: chọn tiếp
  free ? advance() : postFight();
}

function saveBest(floor) {
  let best = floor;
  try { best = Math.max(floor, +localStorage.getItem("rpgBest") || 0); localStorage.setItem("rpgBest", best); } catch (e) {}
  return best;
}

