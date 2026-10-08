/* js/render.js — Hiển thị: cập nhật giao diện theo state (render), bảng chỉ số, thanh thứ tự, chữ bay. */
/* =====================================================
   PHẦN 6: HIỂN THỊ (cập nhật giao diện theo state)
   ===================================================== */
/* Bảng chỉ số + trang bị dùng chung cho mình và đồng đội (co-op) */
/* Bảng chỉ số + trang bị + thanh HP/Mana/XP, dùng chung cho mình và đồng đội */
const panelHTML = (x, av) => '<div class="avatar" id="' + av + '"></div><div class="info"><div class="name"><span><span id="' + x + '-name"></span>' + (x === "mate" ? '<em class="tag">Đồng đội</em>' : "") + '</span><span class="nr"><span class="lvb" id="' + x + '-lv"></span>' + (x === "mate" ? "" : '<span class="goldb" id="' + x + '-gold" title="Vàng"></span>') + '<button class="statb" data-x="' + x + '" title="Xem chỉ số" aria-label="Xem chỉ số"><u class="vi"></u></button></span></div>' +
  '<div class="vitals">' + [["hp", "HP"], ["mp", "Mana"], ["xp", "XP"]].map(v => '<div class="vbar ' + v[0] + '" id="' + x + '-' + v[0] + '"><i></i><span><b><u class="vi"></u>' + v[1] + "</b><em></em></span></div>").join("") + "</div>" +
  (x === "mate" ? '<div id="mate-status"></div><div class="badge" id="mate-fx"></div>' : '<div class="badge" id="player-status"></div>') + '</div><div class="sgrid" id="' + x + '-stats"></div><div class="eqs" id="' + x + '-eq"></div>';
$("me").innerHTML = panelHTML("me", "player-avatar"); $("mate").innerHTML = panelHTML("mate", "mate-avatar");
function statGrid(p) {
  const c = (ic, l, v, tip) => '<div title="' + tip + '"><span><i>' + ic + "</i><em> " + l + "</em></span><b>" + esc(v) + "</b></div>";
  return [
    c("⚔️", "Sát thương", p.atkMin + "–" + p.atkMax, "Sát thương mỗi đòn đánh thường"),
    c("⚡", "Tốc độ", p.spd || 0, "Tốc độ cao ra đòn trước; mỗi điểm hơn/kém đối thủ ±" + CONFIG.speedEvasion * 100 + "% né"),
    c("🎯", "Chí mạng", pct(critBase(p)) + "%", "Tỉ lệ chí mạng (đã gồm may mắn)"),
    c("💥", "ST chí mạng", pct(p.critDmg || 1.5) + "%", "Sát thương nhân lên khi chí mạng"),
    c("💨", "Né", pct(Math.min(.6, p.evasion || 0)) + "%", "Né cơ bản (chưa tính chênh lệch tốc độ)"),
    c("🍀", "May mắn", p.luck || 0, "Mỗi điểm: +" + CONFIG.luckCrit * 100 + "% chí mạng, +" + CONFIG.luckDrop * 100 + "% tỉ lệ rơi đồ, đồ Hiếm / Huyền thoại dễ ra hơn"),
    c("🛡️", "Phòng thủ", "-" + pct(Math.min(.9, p.defendReduce || 0)) + "%", "Sát thương nhận vào giảm khi Phòng thủ"),
    c("💧", "Hồi mana", "+" + (p.regen || 0) + "/lượt", "Mana hồi mỗi lượt"),
    c("🔰", "Kháng HE", pct(Math.min(.8, p.res || 0)) + "%", "Kháng hiệu ứng: giảm tỉ lệ dính choáng, chảy máu, độc... (tối đa 80%)")
  ].join("");
}
function equipRows(p) {
  return ["weapon", "armor", "charm"].map(k => {
    const g = (GEAR[p.cls] || GEAR.knight)[k], it = p.equipment && p.equipment[k];
    const ri = it ? Math.max(0, RARITIES.findIndex(r => it.rarity && r.name === it.rarity.name)) : 0;   // so theo tên vì dữ liệu từ mạng không còn là cùng đối tượng
    const st = it ? Object.entries(it.stats || {}).filter(([s]) => STAT_TEXT[s]).map(([s, v]) => STAT_TEXT[s](v)).join(" · ") : "";
    return '<div class="eq' + (it ? " r" + ri : " empty") + '"><span class="eic">' + ((it && it.icon) || g.icon) + "</span><div><b>" + esc(it ? RARITIES[ri].icon + " " + it.name : "Trống") + "</b><small>" + esc(st || g.label) + "</small></div><em>" + esc((it && it.lab) || g.label) + "</em></div>";
  }).join("");
}
function fillPanel(x, p) {
  const C = CLASSES[p.cls] || CLASSES.knight, set = (k, cur, max) => { const e = $(x + "-" + k); e.firstElementChild.style.width = Math.max(0, cur / max * 100) + "%"; e.querySelector("em").textContent = cur + " / " + max; };
  $(x + "-name").textContent = p.name === C.name ? C.name : p.name + " · " + C.name; $(x + "-lv").textContent = "Lv " + p.level;
  const gb = $(x + "-gold"); if (gb) { gb.hidden = state.mode === "coop"; gb.textContent = "💰 " + (p.gold || 0); }   // vàng: chỉ solo
  set("hp", p.hp, p.maxHp); set("mp", p.mana, p.maxMana); set("xp", p.xp, p.xpToNext);
  $(x + "-hp").classList.toggle("low", p.hp > 0 && p.hp / p.maxHp < 0.3);
  $(x + "-stats").innerHTML = statGrid(p); $(x + "-eq").innerHTML = equipRows(p);
}
/* Thanh thứ tự ra đòn + dấu ▼ trên người đang đánh */
function renderOrder() {
  const cp = state.mode === "coop" && co && co.s, P = cp ? co.s.players : [state.player], me = cp ? co.me : 0, ms = state.monsters;
  const live = state.order, ord = live || buildOrder(P, ms), cur = live ? state.cur : -1, idleMe = !live && !state.busy && !state.over && state.mode !== "coop";   // idleMe: đang chờ người chơi chọn → sáng chip của mình
  $("order").innerHTML = "<b>⚡ Thứ tự</b>" + ord.map((tk, i) => {
    const pl = typeof tk === "number", a = pl ? P[tk] : ms[+tk.slice(1)];
    if (!a) return "";
    return '<span class="oc ' + (pl ? (tk === me ? "me" : "mate") : "foe") + ((i === cur || (idleMe && tk === me)) ? " now" : "") + (live && i < cur ? " done" : "") + (a.hp <= 0 ? " dead" : "") + '" title="' + esc(a.name) + '">' + (pl ? icoHTML(a.cls) : monIco(a)) + "</span>";
  }).join("");
  const oh = $("order").querySelector("b"); if (oh && !oh.onclick) oh.onclick = () => log("Thứ tự ra đòn: viền vàng là lượt hiện tại.");
  document.querySelectorAll(".avatar.acting").forEach(e => e.classList.remove("acting"));
  if (live && live[cur] != null) { const el = $(idOf(live[cur], me)); el && el.classList.add("acting"); }
}
const fxIcons = p => [["taunt", "📣"], ["guard", "🧱"], ["hide", "🌫️"], ["buff", "🙏"]].filter(x => p.fx && p.fx[x[0]] > 0).map(x => x[1]).join(" ") + " " + stIcons(p);

function renderArena(p, ms) {   // khung sân đấu + nhân vật
  $("game").classList.toggle("coop", state.mode === "coop");
  syncAll();   // bố cục ngang (layout.js): ép xoay + bật/tắt theo chế độ + độ rộng
  $("arena").classList.toggle("bossroom", ms.some(m => m.boss && m.hp > 0));   // phòng trùm: đuốc và cổng chuyển sang đỏ
  setAv($("player-avatar"), p.cls);
  $("player-avatar").classList.toggle("dead", p.hp <= 0);
  fillPanel("me", p);
  $("player-status").innerHTML = (p.defending ? "🛡️ Đang phòng thủ " : "") + fxIcons(p);
  $("player-status").hidden = !$("player-status").textContent.trim();   // trống thì ẩn để khung căn giữa
}
function renderMons(p, ms) {   // thẻ quái: mỗi con 1 thẻ, bấm để chọn mục tiêu
  if (!ms[p.tg] || ms[p.tg].hp <= 0) p.tg = Math.max(0, ms.findIndex(m => m.hp > 0));
  const key = state.monsterIndex + "|" + ms.map(m => m.id).join();
  if (render.k !== key) {
    render.k = key;
    $("mons").innerHTML = ms.map((m, i) => '<div class="mon ' + (["s", "m", "l"].includes(m.size) ? m.size : "s") + '" data-i="' + i + '"><div class="avatar enter" id="mon-' + i + '"></div><div class="mname"></div><div class="bar"><div></div><span class="bt"></span></div><div class="bar mp"><div></div><span class="bt"></span></div><small></small><div class="mst"></div><div class="msk"></div></div>').join("");
  }
  const aliveN = ms.filter(m => m.hp > 0).length;
  [...$("mons").children].forEach((c, i) => {
    const m = ms[i], av = c.firstElementChild;
    setMonAv(av, m);
    c.querySelector(".mname").innerHTML = '<span class="lvb">Lv ' + (m.lv || 1) + "</span> " + esc(m.name);
    c.classList.toggle("sel", i === p.tg && aliveN > 1);
    av.classList.toggle("dead", m.hp <= 0); av.classList.toggle("boss", !!m.boss);
    c.querySelector(".bar > div").style.width = (m.hp / m.maxHp * 100) + "%";
    c.querySelector(".bar:not(.mp) .bt").textContent = m.hp + "/" + m.maxHp;
    c.querySelector(".bar.mp .bt").textContent = m.maxMp ? Math.round(m.mp) + "/" + m.maxMp : "";
    c.querySelector("small").innerHTML = (m.res > 0 ? "<span>🔰" + pct(m.res) + "%</span>" : "");
    c.querySelector(".bar.mp > div").style.width = (m.maxMp ? m.mp / m.maxMp * 100 : 0) + "%";
    c.querySelector(".mst").innerHTML = stIcons(m);
    c.querySelector(".msk").innerHTML = (m.sk || []).map((k, j) => { const cd = (m.cds || [])[j] || 0; return '<span class="' + (cd > 0 || m.mp < k.c ? "off" : "") + '" title="' + esc(k.n + " — " + k.c + "💧 · hồi chiêu " + k.cdn + " · " + k.d + (stTxt(k) ? " · Tỉ lệ gốc: " + stTxt(k) + " (trừ kháng hiệu ứng của mục tiêu)" : "")) + '">' + k.i + (cd > 0 ? "<sub>" + cd + "</sub>" : "") + "</span>"; }).join("");
  });
}
function renderHead(ms) {   // nhãn tầng + thông tin lượt
  const isBoss = ms.some(m => m.boss), isMini = ms.some(m => m.mini);
  $("floor-badge").textContent = "Tầng " + (state.monsterIndex + 1) + " · " + (state.ambush ? "⚠️ Tập kích" : zoneTxt()) + (isBoss ? " · 👑 Trùm" : isMini ? " · 💀 Boss phụ" : "");
  $("turn-info").textContent = state.over ? "" : state.busy ? (actLabel() || "⏳ Đang giao tranh…") : "Lượt của bạn";
}
function renderActions(lock) {   // khóa/mở nút hành động
  $("btn-attack").disabled = lock; $("btn-defend").disabled = lock; $("btn-heal").disabled = lock;
  if (lock) $("skills").classList.remove("show");
}
function renderSkills(p, C, lock) {   // 4 kỹ năng + tối thượng
  const TIER = { basic: ["Cơ bản", "t-basic"], adv: ["Nâng cao", "t-adv"], ult: ["Tối thượng", "t-ult"] }, cds = p.cds || [0, 0, 0, 0, 0], sil = hasSt(p, "silence");
  document.querySelectorAll("#skills .sk").forEach((b, i) => {
    const k = skDef(p, i), base = C.sk[i], cd = cds[i] || 0, T = TIER[k.tier] || TIER.basic, ev = (p.evoStage || [])[i] || 0;
    b.className = "sk " + T[1] + (cd > 0 ? " oncd" : "") + (ev ? " evoed" : "");
    b.innerHTML = (ev ? '<span class="evob">★</span>' : "") + '<span class="tg">' + T[0] + '</span><span class="ki">' + k.i + "</span> <b>" + k.n + '</b><span class="kc"> · ' + k.c + "💧 · ⏱" + k.cdn + '</span><span class="mpc">' + k.c + " MP</span><br><small>" + k.d + "</small>" + (cd > 0 ? '<span class="cdov">⏳ ' + cd + "</span>" : "");
    b.disabled = lock || sil || p.mana < k.c || cd > 0;
    b.dataset.tip = skTip(k, T[0], cd, p.mana < k.c, sil, evoTip(p, i));
  });
  const U = skDef(p, 4), Ubase = C.sk[4], ucd = cds[4] || 0, ub = $("btn-ult");
  const ustate = ucd > 0 ? "oncd" : p.mana < U.c ? "nomana" : "ready";
  ub.className = ustate + (lock ? " lk" : "") + (((p.evoStage || [])[4] || 0) ? " evoed" : "");
  ub.disabled = lock || sil || ustate !== "ready";
  ub.dataset.tip = skTip(U, "Tối thượng", ucd, p.mana < U.c, sil, evoTip(p, 4));
  $("btn-heal").classList.toggle("ultrdy", !lock && ustate === "ready");   // nút Kỹ năng sáng ★ khi Ultimate sẵn sàng
  ub.querySelector(".uf").style.width = (ucd > 0 ? Math.round(100 * (1 - ucd / U.cdn)) : 100) + "%";
  ub.querySelector(".ut").innerHTML = '<span class="ul">🌟 TỐI THƯỢNG</span><b><span class="ki">' + U.i + "</span> " + U.n + '</b><span class="kc"> · ' + U.c + '💧</span><span class="mpc">' + (ucd > 0 ? "⏳ " + ucd : U.c + " MP") + "</span><small>" +
    (ucd > 0 ? "⏳ Hồi chiêu còn " + ucd + " lượt" : p.mana < U.c ? "Thiếu mana (cần " + U.c + "💧)" : U.d) + "</small>";
}
function renderBag(p, lock) {   // số món trong túi + thứ tự + overlay đang mở
  const bagN = (p.bag || []).length + (p.gbag || []).length;
  $("btn-potion").querySelector(".al").textContent = "🎒 Túi đồ (" + bagN + ")";
  $("btn-potion").querySelector(".ab").textContent = bagN ? String(bagN) : "";
  $("btn-potion").disabled = lock;
  renderOrder();
  if ($("stat-ov").classList.contains("show")) fillStats();
  if (state.mode === "coop" && co && co.s) coopRender();
  if ($("rest").classList.contains("show")) renderRest();
}

function render() {
  const p = state.player, ms = state.monsters, C = CLASSES[p.cls] || CLASSES.knight;
  const lock = state.busy || state.over || p.hp <= 0;
  renderArena(p, ms);
  renderMons(p, ms);
  renderHead(ms);
  renderActions(lock);
  renderSkills(p, C, lock);
  renderBag(p, lock);
}

function flash(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("hit");
  $("arena").classList.add("shake");
  setTimeout(() => { el.classList.remove("hit"); $("arena").classList.remove("shake"); }, 260 * TS());
}

/* Chữ bay lên trên nhân vật: kiểu = dmg | crit | heal | miss | lvl */
function floatText(id, text, kind) {
  const span = document.createElement("span");
  span.className = "float " + kind;
  span.textContent = text;
  const tg = $(id); if (!tg) return; tg.appendChild(span);
  setTimeout(() => span.remove(), 900 * TS());
  sfx(kind);
  if (kind === "miss") dodgeFx(id);
  if (kind === "crit") { $("arena").classList.add("crit"); setTimeout(() => $("arena").classList.remove("crit"), 320 * TS()); }
}

