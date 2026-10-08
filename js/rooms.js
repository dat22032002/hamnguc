/* js/rooms.js — Luồng một tầng: chọn phòng, nghỉ giữa các đợt, bị tập kích, bắt đầu trận. */
/* =====================================================
   PHẦN 5D: CHỌN PHÒNG MỖI TẦNG
   Mỗi khu vực (CONFIG.map.zones khu/tầng) hiện 3 lối đi: trái, giữa, phải (genDoors). Một số lối bị ẩn.
   Thêm loại lối mới: thêm vào DOOR_TYPES + CONFIG.map.w và xử lý trong enterRoom.
   ===================================================== */

/* ----- HỆ THỐNG 3 LỐI ĐI MỚI (genDoors sinh dữ liệu, showRooms/enterRoom hiển thị + xử lý — xem GHI_CHU.md) -----
   hide: "can" = có thể bị ẩn · "never" = không bao giờ ẩn (Thương nhân, Nghỉ ngơi) · "always" = luôn ẩn (Bẫy) */
const DOOR_TYPES = {
  fight:    { icon: "⚔️", name: "Chiến đấu",         hide: "can" },
  treasure: { icon: "💎", name: "Rương",             hide: "can" },
  trap:     { icon: "🕸️", name: "Bẫy",               hide: "always" },
  blessing: { icon: "⛩️", name: "Chúc phúc",         hide: "can" },
  merchant: { icon: "🧙", name: "Thương nhân",       hide: "never" },
  rest:     { icon: "🏕️", name: "Khu vực nghỉ ngơi", hide: "never" }
};

/* Sinh 3 lối đi cho 1 lần chọn. Trả về mảng 3 phần tử { type, icon, name, hidden, elite }.
   - 3 lối luôn khác loại (nên tối đa 1 Thương nhân + 1 Nghỉ ngơi). Co-op: chưa có Thương nhân.
   - Số lối ẩn: random hideMin..hideMax, nhưng Bẫy luôn ẩn, Thương nhân/Nghỉ ngơi không ẩn được → số ẩn thực tế bị chặn theo đó.
   - Cửa "Chiến đấu" KHÔNG bị ẩn ngẫu nhiên (để người chơi còn quyết định chiến thuật: cần XP thì đánh).
   - elite: lối "Chiến đấu" có thể là tinh anh (từ tầng eliteFrom), người chơi không được biết. */
function genDoors(floor = state.monsterIndex + 1, mode = state.mode) {
  const M = CONFIG.map;
  const pool = Object.keys(DOOR_TYPES).filter(k => !(k === "merchant" && mode === "coop"));
  const types = [];
  while (types.length < 3) {
    const k = pool[wpick(pool.map(x => M.w[x]))];
    if (!types.includes(k)) types.push(k);
  }
  types.sort(() => Math.random() - 0.5);   // trộn vị trí trái / giữa / phải
  const doors = types.map(k => ({
    type: k, icon: DOOR_TYPES[k].icon, name: DOOR_TYPES[k].name, hidden: DOOR_TYPES[k].hide === "always",
    elite: k === "fight" && floor >= CONFIG.solo.eliteFrom && Math.random() < M.eliteChance
  }));
  const need = rand(M.hideMin, M.hideMax) - doors.filter(d => d.hidden).length;   // số cửa cần ẩn thêm
  const free = doors.filter(d => !d.hidden && DOOR_TYPES[d.type].hide === "can" && d.type !== "fight");   // không ẩn cửa Chiến đấu để giữ quyết định chiến thuật
  free.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(Math.max(0, need), free.length); i++) free[i].hidden = true;   // hiếm khi cả 3 cửa đều hiện (khi chỉ còn cửa chiến đấu / thương nhân / nghỉ ngơi): vẫn chơi bình thường
  return doors;
}

/* Sang bước kế tiếp (solo). state.zone = khu vực hiện tại: 1..zones = chọn lối đi; zones+1 = phòng boss.
   Xong 1 khu vực → zone++ → 3 lối mới; sau khu vực cuối → thẳng phòng boss (không có lựa chọn); xong boss → tầng mới, zone = 1. */
function advance() {
  state.turn++;
  if (state.zone > CONFIG.map.zones) {   // vừa xong phòng boss → sang tầng mới
    state.zone = 1; state.step = 0; state.monsterIndex++;
    log("🏁 Qua tầng " + state.monsterIndex + "! Bước sang tầng " + (state.monsterIndex + 1) + ".", "good");
    return showRooms();
  }
  state.zone++;
  if (state.zone > CONFIG.map.zones) return startFight(finalKind(state.monsterIndex + 1));   // phòng boss
  showRooms();
}

/* =====================================================
   PHẦN 5C: NGHỈ GIỮA CÁC ĐỢT
   Sau mỗi đợt quái (đã nhặt đồ + chọn nâng cấp xong) hiện bảng Nghỉ: chọn Nghỉ ngắn / Nghỉ dài rồi bấm Tiếp tục.
   Nghỉ dài có CONFIG.rest.ambush tỉ lệ bị tập kích: không hồi gì, đánh 1 đợt quái riêng (state.ambush), thắng xong đi tiếp luôn, không nghỉ lần nữa.
   Co-op dùng chung giao diện này nhưng bỏ phiếu qua host (xem hostRest*).
   ===================================================== */
const restKinds = { short: { n: "Nghỉ ngắn" }, long: { n: "Nghỉ dài" } };
function restGain(p, kind) {   // hồi máu / mana theo kiểu nghỉ, trả về [máu hồi, mana hồi]
  const R = CONFIG.rest, hb = p.hp, mb = p.mana;
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * R[kind + "Hp"]));
  p.mana = Math.min(p.maxMana, p.mana + Math.round(p.maxMana * R[kind + "Mana"]));
  return [p.hp - hb, p.mana - mb];
}

function postFight() {   // xong 1 trận (đã nhận thưởng): đi tiếp. (Nghỉ ngơi giờ chỉ có ở lối đi 🏕️)
  if (state.ambush) { state.ambush = false; log("🗡️ Đã đẩy lùi bọn tập kích. Tiếp tục hành trình.", "good"); }
  advance();
}

function showRest() {
  state.resting = true; state.restPick = null;
  log("🏕️ Bạn tìm thấy một khu vực nghỉ ngơi. Chọn cách nghỉ ngơi.");
  $("rest").classList.add("show");
  render();
}

function renderRest() {
  const coop = state.mode === "coop" && co && co.s, s = coop ? co.s : null, p = state.player, R = CONFIG.rest;
  const me = coop ? s.players[co.me] : null, mate = coop ? s.players[1 - co.me] : null;
  const pick = coop ? me.rv : state.restPick, ready = !!(coop && me.rdy);
  $("rest-short").innerHTML = '<span class="dicon">🌙</span><b>Nghỉ ngắn</b><small>Hồi ' + pct(R.shortHp) + "% máu · " + pct(R.shortMana) + "% mana<br>🛡️ An toàn</small>";
  $("rest-long").innerHTML = '<span class="dicon">⛺</span><b>Nghỉ dài</b><small>Hồi ' + pct(R.longHp) + "% máu · " + pct(R.longMana) + "% mana<br>⚠️ " + pct(R.ambush) + "% bị tập kích (bị tập kích thì không hồi gì)</small>";
  $("rest-short").classList.toggle("on", pick === "short"); $("rest-long").classList.toggle("on", pick === "long");
  $("rest-short").disabled = $("rest-long").disabled = ready;
  $("rest-go").disabled = !pick || ready;
  $("rest-go").textContent = ready ? "⏳ Đợi đồng đội…" : "▶️ Tiếp tục";
  $("rest-info").innerHTML = "❤️ " + p.hp + "/" + p.maxHp + " · 💧 " + p.mana + "/" + p.maxMana + "<br>" + (coop ? "Cả hai bỏ phiếu, nếu mỗi người một ý thì game chọn ngẫu nhiên." : "Chọn cách nghỉ rồi bấm Tiếp tục.");
  $("rest-mate").style.display = coop ? "" : "none";
  if (coop) $("rest-mate").textContent = "🤝 " + mate.name + ": ❤️ " + mate.hp + "/" + mate.maxHp + " · " + (mate.rdy ? "✔ Sẵn sàng (" + restKinds[mate.rv].n + ")" : mate.rv ? "🗳️ Đang nghiêng về " + restKinds[mate.rv].n : "đang suy nghĩ…");
  $("rest-bag").style.display = coop ? "none" : "";   // co-op chưa có túi đồ
}

function restVote(v) {
  if (state.mode === "coop") return coopRestVote(v);
  if (!state.resting) return;
  state.restPick = v; renderRest();
}

function restGo() {
  if (state.mode === "coop") return coopRestGo();
  const kind = state.restPick;
  if (!kind || !state.resting) return;
  state.resting = false; $("rest").classList.remove("show");
  const p = state.player;
  log("🏕️ Bạn chọn " + restKinds[kind].n.toLowerCase() + ".");
  if (kind === "long" && Math.random() < CONFIG.rest.ambush) return startAmbush();
  const [h, m] = restGain(p, kind);
  log("🏕️ " + restKinds[kind].n + ": hồi " + h + " máu, " + m + " mana.", "good");
  if (h > 0) floatText("player-avatar", "+" + h, "heal");
  if (m > 0) setTimeout(() => floatText("player-avatar", "+" + m + "💧", "st"), 250);
  render(); advance();
}

function startAmbush() {   // đợt tập kích: không đổi bước (step), không hồi gì
  state.ambush = true;
  state.monsters = spawnGroup(state.monsterIndex, false, false, state.player.level);
  log("⚠️ BỊ TẬP KÍCH! Quái lao ra khi bạn đang nghỉ, bạn không hồi được gì. (Đợt này không tính vào tầng): " + state.monsters.map(m => m.name).join(", ") + " xuất hiện!", "bad");
  floatText("player-avatar", "TẬP KÍCH!", "dmg");
  state.busy = false;
  render();
}

function startFight(elite) {
  state.monsters = spawnGroup(state.monsterIndex, elite, false, state.player.level);
  log("Tầng " + (state.monsterIndex + 1) + " · " + zoneTxt() + (elite === "boss" ? " (👑 TRÙM)" : elite === "mini" ? " (💀 BOSS PHỤ)" : elite ? " (tinh anh)" : "") + ": " + state.monsters.map(m => m.name).join(", ") + " xuất hiện!");
  state.busy = false;
  render();
}

const DOOR_NAMES = ["Cửa trái", "Cửa giữa", "Cửa phải"];
const zoneTxt = () => state.zone > CONFIG.map.zones ? "👑 Phòng Boss" : "Khu vực " + state.zone + "/" + CONFIG.map.zones;

/* Màn chọn 3 lối đi. Lối hiện: icon + tên loại. Lối ẩn: ❓ Chưa rõ (chỉ biết khi bước vào). Dữ liệu từ genDoors(). */
function showRooms() {
  const doors = genDoors();
  const list = $("room-list");
  list.innerHTML = "";
  doors.forEach((d, i) => {
    const b = document.createElement("button");
    b.innerHTML = '<span class="dicon">' + (d.hidden ? "❓" : d.icon) + "</span><b>" + (d.hidden ? "Chưa rõ" : d.name) + "</b><small>" + DOOR_NAMES[i] + "</small>";
    b.onclick = () => enterRoom(d, DOOR_NAMES[i]);
    list.appendChild(b);
  });
  $("rooms-title").textContent = "🚪 Chọn lối đi · " + zoneTxt();
  $("rooms-note").textContent = "Một số lối đi bị che khuất (❓), bạn chỉ biết phía sau có gì khi bước vào. Chọn một lối để đi tiếp.";
  render();
  $("rooms").classList.add("show");
}

/* Bước vào 1 lối đi (d = phần tử của genDoors). Xử lý xong thì advance(). */
function enterRoom(d, door) {
  $("rooms").classList.remove("show");
  const p = state.player, floor = state.monsterIndex + 1;
  log("🚪 Bạn mở " + door.toLowerCase() + ": " + d.icon + " " + d.name + "!");
  if (d.type === "fight") return startFight(d.elite);
  if (d.type === "merchant") { log("🧙 Một thương nhân lang thang chào mời bạn.", "good"); return showShopScene(); }
  if (d.type === "treasure") { addGold(p, chestGold("treasure", floor, luckOf(p)), "Trong rương"); return offerItem(rollItem(floor, "treasure", undefined, luckOf(p)), advance); }
  if (d.type === "blessing") { log("⛩️ Bạn thấy một bàn thờ cổ, được ban phúc."); render(); return showRewards(true); }
  if (d.type === "rest") return showRest();   // bảng Nghỉ ngắn / Nghỉ dài; restGo() sẽ gọi advance()
  {   // bẫy
    const loss = Math.max(0, Math.min(p.hp - 1, Math.round(p.maxHp * 0.15)));
    p.hp -= loss;
    log("🕸️ Dính bẫy! Mất " + loss + " máu.", "bad");
    floatText("player-avatar", "-" + loss, "dmg");
  }
  render();
  advance();
}

