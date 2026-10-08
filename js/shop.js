/* js/shop.js — Tiền tệ (vàng 💰) và thương nhân: vàng rơi, giá cả, kho hàng, màn Mua / Bán. Chỉ chế độ solo. */
/* =====================================================
   VÀNG + THƯƠNG NHÂN
   - Vàng lưu ở p.gold. Nhận từ: quái (handleVictory) · rương (Kho báu, rương cũ ở Phòng bí ẩn).
   - Thương nhân lang thang: mỗi tầng gặp đúng 1 lần, tự xuất hiện ngay trước màn Chọn phòng (xem showRooms trong rooms.js),
     hàng mới mỗi tầng, rời đi rồi thì không quay lại được.
   - Số liệu cân bằng: CONFIG.gold và CONFIG.shop (config.js).
   ===================================================== */
const goldOf = p => (p && p.gold) || 0;

/* ----- Vàng rơi ----- */
function rollGold(ms, floor, luck = 0) {   // tổng vàng của 1 đợt quái
  const G = CONFIG.gold, fs = 1 + G.floorScale * (floor - 1);
  let sum = 0;
  ms.forEach(m => {
    const [lo, hi] = G.mon[m.size] || G.mon.s;
    sum += rand(lo, hi) * fs * (m.boss ? G.bossMul : m.mini ? G.miniMul : m.elite ? G.eliteMul : 1);
  });
  return Math.round(sum * (1 + luck * CONFIG.luckDrop));
}
function chestGold(kind, floor, luck = 0) {   // vàng trong rương: treasure | mystery
  const [lo, hi] = CONFIG.gold.chest[kind];
  return Math.round(rand(lo, hi) * (1 + CONFIG.gold.floorScale * (floor - 1)) * (1 + luck * CONFIG.luckDrop));
}
function addGold(p, n, why) {
  if (!(n > 0)) return 0;
  p.gold = goldOf(p) + n;
  log("💰 " + why + ": +" + n + " vàng.", "good");
  floatText("player-avatar", "+" + n + " 💰", "gold");
  return n;
}

/* ----- Giá cả ----- */
const gearPrice = it => Math.max(10, Math.round((CONFIG.shop.gearBase + gearScore(it) * CONFIG.shop.gearPerScore) / 5) * 5);
const potPrice = (k, r) => CONFIG.shop.potion[k][r];
const shopRate = wander => wander ? CONFIG.shop.wander.sellRate : CONFIG.shop.sellRate;   // tỉ lệ thu mua lại
const sellGearPrice = (it, wander) => Math.max(1, Math.floor(gearPrice(it) * shopRate(wander)));
const sellPotPrice = (k, r, wander) => Math.max(1, Math.floor(potPrice(k, r) * shopRate(wander)));
const rarIdx = it => Math.max(0, RARITIES.findIndex(r => it.rarity && r.name === it.rarity.name));

/* ----- Kho hàng ----- */
function makeStock(floor) {
  const W = CONFIG.shop.wander, mul = W.priceMul;
  const gear = [];
  for (let i = 0; i < W.gear; i++) {
    let it, t = 0;   // đồ chất lượng kho báu. Tránh 2 món y hệt nhau
    do it = rollItem(floor, "treasure"); while (gear.some(e => e.it.name === it.name && statLine(e.it) === statLine(it)) && ++t < 8);
    gear.push({ it, price: Math.round(gearPrice(it) * mul / 5) * 5, sold: false });
  }
  gear.sort((a, b) => a.price - b.price);
  const pots = W.pots.map(([k, r, n]) => ({ k, r, n, price: Math.round(potPrice(k, r) * mul) }));
  return { gear, pots };
}

/* ----- Giao diện ----- */
function openShop(done) {   // done: hàm chạy sau khi rời đi
  const floor = state.monsterIndex + 1;
  state.shop = { floor, stock: makeStock(floor), tab: "buy", done };
  renderShop();
  $("shop").classList.add("show");
}
function closeShop() {
  const sh = state.shop;
  $("shop").classList.remove("show"); state.shop = null;
  render();
  if (sh && sh.done) sh.done();
}

/* ----- DOM builders cho shop ----- */
function shopSec(list, t, r) { const h = document.createElement("h3"); h.innerHTML = "<span>" + t + "</span><small>" + (r || "") + "</small>"; list.appendChild(h); }
function shopNone(list, t) { const e = document.createElement("p"); e.className = "none"; e.textContent = t; list.appendChild(e); }
function shopBtn(t, fn, dis, cls) { const b = document.createElement("button"); b.className = cls || "sec"; b.innerHTML = t; b.disabled = !!dis; b.onclick = fn; return b; }
function shopRow(list, html, btns, cls) {
  const d = document.createElement("div"); d.className = "srow " + (cls || "");
  d.innerHTML = '<div class="gi">' + html + '</div><div class="gb"></div>';
  btns.forEach(b => d.querySelector(".gb").appendChild(b)); list.appendChild(d);
}
function shopConfirm(label, ok) {   // nút "bán đồ hiếm": bấm lần 1 hỏi lại, lần 2 mới bán
  let armed = false;
  const b = shopBtn(label, () => {
    if (!armed) { armed = true; b.textContent = "Chắc chưa?"; return setTimeout(() => { armed = false; b.innerHTML = label; }, 2500); }
    ok();
  }, false, "sec del");
  return b;
}
const shopCmp = (p, it) => { const d = gearScore(it) - gearScore(p.equipment[it.slot]); return d > 0 ? '<span class="gd up">▲ mạnh hơn đồ đang mặc</span>' : d < 0 ? '<span class="gd dn">▼ yếu hơn đồ đang mặc</span>' : '<span class="gd">= tương đương</span>'; };

function shopHeader() {   // tiêu đề + vàng + tab Mua/Bán
  const sh = state.shop, p = state.player;
  $("shop-title").textContent = "🧙 Thương nhân lang thang · Tầng " + sh.floor;
  $("shop-gold").innerHTML = "Vàng của bạn: <b>💰 " + goldOf(p) + "</b>";
  $("shop-note").textContent = sh.tab === "buy"
    ? "Mỗi tầng chỉ gặp ông ta một lần, rời đi là không quay lại được. Thu mua lại " + pct(shopRate(true)) + "% giá gốc."
    : "Bán đồ không cần dùng để lấy vàng. Nhận " + pct(shopRate(true)) + "% giá gốc.";
  $("shop-buy").classList.toggle("on", sh.tab === "buy"); $("shop-sell").classList.toggle("on", sh.tab === "sell");
}

function shopBuyGear(p, list, st, gold, sold) {   // tab Mua: trang bị
  shopSec(list, "⚔️ Trang bị", "🎒 " + p.gbag.length + " / " + CONFIG.solo.gearBag);
  st.gear.forEach(e => {
    if (e.sold) return shopRow(list, "<small>✔ Đã bán hết</small>", [], "empty");
    const it = e.it, room = gearRoom(p), cant = gold < e.price, okC = canEquip(p, it);
    const buy = (equip) => {
      if (goldOf(p) < e.price || !gearRoom(p) || e.sold) return;
      p.gold = goldOf(p) - e.price; e.sold = true; p.gbag.push(it); sfx("gold");
      log("🛒 Mua " + it.name + " (" + e.price + " vàng).", "good");
      if (equip) gearAct(p, "gear:eq:" + (p.gbag.length - 1));
      sold();
    };
    shopRow(list, itemHtml(it) + "<br><small>" + shopCmp(p, it) + " · " + (it.lab || "") + "</small>",
      [shopBtn(room ? "Mua 💰" + e.price : "Túi đầy", () => buy(false), cant || !room, "on"),
       shopBtn(okC ? "Mua &amp; mặc" : "⛔ Khác class", () => buy(true), cant || !room || !okC)], "g" + rarIdx(it));
  });
}
function shopBuyPots(p, list, st, gold, sold) {   // tab Mua: vật phẩm
  shopSec(list, "🧪 Vật phẩm");
  let any = false;
  st.pots.forEach(e => {
    if (e.n <= 0) return; any = true;
    const T = ITEM_TYPES[e.k];
    shopRow(list, '<span class="r' + e.r + '">' + T.i + " <b>" + T.n + "</b> (" + ITEM_RAR[e.r].name + ")</span> · còn " + e.n + "<br><small>" + itemDesc(e.k, e.r) + "</small>",
      [shopBtn("Mua 💰" + e.price, () => {
        if (goldOf(p) < e.price || e.n <= 0) return;
        p.gold = goldOf(p) - e.price; e.n--; p.bag.push({ k: e.k, r: e.r }); sfx("gold");
        log("🛒 Mua " + bagName(e) + " (" + e.price + " vàng).", "good"); sold();
      }, gold < e.price, "on")], "g" + e.r);
  });
  if (!any) shopNone(list, "Hết vật phẩm.");
}
function shopSellWorn(p, list, sold) {   // tab Bán: đồ đang mặc
  shopSec(list, "🎽 Đang mặc", "bán sẽ tháo đồ ra");
  const wd = true;
  ["weapon", "armor", "charm"].forEach(k => {
    const it = p.equipment[k]; if (!it) return;
    const v = sellGearPrice(it, wd);
    shopRow(list, itemHtml(it), [shopConfirm("Bán 💰" + v, () => {
      applyStats(p, it.stats, -1); p.equipment[k] = null; p.gold = goldOf(p) + v; sfx("gold");
      log("💰 Bán " + it.name + " (đang mặc) được " + v + " vàng.", "good"); sold();
    })], "g" + rarIdx(it));
  });
  if (!["weapon", "armor", "charm"].some(k => p.equipment[k])) shopNone(list, "Bạn chưa mặc món nào.");
}
function shopSellGear(p, list, sold) {   // tab Bán: trang bị trong túi
  const wd = true;
  shopSec(list, "🧰 Trang bị trong túi", p.gbag.length + " / " + CONFIG.solo.gearBag);
  p.gbag.forEach((it, n) => {
    const v = sellGearPrice(it, wd), ri = rarIdx(it), okC = canEquip(p, it);
    const sell = () => { const i = p.gbag.indexOf(it); if (i < 0) return; p.gbag.splice(i, 1); p.gold = goldOf(p) + v; sfx("gold"); log("💰 Bán " + it.name + " được " + v + " vàng.", "good"); sold(); };
    shopRow(list, itemHtml(it) + "<br><small>" + shopCmp(p, it) + " · " + (it.lab || "") + "</small>",
      [shopBtn(okC ? "Mặc" : "⛔ Khác class", () => { gearAct(p, "gear:eq:" + n); sold(); }, !okC, "on"),
       ri >= 2 ? shopConfirm("Bán 💰" + v, sell) : shopBtn("Bán 💰" + v, sell)], "g" + ri);
  });
  if (!p.gbag.length) shopNone(list, "Túi không có trang bị.");
}
function shopSellPots(p, list, sold) {   // tab Bán: vật phẩm tiêu hao
  const wd = true;
  const g = {}; (p.bag || []).forEach(x => { const id = x.k + ":" + x.r; g[id] = (g[id] || 0) + 1; });
  shopSec(list, "🧪 Vật phẩm", (p.bag || []).length + "");
  Object.keys(g).sort().forEach(id => {
    const [k, r] = id.split(":"), ri = +r, T = ITEM_TYPES[k], v = sellPotPrice(k, ri, wd);
    shopRow(list, '<span class="r' + ri + '">' + T.i + " <b>" + T.n + "</b> (" + ITEM_RAR[ri].name + ")</span> ×" + g[id] + "<br><small>" + itemDesc(k, ri) + "</small>",
      [shopBtn("Bán 1 💰" + v, () => {
        const i = p.bag.findIndex(x => x.k === k && x.r === ri); if (i < 0) return;
        p.bag.splice(i, 1); p.gold = goldOf(p) + v; sfx("gold"); log("💰 Bán " + bagName({ k, r: ri }) + " được " + v + " vàng.", "good"); sold();
      })], "g" + ri);
  });
  if (!(p.bag || []).length) shopNone(list, "Không có vật phẩm.");
}

function renderShop() {
  const sh = state.shop; if (!sh) return;
  const p = state.player, list = $("shop-list"), st = sh.stock, gold = goldOf(p);
  p.gbag = p.gbag || []; list.innerHTML = "";
  shopHeader();
  const sold = () => { render(); renderShop(); };
  if (sh.tab === "buy") { shopBuyGear(p, list, st, gold, sold); shopBuyPots(p, list, st, gold, sold); }
  else { shopSellWorn(p, list, sold); shopSellGear(p, list, sold); shopSellPots(p, list, sold); }
}

$("shop-buy").onclick = () => { if (state.shop) { state.shop.tab = "buy"; renderShop(); } };
$("shop-sell").onclick = () => { if (state.shop) { state.shop.tab = "sell"; renderShop(); } };
$("shop-close").onclick = closeShop;
