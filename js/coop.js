/* js/coop.js — Co-op 2 người qua WebSocket: kết nối, logic chủ phòng, nhận/hiển thị snapshot. */
/* =====================================================
   PHẦN 5E: CHƠI CO-OP 2 NGƯỜI (PvE) QUA MẠNG
   Kết nối qua máy chủ co-op riêng (WebSocket, xem worker.js): máy chủ chỉ chuyển tin giữa 2 người cùng mã phòng.
   Người tạo phòng là "chủ phòng" (host): giữ toàn bộ trạng thái game và tính kết quả mỗi vòng.
   Người vào phòng gửi hành động lên, rồi nhận lại trạng thái mới để hiển thị.
   Mỗi vòng: cả 2 chọn hành động -> hai người lần lượt ra đòn -> quái đánh 1 người ngẫu nhiên.
   ===================================================== */
let co = null;
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const COOP_HP = 1.6, COOP_ATK = 1.25;   // quái mạnh hơn khi có 2 người
const COOP_BOSS_HP = 0.65, COOP_BOSS_ATK = 0.7;   // trùm co-op: nhân THÊM
const COOP_XP = 0.5;   // co-op: nhân kinh nghiệm (solo chỉnh ở CONFIG.solo.xp)
const COOP_FLOOR = 0.05;   // co-op: mỗi tầng quái mạnh thêm %
const COOP_HEAL = 0.3, COOP_MANA = 1.0;   // sau mỗi trận co-op: hồi % máu tối đa và % mana tối đa

function menuNote(t) { $("menu-note").textContent = t; }
function nickName() { return ($("nick").value.trim() || "Hiệp sĩ").slice(0, 16); }
function newCode() { let c = ""; for (let i = 0; i < 5; i++) c += CODE_CHARS[rand(0, CODE_CHARS.length - 1)]; return c; }

function showMenu() {
  closeCoop();
  newGame();
  $("log").innerHTML = "";
  $("mate").style.display = "none"; 
["overlay", "reward", "rooms", "loot", "rest"].forEach(id => $(id).classList.remove("show"));
  ["pause", "settings"].forEach(id => $(id).classList.remove("show"));
  render();
  showPage("main", "");
}

function closeCoop() {
  const c = co;
  co = null;
  if (!c) return;
  clearTimeout(c.timer);
  try { c.conn && c.conn.close(); } catch (e) {}
  try { c.peer && c.peer.destroy(); } catch (e) {}
}
function leaveCoop() { showMenu(); }


function coopStartUi() {
  newGame();
  state.mode = "coop";
  if (typeof syncAll === "function") syncAll();
  $("log").innerHTML = "";
  ["menu", "overlay", "reward", "rooms", "loot", "rest"].forEach(id => $(id).classList.remove("show"));
  $("btn-restart").textContent = "Về menu";
}

/* ---------- Kết nối qua máy chủ co-op ----------
   Chủ phòng và người vào cùng nối WebSocket tới máy chủ bằng mã phòng. Luật game chạy trên máy chủ phòng. */
const SERVER = "wss://rpg-coop.tadgames.workers.dev/ws";
const ERR_TEXT = { exists: "Mã phòng bị trùng, hãy thử lại.", none: "Không thấy phòng này. Kiểm tra mã hoặc nhờ chủ phòng tạo phòng.",
                   playing: "Phòng này đang chơi, không vào thêm được.", full: "Phòng đã đủ người." };
const cleanCode = c => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);

/* Bọc WebSocket cho giống "conn": send(obj), on("open" | "data" | "close"), close(), open.
   "open" chạy ngay khi WebSocket nối được (không chờ tin "ready" của máy chủ). Khi máy chủ từ chối, lý do nằm trong e.reason. */
function mkWs(code, role, name) {
  const h = {}, ws = new WebSocket(SERVER + "?room=" + code + "&role=" + role + "&name=" + encodeURIComponent(name));
  const c = { ws, open: false, on: (ev, fn) => { h[ev] = fn; }, send: o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); },
              close: () => { clearInterval(c.ka); try { ws.close(); } catch (e) {} } };
  ws.onopen = () => { c.open = true; c.ka = setInterval(() => { if (ws.readyState === 1) ws.send("ping"); }, 25000); h.open && h.open(); };
  ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } if (d && d.t !== "ready") h.data && h.data(d); };
  ws.onerror = () => { c.err = true; };
  ws.onclose = e => { c.code = e.code; c.open = false; clearInterval(c.ka); h.close && h.close(e.reason); };
  return c;
}
/* Thông tin chẩn đoán gắn vào cuối thông báo lỗi: trạng thái WebSocket, mã đóng và nơi đang mở trang */
const diag = c => " [" + (c && c.ws ? ["đang nối", "đã mở", "đang đóng", "đã đóng"][c.ws.readyState] + (c.code ? ", mã " + c.code : "") + "; " : "") + location.protocol + "//" + (location.host || "file") + "]";
const NET_FAIL = "Không kết nối được máy chủ co-op. Kiểm tra mạng/VPN (một số mạng chặn workers.dev) rồi thử lại.";

function hostCoop(code, tries = 0) {
  closeCoop();
  const cur = co = { code, me: 0, names: [nickName(), null], cls: [myClass, null], s: null, evs: [], conn: null, peer: null };
  menuNote("Đang tạo phòng…");
  cur.timer = setTimeout(() => { if (co === cur && !cur.opened) toPlay("Không tạo được phòng. " + NET_FAIL + diag(conn)); }, 12000);
  let conn;
  try { conn = cur.conn = mkWs(code, "host", cur.names[0]); } catch (e) { return toPlay(NET_FAIL); }
  conn.on("open", () => { cur.opened = true; clearTimeout(cur.timer); renderLobby(); });   // vào phòng chờ ngay
  conn.on("data", d => {
    if (co !== cur || !d || typeof d !== "object") return;
    if (d.t === "joined") return;   // người vào sẽ gửi "hello" ngay sau đó
    if (d.t === "left") {
      if (cur.s) return coopLost(cur, "Bạn bè đã rời phòng.");
      cur.names[1] = null; return renderLobby();   // phòng chờ: trống lại 1 chỗ
    }
    hostOnData(cur, d);
  });
  conn.on("close", why => {
    if (co !== cur) return;
    if (why === "exists" && !cur.s && tries < 3) return hostCoop(newCode(), tries + 1);   // mã phòng trùng: đổi mã
    coopLost(cur, why === "exists" ? ERR_TEXT.exists : cur.opened ? "Mất kết nối với máy chủ co-op." : NET_FAIL + diag(conn));
  });
}

function joinCoop(code) {
  closeCoop();
  const cur = co = { code, me: 1, names: [], cls: [], s: null, evs: [], conn: null, peer: null };
  menuNote("Đang vào phòng " + code.toUpperCase() + "…");
  cur.timer = setTimeout(() => { if (co === cur && !cur.s && !cur.names.length) toPlay(cur.opened ? "Chủ phòng không phản hồi, thử lại nhé." : "Không vào được phòng. " + NET_FAIL + diag(conn)); }, 12000);
  let conn;
  try { conn = cur.conn = mkWs(code, "guest", nickName()); } catch (e) { return toPlay(NET_FAIL); }
  conn.on("open", () => { cur.opened = true; conn.send({ t: "hello", name: nickName(), cls: myClass }); });
  conn.on("data", d => {
    if (co !== cur || !d || typeof d !== "object") return;
    if (d.t === "host-left") return coopLost(cur, "Chủ phòng đã rời phòng.");
    guestOnData(cur, d);
  });
  conn.on("close", why => coopLost(cur, cur.s ? (why === "host left" ? "Chủ phòng đã rời phòng." : "Mất kết nối với phòng.")
    : ERR_TEXT[why] || (cur.opened ? "Không vào được phòng." : NET_FAIL + diag(conn))));
}

function coopLost(cur, msg) {
  if (co !== cur || cur.lost) return;
  cur.lost = true;
  if (!cur.s) return toPlay(msg);
  if (cur.s.over) return;
  state.over = true; state.busy = true;
  $("reward").classList.remove("show");
  $("result-title").textContent = "🔌 Mất kết nối";
  $("result-text").textContent = msg;
  $("overlay").classList.add("show");
  render();
}

function hostOnData(cur, d) {
  if (co !== cur || !d || typeof d !== "object") return;   // dữ liệu từ người khác: luôn kiểm tra lại
  if (d.t === "hello" && !cur.s) {
    cur.names[1] = String(d.name || "Bạn").slice(0, 16);
    if (cur.names[1] === cur.names[0]) cur.names[1] += " 2";
    cur.cls[1] = CLASSES[d.cls] ? d.cls : "knight";
    renderLobby();
    try { cur.conn.send({ t: "lobby", names: cur.names, cls: cur.cls, code: cur.code }); } catch (e) {}   // chủ phòng bấm "Bắt đầu" mới vào game
  } else if (d.t === "act" && typeof d.a === "string") { if (cur.s && Number.isInteger(d.g)) cur.s.players[1].tg = d.g; hostAct(1, d.a); }
  else if (d.t === "pick" && Number.isInteger(d.i)) hostPick(1, d.i);
  else if (d.t === "door" && Number.isInteger(d.i)) hostDoorVote(1, d.i);
  else if (d.t === "rest" && (d.v === "short" || d.v === "long")) hostRestVote(1, d.v);
  else if (d.t === "restgo") hostRestReady(1);
}

function guestOnData(cur, d) {
  if (co !== cur || !d || typeof d !== "object") return;
  if (d.t === "lobby" && !cur.s && Array.isArray(d.names)) {
    clearTimeout(cur.timer);
    cur.names = d.names.slice(0, 2).map(n => n ? String(n).slice(0, 16) : null);
    cur.cls = Array.isArray(d.cls) ? d.cls.slice(0, 2) : [];
    return renderLobby();
  }
  if (d.t !== "snap" || !d.s) return;
  if (!cur.s) { clearTimeout(cur.timer); coopStartUi(); }
  cur.s = d.s; if (d.sp === 1 || d.sp === 2) setAnimSpeed(d.sp);
  coopApply();
  playEvents(d.ev || [], cur.me);
}

/* ---------- Logic của chủ phòng ---------- */
const L = (text, cls) => co.evs.push({ k: "log", text, cls });
const FX = (p, text, kind, hit) => co.evs.push({ k: "fx", p, text, kind, hit: !!hit, d: vd });   // p: 0, 1 hoặc "m" (quái)

function hostStart() {
  co.s = { floor: 1, step: 0, zone: 1, phase: "doors", round: 1, over: false, monsters: spawnGroup(0, false, true),
           players: [mkPlayer(co.names[0], co.cls[0]), mkPlayer(co.names[1], co.cls[1] || "knight")] };
  co.s.monsters.forEach(m => m.hp = 0);   // chưa có quái: vào game là chọn lối đi ngay (giống solo)
  coopStartUi();
  L("🤝 Hai người vào đội! Hãy chọn một lối đi để bắt đầu.");
  hostDoors();
}

function hostAct(pi, a) {
  const s = co.s;
  if (!s || s.phase !== "fight" || s.over) return;
  const p = s.players[pi];
  if (p.hp <= 0 || p.act || !/^(attack|defend|s[0-4])$/.test(a) || !canAct(p, a)) return;
  p.act = a;
  if (s.players.every(x => x.hp <= 0 || x.act)) resolveRound(); else publish();
}

async function resolveRound() {
  const cur = co, s = cur.s, ms = s.monsters;
  s.phase = "resolve"; s.players.forEach(p => { if (p.hp <= 0) p.defending = false; });
  s.order = buildOrder(s.players, ms);
  for (let i = 0; i < s.order.length; i++) {
    if (co !== cur || cur.lost) return;
    s.cur = i;
    if (await actorTurn(s.order[i], s.players, ms)) { const w = stepEnd + GAP; publish(); await sleep(w); }
    if (!ms.some(m => m.hp > 0) || s.players.every(p => p.hp <= 0)) break;
  }
  if (co !== cur || cur.lost) return;
  s.order = null; s.cur = -1;
  const won = !ms.some(m => m.hp > 0), lost = s.players.every(p => p.hp <= 0);
  endRound(s.players, !won && !lost);
  if (won) return hostVictory();
  s.phase = "fight";
  if (lost) { s.over = true; L("💀 Cả đội đã gục ngã.", "bad"); return publish(); }
  s.round++; publish();
}

function hostVictory() {
  const s = co.s, xp = s.monsters.reduce((a, m) => a + m.xp, 0), src = s.monsters.some(m => m.boss || m.mini) ? "boss" : s.monsters.some(m => m.elite) ? "elite" : "normal";
  L("Hạ gục cả bầy! Cả đội nhận " + xp + " XP.", "good");
  s.players.forEach((p, i) => {
    if (p.hp <= 0) { p.hp = Math.round(p.maxHp * 0.4); L(p.name + " được hồi sinh.", "good"); FX(i, "Hồi sinh!", "heal"); }
    gainXpCoop(p, i, xp);
    restCd(p); p.fx = {}; p.st = {}; p.fres = 0;   // không hồi máu / mana sau trận: chỉ hồi khi lên cấp; xoá hiệu ứng tạm
    coopDrop(p, i, src, s.floor);
    autoEvo(p);   // tiến hóa tự động (nhánh A, hoặc B nếu đủ điều kiện) — co-op không hiện popup chọn nhánh
    p.picked = !(p.pending > 0); p.offers = p.pending > 0 ? newOffers() : [];
  });
  if (s.players.every(p => p.picked)) return hostAdvance();   // không ai lên cấp: đi tiếp luôn (nghỉ ngơi giờ chỉ có ở lối đi 🏕️)
  s.phase = "reward";
  publish();
}
const newOffers = () => [...REWARDS.keys()].sort(() => Math.random() - 0.5).slice(0, 3);
/* Co-op: mỗi người có cơ hội rơi 1 trang bị (random từ mọi class), tự động mặc nếu mạnh hơn đồ đang mặc (vật phẩm chưa hỗ trợ co-op) */
function coopDrop(p, i, src, floor) {
  const lk = luckOf(p);
  if (Math.random() >= dropChance(CONFIG.drop.gearChance[src], lk)) return;
  coopGive(p, i, rollItem(floor, src, p.cls, lk));
}
function coopGive(p, i, it) {   // nhặt 1 món: tự mặc nếu mạnh hơn đồ đang mặc (đúng class mới mặc được)
  const old = p.equipment[it.slot];
  L("🎁 " + p.name + " nhặt được " + itemText(it), "good");
  if (!canEquip(p, it)) return L("⛔ " + it.name + " chỉ dành cho " + gearClsName(it.cls) + ", " + p.name + " không mặc được.", "bad");
  if (gearScore(it) > gearScore(old)) { if (old) applyStats(p, old.stats, -1); p.equipment[it.slot] = it; applyStats(p, it.stats, +1); L("🎽 " + p.name + " trang bị món mới (mạnh hơn đồ cũ).", "good"); FX(i, "🎽 " + it.rarity.name, "heal"); }
  else L("↩️ " + p.name + " bỏ lại (yếu hơn đồ đang mặc).");
}
/* Co-op: nghỉ giữa đợt. Mỗi người chọn (p.rv) rồi bấm Tiếp tục (p.rdy). Cả 2 sẵn sàng: cùng ý thì theo ý đó, khác ý thì random. */
function hostRestStart() {
  const s = co.s;
  s.phase = "rest"; s.players.forEach(p => { p.rv = null; p.rdy = false; });
  L("🏕️ Cả đội tìm thấy một khu vực nghỉ ngơi. Hãy bỏ phiếu: nghỉ ngắn hay nghỉ dài?");
  publish();
}
function hostRestVote(pi, v) {
  const s = co.s, p = s && s.players[pi];
  if (!s || s.phase !== "rest" || s.over || p.rdy) return;
  p.rv = v; publish();
}
function hostRestReady(pi) {
  const s = co.s, p = s && s.players[pi];
  if (!s || s.phase !== "rest" || s.over || p.rdy || !p.rv) return;
  p.rdy = true;
  if (s.players.every(x => x.rdy)) return hostRestResolve();
  publish();
}
function hostRestResolve() {
  const s = co.s, [a, b] = s.players.map(p => p.rv), same = a === b, kind = same ? a : (Math.random() < 0.5 ? a : b);
  L((same ? "🗳️ Cả đội cùng chọn " : "🗳️ Mỗi người một ý, game chọn ngẫu nhiên: ") + restKinds[kind].n.toLowerCase() + ".");
  if (kind === "long" && Math.random() < CONFIG.rest.ambush) return hostAmbush();
  s.players.forEach((p, i) => { const [h, m] = restGain(p, kind); L("🏕️ " + p.name + " hồi " + h + " máu, " + m + " mana.", "good"); if (h > 0) FX(i, "+" + h, "heal"); });
  hostAdvance();
}
function hostAmbush() {   // tập kích: không hồi gì, không đổi bước (step), đánh xong đi tiếp luôn
  const s = co.s;
  s.ambush = true; s.round = 1; s.phase = "fight";
  s.players.forEach(p => { p.rv = null; p.rdy = false; });
  s.monsters = spawnGroup(s.floor - 1, false, true, Math.round(s.players.reduce((a, x) => a + x.level, 0) / s.players.length));
  L("⚠️ BỊ TẬP KÍCH! Quái lao ra khi cả đội đang nghỉ, không ai hồi được gì. (Đợt này không tính vào tầng): " + s.monsters.map(m => m.name).join(", ") + " xuất hiện!", "bad");
  publish();
}

/* ---------- Bản đồ lối đi co-op (giống solo: 5 khu vực + phòng boss mỗi tầng) ----------
   s.zone: 1..zones = khu vực chọn lối đi; zones+1 = phòng boss. Mỗi khu vực: genDoors() sinh 3 lối, cả 2 người bỏ phiếu (p.dv).
   Cùng ý thì đi lối đó, khác ý thì game chọn ngẫu nhiên. Loại thật của lối ẩn chỉ lưu ở chủ phòng (co.doors), không gửi cho người vào. */
const zoneName = z => z > CONFIG.map.zones ? "👑 Phòng Boss" : "Khu vực " + z + "/" + CONFIG.map.zones;
const avgLv = s => Math.round(s.players.reduce((a, x) => a + x.level, 0) / s.players.length);

function hostAdvance() {   // xong 1 phòng: sang khu vực kế / boss / tầng mới
  const s = co.s;
  s.ambush = false; s.bless = false; s.players.forEach(p => { p.rv = null; p.rdy = false; p.dv = null; });
  if (s.zone > CONFIG.map.zones) {   // vừa xong phòng boss
    s.zone = 1; s.floor++;
    L("🏁 Cả đội qua tầng " + (s.floor - 1) + "! Bước sang tầng " + s.floor + ".", "good");
    return hostDoors();
  }
  s.zone++;
  if (s.zone > CONFIG.map.zones) return hostFight(finalKind(s.floor));   // phòng boss: không có lựa chọn
  hostDoors();
}

function hostDoors() {
  const s = co.s, real = genDoors(s.floor, "coop");
  co.doors = real;
  s.doors = real.map(d => d.hidden ? { hidden: true } : { icon: d.icon, name: d.name });
  s.phase = "doors"; s.round = 1;
  s.players.forEach(p => { p.dv = null; });
  L("🚪 Tầng " + s.floor + " · " + zoneName(s.zone) + ": cả đội chọn lối đi.");
  publish();
}

function hostDoorVote(pi, i) {
  const s = co.s, p = s && s.players[pi];
  if (!s || s.phase !== "doors" || s.over || !s.doors || p.dv != null || !(i >= 0 && i < 3)) return;
  p.dv = i;
  if (s.players.every(x => x.dv != null)) return hostDoorResolve();
  publish();
}

function hostDoorResolve() {
  const s = co.s, [a, b] = s.players.map(p => p.dv), same = a === b, i = same ? a : (Math.random() < 0.5 ? a : b), d = co.doors[i];
  L((same ? "🗳️ Cả đội cùng chọn " : "🗳️ Mỗi người một ý, game chọn ngẫu nhiên ") + DOOR_NAMES[i].toLowerCase() + ".");
  L("🚪 Bước vào: " + d.icon + " " + d.name + "!");
  s.doors = null; co.doors = null;
  hostEnterDoor(d);
}

function hostEnterDoor(d) {
  const s = co.s;
  if (d.type === "fight") return hostFight(d.elite);
  if (d.type === "rest") return hostRestStart();   // bỏ phiếu nghỉ ngắn / dài; hostRestResolve → hostAdvance
  if (d.type === "treasure") {
    L("💎 Cả đội mở được một chiếc rương!", "good");
    s.players.forEach((p, i) => coopGive(p, i, rollItem(s.floor, "treasure", p.cls, luckOf(p))));
    return hostAdvance();
  }
  if (d.type === "blessing") {   // mỗi người chọn 1 nâng cấp (dùng lại pha thưởng)
    L("⛩️ Cả đội thấy một bàn thờ cổ và được ban phúc.", "good");
    s.bless = true; s.phase = "reward";
    s.players.forEach(p => { p.pending = (p.pending || 0) + 1; p.picked = false; p.offers = newOffers(); });
    return publish();
  }
  s.players.forEach((p, i) => {   // bẫy: mỗi người mất 15% máu tối đa (không chết)
    const loss = Math.max(0, Math.min(p.hp - 1, Math.round(p.maxHp * 0.15)));
    p.hp -= loss;
    L("🕸️ Dính bẫy! " + p.name + " mất " + loss + " máu.", "bad");
    FX(i, "-" + loss, "dmg", true);
  });
  hostAdvance();
}

function hostFight(kind) {
  const s = co.s;
  s.round = 1; s.phase = "fight"; s.doors = null;
  s.monsters = spawnGroup(s.floor - 1, kind, true, avgLv(s));
  L("Tầng " + s.floor + " · " + zoneName(s.zone) + (kind === "boss" ? " (👑 TRÙM)" : kind === "mini" ? " (💀 BOSS PHỤ)" : kind ? " (tinh anh)" : "") + ": " + s.monsters.map(m => m.name).join(", ") + " xuất hiện!");
  publish();
}

function gainXpCoop(p, i, amount) {
  const U = CONFIG.levelUp;
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext; p.level++; p.pending = (p.pending || 0) + 1;
    p.xpToNext = xpNeed(p.level);
    const G = lvGain(p); p.maxHp += G.hp; p.atkMin += G.atk; p.atkMax += G.atk; p.maxMana += 10;
    p.mana = Math.min(p.maxMana, p.mana + 10 + Math.round(p.maxMana * U.manaPercent));
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * U.healPercent));
    L("⭐ " + p.name + " lên cấp " + p.level + "!", "good");
    FX(i, "LÊN CẤP!", "lvl");
  }
}

function hostPick(pi, i) {
  const s = co.s, p = s && s.players[pi];
  if (!s || s.phase !== "reward" || p.picked || !p.offers.includes(i)) return;
  const r = REWARDS[i];
  r.apply(p);
  p.pending = Math.max(0, (p.pending || 0) - 1);
  if (p.pending > 0) p.offers = newOffers(); else p.picked = true;   // lên nhiều cấp: chọn tiếp
  L("🎁 " + p.name + " nhận: " + r.name + " (" + r.desc + ")", "good");
  if (s.players.every(x => x.picked)) return hostAdvance();
  publish();
}

function publish() {
  const evs = co.evs;
  co.evs = [];
  coopApply();
  playEvents(evs, co.me);
  if (co.conn && co.conn.open) co.conn.send({ t: "snap", s: co.s, ev: evs, sp: animSpeed });
  vd = 0;
}

/* ---------- Hiển thị (chủ phòng và người vào đều dùng) ---------- */
function playEvents(evs, me) {
  evs.forEach(e => {
    const d = Math.min(2500, +e.d || 0) * TS();
    if (e.k === "log") log(String(e.text), e.cls || "");
    else if (e.k === "fx") {
      const id = idOf(e.p, me);
      setTimeout(() => { if (e.hit) flash(id); floatText(id, String(e.text), e.kind); }, d);
    } else if (e.k === "vfx" && Array.isArray(e.t)) {
      setTimeout(() => playVfx(String(e.n), idOf(e.f, me), e.t.slice(0, 6).map(x => idOf(x, me)), typeof e.a === "string" ? e.a : null), d);
    }
  });
}

function coopSyncState(s, me) {   // đồng bộ state local từ snapshot server
  if (co.tg != null) me.tg = co.tg;
  state.mode = "coop";
  state.zone = s.zone; state.ambush = !!s.ambush;
  state.player = me;
  state.monsters = s.monsters;
  state.monsterIndex = s.floor - 1;
  state.turn = s.round; state.order = s.order || null; state.cur = s.cur ?? -1;
  state.over = s.over;
  state.busy = !(s.phase === "fight" && me.hp > 0 && !me.act && !s.over);
}
function coopReward(s, me) {   // pha chọn thưởng lên cấp / chúc phúc
  if (s.phase === "reward" && !me.picked && !s.over) {
    const rk = s.floor + ":" + (me.pending || 0) + ":" + (s.bless ? 1 : 0);
    if (co.rwFloor !== rk) {
      co.rwFloor = rk;
      $("reward").querySelector("h2").textContent = s.bless ? "⛩️ Chúc phúc" : "⭐ Lên cấp " + me.level + "!";
      $("reward").querySelector("p").textContent = "Chọn 1 nâng cấp chỉ số" + (me.pending > 1 ? " (còn " + me.pending + " lần chọn)" : "");
      const list = $("reward-list");
      list.innerHTML = "";
      me.offers.forEach(i => {
        const r = REWARDS[i], b = document.createElement("button");
        b.textContent = r.icon + " " + r.name + " — " + r.desc;
        b.onclick = () => coopPick(i);
        list.appendChild(b);
      });
    }
    $("reward").classList.add("show");
  } else { $("reward").classList.remove("show"); co.rwFloor = null; }   // rời pha thưởng: lần lên cấp sau phải dựng lại danh sách
}
function coopEnd(s) {   // cả đội gục ngã
  if (s.over && !co.endShown) {
    co.endShown = true;
    sfx("lose");
    $("result-title").textContent = "💀 Cả đội gục ngã";
    $("result-text").textContent = "Đội bạn dừng ở tầng " + s.floor + ". " + s.players.map(p => p.name + " cấp " + p.level).join(", ") + ".";
    setTimeout(() => $("overlay").classList.add("show"), 600);
  }
}

function coopApply() {
  const s = co.s, me = s.players[co.me];
  coopSyncState(s, me);
  coopReward(s, me);
  $("rest").classList.toggle("show", s.phase === "rest" && !s.over);
  const showDoors = s.phase === "doors" && !s.over && !!s.doors;
  if (showDoors) renderCoopDoors(s, me);
  $("rooms").classList.toggle("show", showDoors);
  coopEnd(s);
  render();
}

/* Màn chọn lối đi co-op: hiện phiếu của mình và của đồng đội */
function renderCoopDoors(s, me) {
  const mate = s.players[1 - co.me], list = $("room-list");
  list.innerHTML = "";
  s.doors.forEach((d, i) => {
    const b = document.createElement("button"), tag = (me.dv === i ? " · ✔ Bạn chọn" : "") + (mate.dv === i ? " · 🤝 " + esc(mate.name) + " chọn" : "");
    b.innerHTML = '<span class="dicon">' + (d.hidden ? "❓" : d.icon) + "</span><b>" + (d.hidden ? "Chưa rõ" : d.name) + "</b><small>" + DOOR_NAMES[i] + tag + "</small>";
    if (me.dv === i) b.style.borderColor = "var(--gold)";
    b.disabled = me.dv != null;
    b.onclick = () => coopDoor(i);
    list.appendChild(b);
  });
  $("rooms-title").textContent = "🚪 Chọn lối đi · " + zoneName(s.zone);
  $("rooms-note").textContent = me.dv != null ? "⏳ Đợi " + mate.name + " chọn…"
    : "Cả hai cùng chọn lối đi. Nếu mỗi người một ý, game chọn ngẫu nhiên. Lối ❓ chỉ biết phía sau có gì khi bước vào.";
}

function coopRender() {
  const s = co.s, me = s.players[co.me], mate = s.players[1 - co.me];
  $("floor-badge").textContent = "🤝 Co-op · Tầng " + s.floor + " · " + (s.ambush ? "⚠️ Tập kích" : zoneName(s.zone || 1)) + (s.monsters.some(m => m.boss && m.hp > 0) ? " · 👑 Trùm" : "") + " · Phòng " + co.code.toUpperCase();
  $("turn-info").textContent = s.over ? "" : s.phase === "resolve" ? actLabel() : s.phase === "reward" ? (me.picked ? "⏳ Đợi " + mate.name + " chọn thưởng…" : "Chọn phần thưởng")
    : s.phase === "doors" ? (me.dv != null ? "⏳ Đợi " + mate.name + "…" : "🚪 Chọn lối đi")
    : s.phase === "rest" ? (me.rdy ? "⏳ Đợi " + mate.name + "…" : "🏕️ Nghỉ ngơi: hãy bỏ phiếu")
    : me.hp <= 0 ? "💀 Bạn đã gục, chờ đồng đội…" : me.act ? "⏳ Đợi " + mate.name + "…" : "Chọn hành động";
  $("btn-potion").querySelector(".al").textContent = "🎒 Túi đồ"; $("btn-potion").querySelector(".ab").textContent = "";
  $("btn-potion").disabled = true;
  $("mate").style.display = "grid";
  fillPanel("mate", mate);
  $("mate-fx").innerHTML = fxIcons(mate);
  $("mate-fx").hidden = !$("mate-fx").textContent.trim();
  const down = mate.hp <= 0;
  const st = down ? ["💀 Đã gục", "down"]
    : s.phase === "reward" ? (mate.picked ? ["✔ Xong", "ready"] : ["⭐ Đang chọn nâng cấp…", ""])
    : s.phase === "doors" ? (mate.dv != null ? ["✔ Đã chọn lối", "ready"] : ["🚪 Đang chọn lối…", ""])
    : s.phase === "rest" ? (mate.rdy ? ["✔ Sẵn sàng", "ready"] : [mate.rv ? "🗳️ Đã bỏ phiếu" : "🏕️ Đang chọn…", ""])
    : mate.act ? ["✔ Đã sẵn sàng", "ready"] : mate.defending ? ["🛡️ Đang phòng thủ", "def"] : ["⏳ Đang suy nghĩ…", ""];
  $("mate-status").textContent = st[0]; $("mate-status").className = st[1];
  $("mate-avatar").classList.toggle("dead", down);
  $("mate-avatar").classList.toggle("ready", st[1] === "ready");
  setAv($("mate-avatar"), mate.cls);
}

/* ---------- Hành động của người chơi ---------- */
function coopAct(action) {
  if (!co || !co.s || state.busy || state.over) return;
  if (!/^(attack|defend|s[0-4])$/.test(action) || !canAct(state.player, action)) return;
  if (co.me === 0) return hostAct(0, action);
  co.conn.send({ t: "act", a: action, g: state.player.tg });
  co.s.players[co.me].act = action;   // hiện "đợi" ngay, trạng thái thật sẽ về sau
  coopApply();
}

function coopPick(i) {
  if (!co || !co.s) return;
  if (co.me === 0) return hostPick(0, i);
  co.conn.send({ t: "pick", i });
  co.s.players[co.me].picked = true;
  coopApply();
}

function coopDoor(i) {
  if (!co || !co.s || co.s.phase !== "doors") return;
  if (co.me === 0) return hostDoorVote(0, i);
  const me = co.s.players[co.me];
  if (me.dv != null) return;
  co.conn.send({ t: "door", i });
  me.dv = i; coopApply();
}

function coopRestVote(v) {
  if (!co || !co.s || co.s.phase !== "rest") return;
  if (co.me === 0) return hostRestVote(0, v);
  const me = co.s.players[co.me];
  if (me.rdy) return;
  co.conn.send({ t: "rest", v });
  me.rv = v; coopApply();
}
function coopRestGo() {
  if (!co || !co.s || co.s.phase !== "rest") return;
  const me = co.s.players[co.me];
  if (!me.rv || me.rdy) return;
  if (co.me === 0) return hostRestReady(0);
  co.conn.send({ t: "restgo" });
  me.rdy = true; coopApply();
}

