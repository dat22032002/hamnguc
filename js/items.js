/* js/items.js — Vật phẩm và trang bị: độ hiếm, rơi đồ, túi đồ, mặc/tháo đồ, màn nhặt đồ. */
/* =====================================================
   PHẦN 5C: ITEM VÀ TRANG BỊ
   3 ô trang bị: vũ khí, giáp, phụ kiện. Đồ rơi từ quái, càng lên tầng càng mạnh.
   Thêm loại đồ: thêm tên vào names, hoặc thêm ô mới vào SLOTS.
   ===================================================== */
/* Trang bị có 4 cấp: Thường (1 chỉ số) · Cao cấp (2) · Hiếm (3) · Huyền thoại (4). Vật phẩm (thuốc) chỉ có 3 cấp đầu. */
const RARITIES = [
  { name: "Thường",     mult: 1,    icon: "⚪" },
  { name: "Cao cấp",    mult: 1.35, icon: "🟢" },
  { name: "Hiếm",       mult: 1.8,  icon: "🟣" },
  { name: "Huyền Thoại", mult: 2.6, icon: "🟠" }
];
/* TRANG BỊ THEO CLASS: 3 ô (weapon/armor/charm là khóa), tên + icon + chỉ số tùy class. main/sub = [chỉ số, giá trị gốc]. 4 tên = Thường/Cao cấp/Hiếm/Huyền thoại */
const GEAR = {
  knight: { weapon: { icon: "🗡️", label: "Kiếm", names: ["Kiếm gỉ", "Trường kiếm", "Thánh kiếm", "Kiếm Thần Long"], main: ["atk", 3], sub: ["critdmg", .10] },
            armor:  { icon: "🥋", label: "Giáp", names: ["Giáp da", "Giáp xích", "Giáp thép", "Giáp Bất Diệt"], main: ["hp", 20], sub: ["spd", 1] },
            charm:  { icon: "🛡️", label: "Khiên", names: ["Khiên gỗ", "Khiên sắt", "Khiên rồng", "Khiên Thái Cổ"], main: ["red", .04], sub: ["res", .06] } },
  swordmaster: { weapon: { icon: "🗡️", label: "Kiếm", names: ["Kiếm rỉ", "Trường kiếm", "Bảo kiếm", "Thần Kiếm Vô Song"], main: ["atk", 3], sub: ["critdmg", .12] },
            armor:  { icon: "🥋", label: "Võ phục", names: ["Võ phục vải", "Võ phục lụa", "Võ phục gấm", "Võ Phục Thiên Tằm"], main: ["evasion", .03], sub: ["spd", 2] },
            charm:  { icon: "📿", label: "Ngọc bội", names: ["Ngọc thô", "Ngọc bích", "Ngọc linh", "Ngọc Bội Long Văn"], main: ["crit", .04], sub: ["res", .05] } },
  cleric: { weapon: { icon: "⚕️", label: "Quyền trượng", names: ["Gậy gỗ", "Trượng thánh", "Trượng ánh sáng", "Trượng Tinh Tú"], main: ["mana", 12], sub: ["atk", 2] },
            armor:  { icon: "👘", label: "Áo tu nữ", names: ["Áo vải thô", "Áo thánh", "Thánh y", "Thiên Sứ Pháp Y"], main: ["hp", 15], sub: ["spd", 1] },
            charm:  { icon: "📿", label: "Chuỗi hạt", names: ["Chuỗi gỗ", "Chuỗi bạc", "Chuỗi thánh", "Chuỗi Hạt Cứu Thế"], main: ["mana", 10], sub: ["res", .06] } },
  mage:   { weapon: { icon: "🔮", label: "Pháp trượng", names: ["Gậy cành khô", "Trượng pháp sư", "Trượng thiên thạch", "Trượng Hỗn Mang"], main: ["atk", 3], sub: ["critdmg", .10] },
            armor:  { icon: "🥼", label: "Áo pháp sư", names: ["Áo vải", "Áo bùa", "Áo đại pháp", "Áo Choàng Tinh Vân"], main: ["hp", 10], sub: ["spd", 1] },
            charm:  { icon: "📖", label: "Sách phép", names: ["Sách cũ", "Sách lửa", "Cổ thư", "Cổ Thư Vô Cực"], main: ["mana", 15], sub: ["res", .05] } }
};
const STAT_TEXT = {
  atk: v => "+" + v + " sát thương", hp: v => "+" + v + " máu", mana: v => "+" + v + " mana", red: v => "+" + Math.round(v * 100) + "% giảm sát thương",
  evasion: v => "+" + Math.round(v * 100) + "% né", crit: v => "+" + Math.round(v * 100) + "% chí mạng",
  spd: v => "+" + v + " tốc độ", luck: v => "+" + v + " may mắn", res: v => "+" + Math.round(v * 100) + "% kháng hiệu ứng", critdmg: v => "+" + Math.round(v * 100) + "% sát thương chí mạng"
};

/* May mắn ảnh hưởng RƠI ĐỒ: (1) tăng tỉ lệ rơi, (2) đẩy xác suất về phía phẩm chất cao (trọng số bậc i nhân thêm 1 + luckRarity x may mắn x i) */
const luckOf = p => Math.max(0, (p && p.luck) || 0);
const dropChance = (base, luck) => Math.min(1, base + luck * CONFIG.luckDrop);
const luckW = (w, luck) => w.map((x, i) => x * (1 + CONFIG.luckRarity * luck * i));
const wpick = w => { let r = Math.random() * w.reduce((x, y) => x + y, 0); for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i; return w.length - 1; };
const BONUS = { atk: 2, hp: 12, mana: 8, spd: 1, luck: 2, evasion: .02, crit: .03, res: .04, critdmg: .08, red: .03 };   // chỉ số phụ ngẫu nhiên cho đồ Hiếm / Huyền thoại
const GS = { atk: 3, hp: .5, mana: .4, red: 100, evasion: 100, crit: 100, spd: 2, luck: 1.5, critdmg: 50, res: 60 };
const gearScore = it => it ? Object.entries(it.stats || {}).reduce((a, [k, v]) => a + (GS[k] || 0) * v, 0) : 0;   // điểm thô để so đồ mới / đồ cũ

/* Rơi trang bị. src = normal | elite | boss | treasure. Hiếm +1 chỉ số phụ, Huyền thoại +2 chỉ số phụ.
   Mỗi món gắn với 1 class (it.cls): chỉ class đó mới mặc được. Truyền cls hợp lệ thì rơi đúng class đó, không thì random. */
const gearClsName = c => (CLASSES[c] || {}).name || c || "";
const canEquip = (p, it) => !it || !it.cls || !p || it.cls === p.cls;   // đồ cũ (không có cls) thì ai cũng mặc được
function rollItem(floor, src = "normal", cls, luck = 0) {
  const keys = Object.keys(GEAR), gc = keys.includes(cls) ? cls : keys[rand(0, keys.length - 1)], slotKey = ["weapon", "armor", "charm"][rand(0, 2)], slot = GEAR[gc][slotKey];
  const ri = wpick(luckW(CONFIG.drop.gearW[src] || CONFIG.drop.gearW.normal, luck)), k = (1 + 0.15 * (floor - 1)) * RARITIES[ri].mult;
  const val = (key, base) => ["atk", "hp", "mana", "spd", "luck"].includes(key) ? Math.max(1, Math.round(base * k)) : Math.round(base * k * 100) / 100;
  const stats = {};
  stats[slot.main[0]] = val(slot.main[0], slot.main[1]);
  if (ri >= 1) stats[slot.sub[0]] = val(slot.sub[0], slot.sub[1]);
  const pool = Object.keys(BONUS).filter(x => !(x in stats)).sort(() => Math.random() - 0.5);
  for (let j = 0; j < Math.max(0, ri - 1); j++) stats[pool[j]] = val(pool[j], BONUS[pool[j]]);
  return { slot: slotKey, cls: gc, icon: slot.icon, lab: slot.label, rarity: RARITIES[ri], name: slot.names[ri], stats };
}

const statLine = it => Object.entries(it.stats || {}).filter(([k]) => STAT_TEXT[k]).map(([k, v]) => STAT_TEXT[k](v)).join(" · ");
function itemText(it) {
  if (!it) return "(trống)";
  return (it.icon || "") + " " + ((it.rarity && it.rarity.icon) || "") + " " + it.name + " [" + ((it.rarity && it.rarity.name) || "") + "]" + (it.cls ? " (🎭 " + gearClsName(it.cls) + ")" : "") + ": " + statLine(it);
}
function itemHtml(it) {
  if (!it) return "<small>(trống)</small>";
  const ri = Math.max(0, RARITIES.findIndex(r => it.rarity && r.name === it.rarity.name));
  return '<span class="r' + ri + '">' + it.icon + " " + RARITIES[ri].icon + " " + esc(it.name) + " · " + RARITIES[ri].name + "</span><br><small>" + esc(statLine(it)) + (it.cls ? " · 🎭 " + esc(gearClsName(it.cls)) : "") + "</small>";
}

/* ----- VẬT PHẨM (thuốc) trong túi đồ: chỉ có 3 cấp Thường / Cao cấp / Hiếm. Dùng 1 vật phẩm tốn 1 lượt (chỉ chế độ một mình) ----- */
const ITEM_RAR = [{ name: "Thường", icon: "⚪" }, { name: "Cao cấp", icon: "🟢" }, { name: "Hiếm", icon: "🟣" }];
const ITEM_TYPES = {
  hp:   { i: "❤️", n: "Thuốc máu",  pct: [.3, .5, .8], w: 45 },
  mp:   { i: "💧", n: "Thuốc mana", pct: [.3, .5, .8], w: 30 },
  cure: { i: "💊", n: "Thuốc giải", pct: [0, .25, .25], w: 25 }
};
const bagName = x => ITEM_TYPES[x.k].i + " " + ITEM_TYPES[x.k].n + " (" + ITEM_RAR[x.r].name + ")";
const itemDesc = (k, r) => k === "hp" ? "Hồi " + pct(ITEM_TYPES.hp.pct[r]) + "% máu tối đa" : k === "mp" ? "Hồi " + pct(ITEM_TYPES.mp.pct[r]) + "% mana tối đa"
  : "Giải trừ mọi hiệu ứng xấu" + (r ? ", hồi 25% máu" : "") + (r === 2 ? ", miễn nhiễm hiệu ứng xấu 2 lượt" : "");
function rollBagItem(src, luck = 0) { const ks = Object.keys(ITEM_TYPES); return { k: ks[wpick(ks.map(x => ITEM_TYPES[x].w))], r: wpick(luckW(CONFIG.drop.itemW[src] || CONFIG.drop.itemW.normal, luck)) }; }
function rollBagDrops(src, luck = 0) {
  const D = CONFIG.drop, out = [];
  if (Math.random() < dropChance(D.itemChance[src] ?? D.itemChance.normal, luck)) out.push(rollBagItem(src, luck));
  if (src === "boss" && Math.random() < dropChance(D.bossExtraItem, luck)) out.push(rollBagItem(src, luck));
  return out;
}
const bagHas = (p, a) => { const [, k, r] = a.split(":"); return (p.bag || []).some(x => x.k === k && x.r === +r); };
function bagUseless(p, k, r) {
  const bad = Object.keys(p.st || {}).some(x => STATUS[x] && STATUS[x].bad && p.st[x].d > 0);
  return k === "hp" ? p.hp >= p.maxHp : k === "mp" ? p.mana >= p.maxMana : !bad && (r === 0 || p.hp >= p.maxHp) && r < 2;
}
function useItem(p, a) {
  const [, k, r] = a.split(":"), ri = +r, T = ITEM_TYPES[k], i = (p.bag || []).findIndex(x => x.k === k && x.r === ri);
  if (!T || i < 0) return;
  p.bag.splice(i, 1); VF("potion", 0, [0]);
  const nm = bagName({ k, r: ri }), heal = f => { const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * f)); return p.hp - b; };
  if (k === "hp") { const h = heal(T.pct[ri]); log("🧪 " + p.name + " dùng " + nm + ", hồi " + h + " máu.", "good"); FXX(0, "+" + h, "heal"); }
  else if (k === "mp") { const b = p.mana; p.mana = Math.min(p.maxMana, p.mana + Math.round(p.maxMana * T.pct[ri])); log("🧪 " + p.name + " dùng " + nm + ", hồi " + (p.mana - b) + " mana.", "good"); FXX(0, "+" + (p.mana - b) + "💧", "st"); }
  else {
    const n = cleanse(p), h = T.pct[ri] ? heal(T.pct[ri]) : 0;
    log("🧪 " + p.name + " dùng " + nm + (n ? ", giải trừ " + n + " hiệu ứng xấu" : "") + (h ? ", hồi " + h + " máu" : "") + ".", "good");
    if (ri === 2) { stOf(p).immune = { d: 3, v: 0 }; log("🔰 " + p.name + " miễn nhiễm hiệu ứng xấu 2 lượt.", "good"); }
    FXX(0, n ? "Giải trừ!" : h ? "+" + h : "🔰", n || !h ? "st" : "heal");
  }
}
/* ----- DOM builders cho túi đồ ----- */
function bagSec(list, t, r) { const h = document.createElement("h3"); h.innerHTML = "<span>" + t + "</span><small>" + (r || "") + "</small>"; list.appendChild(h); }
function bagNone(list, t) { const e = document.createElement("p"); e.className = "none"; e.textContent = t; list.appendChild(e); }
function bagBtn(t, fn, dis, cls) { const b = document.createElement("button"); b.className = cls || "sec"; b.innerHTML = t; b.disabled = !!dis; b.onclick = fn; return b; }
function bagRow(list, it, ico, btns, extra) {
  const ri = it ? Math.max(0, RARITIES.findIndex(r => r.name === it.rarity.name)) : 0, d = document.createElement("div"); d.className = "grow g" + ri + (it ? "" : " empty");
  d.innerHTML = '<div class="gi">' + (it ? itemHtml(it) : "<small>" + ico + " Trống</small>") + (extra || "") + '</div><div class="gb"></div>';
  btns.forEach(b => d.querySelector(".gb").appendChild(b)); list.appendChild(d);
}
function bagWorn(p, list, go, locked) {   // 1) đang mặc
  bagSec(list, "🎽 Đang mặc");
  ["weapon", "armor", "charm"].forEach(k => {
    const it = p.equipment[k], g = GEAR[p.cls][k];
    bagRow(list, it, g.icon + " " + g.label, it ? [bagBtn("Tháo", () => go("gear:un:" + k), locked || !gearRoom(p))] : [], it && !gearRoom(p) ? "<br><small>Túi đầy, không tháo được</small>" : "");
  });
}
function bagGear(p, list, go, locked) {   // 2) trang bị trong túi
  bagSec(list, "🧰 Trang bị trong túi", p.gbag.length + " / " + CONFIG.solo.gearBag);
  p.gbag.forEach((it, n) => {
    const d = gearScore(it) - gearScore(p.equipment[it.slot]), cmp = d > 0 ? '<span class="gd up">▲ mạnh hơn đồ đang mặc</span>' : d < 0 ? '<span class="gd dn">▼ yếu hơn đồ đang mặc</span>' : '<span class="gd">= tương đương</span>';
    let armed = false;
    const del = bagBtn("Vứt", () => { if (!armed) { armed = true; del.textContent = "Chắc chưa?"; return setTimeout(() => { armed = false; del.textContent = "Vứt"; }, 2500); } gearAct(p, "gear:drop:" + n); render(); openBag(); }, locked, "sec del");
    const okC = canEquip(p, it);
    bagRow(list, it, "", [bagBtn(okC ? "Mặc" : "⛔ Khác class", () => go("gear:eq:" + n), locked || !okC, "on"), del], "<br><small>" + cmp + " · " + (it.lab || GEAR[p.cls][it.slot].label) + (it.cls ? " · 🎭 " + gearClsName(it.cls) : "") + "</small>");
  });
  if (!p.gbag.length) bagNone(list, "Chưa có trang bị nào trong túi. Đồ rơi ra có thể cất vào đây.");
}
function bagPots(p, list, fight, locked) {   // 3) vật phẩm
  const g = {}; (p.bag || []).forEach(x => { const id = x.k + ":" + x.r; g[id] = (g[id] || 0) + 1; });
  bagSec(list, "🧪 Vật phẩm", (p.bag || []).length + "");
  Object.keys(g).sort().forEach(id => {
    const [k, r] = id.split(":"), ri = +r, T = ITEM_TYPES[k], b = document.createElement("button"), no = bagUseless(p, k, ri);
    b.innerHTML = '<span class="r' + ri + '">' + T.i + " <b>" + T.n + "</b> (" + ITEM_RAR[ri].name + ")</span> ×" + g[id] + "<br><small>" + itemDesc(k, ri) + (no ? " · chưa cần dùng" : "") + "</small>";
    b.disabled = no || !fight || locked; b.onclick = () => { $("bag").classList.remove("show"); takeTurn("item:" + k + ":" + ri); };
    list.appendChild(b);
  });
  if (!(p.bag || []).length) bagNone(list, "Không có vật phẩm.");
}
function openBag() {
  const p = state.player, list = $("bag-list"), fight = inFight(), locked = (state.busy && !state.resting) || state.over;
  p.gbag = p.gbag || []; list.innerHTML = "";
  $("bag-note").textContent = fight ? "Đang trong trận: đổi trang bị hoặc dùng vật phẩm tốn 1 lượt." : "Ngoài trận: tháo / mặc trang bị miễn phí. Vật phẩm chỉ dùng được trong trận.";
  const go = a => { if (fight) { $("bag").classList.remove("show"); takeTurn(a); } else { gearAct(p, a); render(); openBag(); } };
  bagWorn(p, list, go, locked);
  bagGear(p, list, go, locked);
  bagPots(p, list, fight, locked);
  $("bag").classList.add("show");
}

function applyStats(p, st, sign, heal = true) {
  if (st.atk) { p.atkMin += sign * st.atk; p.atkMax += sign * st.atk; }
  if (st.hp) { p.maxHp += sign * st.hp; p.hp = Math.min(p.hp, p.maxHp); if (sign > 0 && heal) p.hp += st.hp; }
  if (st.evasion) p.evasion += sign * st.evasion;
  if (st.crit) p.critChance += sign * st.crit;
  if (st.mana) { p.maxMana += sign * st.mana; p.mana = Math.min(p.mana + (sign > 0 && heal ? st.mana : 0), p.maxMana); }
  if (st.red) p.defendReduce += sign * st.red;
  if (st.spd) p.spd += sign * st.spd;
  if (st.luck) p.luck += sign * st.luck;
  if (st.res) p.res = Math.round(((p.res || 0) + sign * st.res) * 100) / 100;
  if (st.critdmg) p.critDmg = Math.round((p.critDmg + sign * st.critdmg) * 100) / 100;
}

const gearRoom = p => (p.gbag || []).length < CONFIG.solo.gearBag;
/* Mặc đồ: đồ cũ được cất vào túi (túi đầy thì bỏ lại). Đồ đã từng mặc thì mặc lại không hồi thêm máu / mana. Trả về true nếu mặc được */
function equipItem(it) {
  const p = state.player;
  if (!canEquip(p, it)) { log("⛔ " + it.name + " chỉ dành cho " + gearClsName(it.cls) + ", không mặc được.", "bad"); return false; }
  const old = p.equipment[it.slot]; p.gbag = p.gbag || [];
  if (old) {
    applyStats(p, old.stats, -1);
    if (gearRoom(p)) { p.gbag.push(old); log("🎒 " + old.name + " được cất vào túi.", "good"); } else log("🗑️ Túi đầy, bỏ lại " + old.name + ".", "bad");
  }
  p.equipment[it.slot] = it;
  applyStats(p, it.stats, +1, !it.worn); it.worn = true;
  log("🎽 Trang bị " + it.name + ".", "good");
  return true;
}
/* Hành động trang bị: gear:eq:<số thứ tự trong túi> · gear:un:<ô> (weapon / armor / charm) · gear:drop:<số thứ tự>. Trả về true nếu thực hiện được */
function gearAct(p, a) {
  const [, op, v] = a.split(":"); p.gbag = p.gbag || [];
  if (op === "un") {
    const it = p.equipment[v]; if (!it || !gearRoom(p)) return false;
    applyStats(p, it.stats, -1); p.equipment[v] = null; p.gbag.push(it); log("🎽 Tháo " + it.name + ", cất vào túi.", "good"); return true;
  }
  const it = p.gbag[+v]; if (!it) return false;
  if (op === "eq" && !canEquip(p, it)) { log("⛔ " + it.name + " chỉ dành cho " + gearClsName(it.cls) + ", không mặc được.", "bad"); return false; }
  if (op === "drop") { p.gbag.splice(+v, 1); log("🗑️ Vứt " + it.name + ".", "bad"); return true; }
  p.gbag.splice(+v, 1);   // op === "eq": đồ đang mặc (nếu có) vào chỗ vừa trống nên luôn đủ chỗ
  const old = p.equipment[it.slot];
  if (old) { applyStats(p, old.stats, -1); p.gbag.push(old); }
  p.equipment[it.slot] = it; applyStats(p, it.stats, +1, !it.worn); it.worn = true;
  log("🎽 Mặc " + it.name + (old ? ", cất " + old.name + " vào túi" : "") + ".", "good"); return true;
}
const gearOk = (p, a) => { const [, op, v] = a.split(":"); if (op === "un") return !!p.equipment[v] && gearRoom(p); const it = (p.gbag || [])[+v]; return !!it && (op !== "eq" || canEquip(p, it)); };
const inFight = () => state.mode !== "coop" && !state.over && state.monsters.some(m => m.hp > 0);

/* Sau mỗi tầng: rơi vật phẩm (tự vào túi) và trang bị (hỏi trang bị hay bỏ). Chọn chỉ số chỉ khi LÊN CẤP (finishLoot). */
function showLoot() {
  const p = state.player, floor = state.monsterIndex + 1, src = state.monsters.some(m => m.boss || m.mini) ? "boss" : state.monsters.some(m => m.elite) ? "elite" : "normal";
  const lk = luckOf(p), got = rollBagDrops(src, lk);
  got.forEach(x => { p.bag.push(x); log("🎒 Nhặt được " + bagName(x) + ".", "good"); });
  const gear = Math.random() < dropChance(CONFIG.drop.gearChance[src], lk) ? rollItem(floor, src, undefined, lk) : null;
  if (gear) return offerItem(gear, finishLoot, got);
  if (!got.length) log("Quái không rơi gì.");
  finishLoot();
}
function finishLoot() {
  if (state.player.pending > 0) return showRewards();   // có lên cấp: chọn buff chỉ số
  postFight();
}

function offerItem(it, done, got) {
  const old = state.player.equipment[it.slot], d = gearScore(it) - gearScore(old);
  $("loot-body").innerHTML = (got && got.length ? "🎒 Đã nhặt: " + got.map(bagName).join(", ") + "<br><br>" : "") + "<b>Mới:</b><br>" + itemHtml(it) + "<br><br><b>Đang mặc:</b><br>" + itemHtml(old) + "<br><br>" +
    (d > 0 ? '<b style="color:#2f9a5d">▲ Mạnh hơn đồ đang mặc</b>' : d < 0 ? '<b style="color:#d23f3a">▼ Yếu hơn đồ đang mặc</b>' : "");
  const close = () => { $("loot").classList.remove("show"); render(); done(); };
  const pl = state.player, room = gearRoom(pl), okC = canEquip(pl, it);
  $("loot-body").innerHTML += '<br><small style="color:var(--muted)">🎒 Túi trang bị: ' + (pl.gbag || []).length + " / " + CONFIG.solo.gearBag + (old && !room ? " · túi đầy nên đồ đang mặc sẽ bị bỏ lại nếu bạn thay" : "") + "</small>";
  $("loot-equip").disabled = !okC;
  $("loot-equip").textContent = okC ? "Trang bị" : "⛔ Chỉ " + gearClsName(it.cls);
  $("loot-equip").onclick = () => { if (equipItem(it)) close(); };
  $("loot-store").disabled = !room; $("loot-store").textContent = room ? "🎒 Cất vào túi" : "🎒 Túi đầy";
  $("loot-store").onclick = () => { pl.gbag.push(it); log("🎒 Cất " + it.name + " vào túi.", "good"); close(); };
  $("loot-skip").onclick = close;
  $("loot").classList.add("show");
}

