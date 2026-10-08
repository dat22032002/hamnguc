/* js/layout.js — Công tắc bố cục chiến đấu NGANG (class "hl") + chuyển nút DOM sang các khung mới. Xem LAYOUT_PLAN.md.
   Bật khi: không phải co-op VÀ cửa sổ rộng >= HL_MIN_W. Tắt thì trả mọi nút về đúng chỗ cũ.
   Chỉ DI CHUYỂN nút (giữ nguyên id), không tạo bản sao, nên render()/combat/hiệu ứng không phải sửa. */
const HL_MIN_W = 1000;
let hlOn = false;
const hlMarks = new Map();   // nút đã chuyển → comment đánh dấu chỗ cũ

const hlWant = () => (window.innerWidth >= HL_MIN_W && !(state && state.mode === "coop")) || (isTouchMobile() && effLandscape());   // co-op desktop giữ bố cục cũ; co-op mobile dùng bố cục ngang

/* Mobile: dùng chung bố cục ngang của desktop khi màn hình ngang (thật hoặc bị ép xoay) */
const isTouchMobile = () => window.matchMedia && window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
const isLandscape = () => window.matchMedia && window.matchMedia("(orientation: landscape)").matches;
/* Màn hình ngang hiệu dụng = ngang thật, hoặc đang bị ép xoay 90° (class fland trên body) */
const effLandscape = () => isLandscape() || (typeof document !== "undefined" && document.body.classList.contains("fland"));

/* Mobile cầm dọc: ép xoay cả khung game 90° để luôn hiển thị ngang (app Muse không xoay được).
   Không áp dụng cho co-op (bố cục dọc của co-op giữ nguyên). */
function syncFland() {
  const want = isTouchMobile() && !isLandscape();
  document.body.classList.toggle("fland", want);
}

function hlMove(el, dest) {
  if (!el || el.parentNode === dest) return;
  if (!hlMarks.has(el)) { const m = document.createComment("hl"); el.parentNode.insertBefore(m, el); hlMarks.set(el, m); }
  dest.appendChild(el);
}
function hlRestore() {
  hlMarks.forEach((m, el) => { if (m.parentNode) m.parentNode.insertBefore(el, m); m.remove(); });
  hlMarks.clear();
}
/* tạo 3 khung (1 lần): #hl-top (thanh trên), #hl-bottom > #hl-card + #hl-actions (bảng dưới) */
function hlBuild() {
  if ($("hl-top")) return;
  const g = $("game"), mk = (id, p) => { const d = document.createElement("div"); d.id = id; p.appendChild(d); return d; };
  const top = document.createElement("div"); top.id = "hl-top"; g.insertBefore(top, g.firstChild);
  const bot = mk("hl-bottom", g), card = mk("hl-card", bot), mid = mk("hl-mid", bot); mk("hl-actions", bot);
  /* khung giữa: gợi ý khi chưa mở Kỹ năng; #skills được chuyển vào đây (hiện thành hàng 5 thẻ khi mở) */
  const hint = document.createElement("div"); hint.id = "hl-hint"; hint.textContent = "Bấm “Kỹ năng” để chọn chiêu"; mid.appendChild(hint);
  /* nút "Chỉ số" dưới 3 ô trang bị (cùng class .statb + data-x nên trình nghe ở hlBuildCardEvents bắt được) */
  const sb = document.createElement("button"); sb.id = "hl-statbtn"; sb.type = "button"; sb.className = "statb"; sb.dataset.x = "me"; sb.textContent = "Chỉ số"; card.appendChild(sb);
  /* chip vàng trên thanh trên (đọc lại #me-gold) */
  const gd = document.createElement("span"); gd.id = "hl-gold"; gd.title = "Vàng"; top.appendChild(gd);
  [["logbtn", "Nhật ký"], ["speedbtn", "Tốc độ"], ["pausebtn", "Menu"]].forEach(a => { const b = $(a[0]); if (b) b.title = a[1]; });
  /* Phase 8: nút ✕ đóng ngăn nhật ký + tự cuộn xuống cuối mỗi lần mở */
  const x = document.createElement("button"); x.id = "hl-logx"; x.type = "button"; x.title = "Đóng nhật ký"; x.setAttribute("aria-label", "Đóng nhật ký"); x.textContent = "✕";
  x.onclick = () => $("logbtn").click(); $("side").insertBefore(x, $("log"));
  $("logbtn").addEventListener("click", () => setTimeout(hlLogEnd, 0));
}
function hlLogEnd() { if (!$("game").classList.contains("nolog")) $("log").scrollTop = $("log").scrollHeight; }
/* Thanh dưới chân nhân vật (theo mẫu): "Tên · Lv" + HP + MP + XP mảnh. Chỉ ĐỌC lại #me-name/#me-lv/#me-hp/#me-mp/#me-xp (không nhân đôi logic của fillPanel). */
function hlBuildPbar() {
  if ($("hl-pbar")) return;
  const d = document.createElement("div"); d.id = "hl-pbar";
  d.innerHTML = '<small class="pn"></small><div class="pb hp"><i></i><span></span></div><div class="pb mp"><i></i><span></span></div><div class="pb xp"><i></i></div>';
  $("me").appendChild(d);
  const mo = new MutationObserver(hlPbarSync);   // fillPanel đổi chữ/độ rộng → cập nhật theo, không cần sửa render.js
  ["me-name", "me-lv", "me-hp", "me-mp", "me-xp"].forEach(id => mo.observe($(id), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] }));
  const g = $("me-gold"); if (g) new MutationObserver(hlGoldSync).observe(g, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
}
function hlPbarSync() {
  const d = $("hl-pbar"); if (!d) return;
  const val = id => { const e = $(id), em = e.querySelector("em"); return { w: e.firstElementChild.style.width, t: em ? em.textContent.replace(/\s/g, "") : "" }; };
  const hp = val("me-hp"), mp = val("me-mp"), xp = val("me-xp");
  d.querySelector(".pn").textContent = $("me-name").textContent + " · " + $("me-lv").textContent;
  d.querySelector(".hp i").style.width = hp.w; d.querySelector(".hp span").textContent = hp.t;
  d.querySelector(".mp i").style.width = mp.w; d.querySelector(".mp span").textContent = mp.t;
  d.querySelector(".xp i").style.width = xp.w; d.querySelector(".xp").title = "XP " + xp.t;
  d.classList.toggle("low", $("me-hp").classList.contains("low"));
}
function hlGoldSync() {
  const d = $("hl-gold"), g = $("me-gold"); if (!d || !g) return;
  d.textContent = g.textContent; d.hidden = g.hidden || !g.textContent;
}
/* Phase 6: .statb và .eq đã chuyển khỏi #party/#me nên 2 trình nghe cũ (overlays.js) không còn bắt được → bắt lại ở #hl-card, cùng hành vi */
function hlBuildCardEvents() {
  const card = $("hl-card"); if (card._ev) return; card._ev = 1;
  card.addEventListener("click", e => {
    const b = e.target.closest(".statb"); if (b) return toggleStats(true, b.dataset.x);
    if (e.target.closest(".eq") && state.mode !== "coop" && !document.querySelector(".overlay.show")) openBag();
  });
  new MutationObserver(hlEqTitles).observe($("me-eq"), { childList: true });
}
function hlEqTitles() {   // ô trang bị nhỏ: đặt tooltip = đủ tên + chỉ số (tên bị cắt trong ô 72px)
  document.querySelectorAll("#me-eq .eq").forEach(q => { const b = q.querySelector("b"), sm = q.querySelector("small"), t = (b ? b.textContent : "") + (sm ? " — " + sm.textContent : ""); if (q.title !== t) q.title = t; });
}
/* Co-op: thanh máu + trạng thái nhỏ dưới chân đồng đội (chỉ ĐỌC lại #mate-hp / #mate-name / #mate-status) */
function hlBuildMbar() {
  if ($("hl-mbar")) return;
  const d = document.createElement("div"); d.id = "hl-mbar";
  d.innerHTML = '<div class="pb"><i></i></div><small></small><small class="st"></small>';
  $("mate").appendChild(d);
  const mo = new MutationObserver(hlMbarSync);
  [$("mate-hp"), $("mate-name"), $("mate-status")].forEach(e => mo.observe(e, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] }));
}
function hlMbarSync() {
  const d = $("hl-mbar"); if (!d) return;
  const hp = $("mate-hp"), em = hp.querySelector("em"), sm = d.querySelectorAll("small"), stEl = $("mate-status");
  d.firstElementChild.firstElementChild.style.width = hp.firstElementChild.style.width;
  d.classList.toggle("low", hp.classList.contains("low"));
  d.classList.toggle("down", stEl.classList.contains("down"));
  sm[0].textContent = $("mate-name").textContent + " · " + (em ? em.textContent.replace(/\s/g, "") : "");
  sm[1].textContent = stEl.textContent;
}
function hlSync() {
  const want = hlWant();
  if (want === hlOn) return;
  hlOn = want;
  const g = $("game");
  if (want) {
    hlBuild();
    const top = $("hl-top"), card = $("hl-card"), act = $("hl-actions");
    [g.querySelector(":scope > h1"), $("floor-badge"), $("turn-info"), $("order"), $("logbtn"), $("speedbtn"), $("pausebtn")].forEach(e => hlMove(e, top));
    [$("me").querySelector(":scope > .info"), $("me-eq")].forEach(e => hlMove(e, card));
    hlMove($("actions"), act); hlMove($("skills"), $("hl-mid"));   // 4 nút bên phải · hàng kỹ năng ở khung giữa
    hlMove($("player-status"), $("me"));   // trạng thái (phòng thủ, hiệu ứng) hiện gần chân nhân vật
    hlBuildPbar(); hlPbarSync(); hlGoldSync(); hlBuildCardEvents(); hlEqTitles();
    hlBuildMbar(); hlMbarSync();
  } else hlRestore();
  g.classList.toggle("hl", want); document.body.classList.toggle("hl-on", want);
}
function syncAll() { syncFland(); hlSync(); }   // ép xoay trước, rồi mới quyết định bố cục
window.addEventListener("resize", syncAll);
window.addEventListener("orientationchange", () => setTimeout(syncAll, 250));
syncAll();
