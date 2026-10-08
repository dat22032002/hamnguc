/* js/menu.js — Menu chính, phòng chờ (lobby), màn chọn class, cài đặt. */
/* =====================================================
   PHẦN 8: MENU CHÍNH, PHÒNG CHỜ (LOBBY), CÀI ĐẶT, MENU TRONG GAME
   ===================================================== */
function showPage(id, note) {   // main | play | lobby | bye
  document.querySelectorAll("#menu .pg").forEach(e => e.style.display = e.id === "pg-" + id ? "block" : "none");
  $("menu").classList.add("show"); $("menu").dataset.pg = id;
  if (id === "main") {
    try { const best = +localStorage.getItem("rpgBest") || 0, C = CLASSES[myClass]; $("menu-info").innerHTML = "🏆 Kỷ lục: " + (best ? "tầng " + best : "chưa có") + "  ·  " + icoHTML(myClass) + " " + esc(C.name); } catch (e) {}
    setTimeout(() => { const b = $("m-play"); if (b && $("menu").classList.contains("show") && !document.querySelector("#settings.show,#pause.show")) b.focus({ preventScroll: true }); }, 0);
  }
  if (note !== undefined) menuNote(note);
}
function toPlay(msg) { closeCoop(); showPage("play", msg); }

function renderLobby() {
  if (!co || co.s) return;
  const me = co.me, host = me === 0, ul = $("lobby-list");
  const names = co.names.length ? co.names : [null, nickName()];   // người vào chưa nhận được danh sách từ chủ phòng
  showPage("lobby", "");
  $("lobby-code").textContent = co.code.toUpperCase();
  ul.innerHTML = "";
  [0, 1].forEach(i => {
    const n = names[i], li = document.createElement("li");
    li.innerHTML = n ? (CLASSES[co.cls[i]] ? icoHTML(co.cls[i]) : (i ? "🧝" : "🧙")) + " " + esc(n) + (i === 0 ? " 👑 Chủ phòng" : "") + (i === me ? " (Bạn)" : "") : (i === 0 ? "⏳ Đang kết nối với chủ phòng…" : "⏳ Đang chờ người chơi…");
    if (!n) li.className = "empty";
    ul.appendChild(li);
  });
  $("lobby-count").textContent = "Người chơi: " + names.filter(Boolean).length + " / 2";
  $("l-start").style.display = host ? "" : "none";
  $("l-start").disabled = !(host && co.names[1]);
  $("lobby-note").textContent = host
    ? (co.names[1] ? "Đủ người rồi, bấm Bắt đầu!" : "Gửi mã phòng cho bạn bè rồi chờ họ vào…")
    : "Đang chờ chủ phòng bắt đầu…";
}

/* ----- Chọn class: bấm thẻ để xem trước, bấm "Chọn" để xác nhận. ←/→ đổi class, chạm/di chuột vào kỹ năng để xem mô tả ----- */
let cpSel = "knight", cpSk = 4;
const CP_STATS = [["🛡️", "Bền"], ["⚔️", "Công"], ["⚡", "Tốc độ"], ["💚", "Hỗ trợ"]], CP_ROLE = { Tank: "🛡️", DPS: "⚔️", Healer: "💚", AOE: "🔥" };
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(",");
function drawClass() {
  cpSel = CLASSES[myClass] ? myClass : "knight"; cpSk = 4;
  const tabs = $("cp-tabs"); tabs.innerHTML = "";
  Object.entries(CLASSES).forEach(([id, C]) => {
    const b = document.createElement("button");
    b.className = "ctab"; b.dataset.id = id; b.title = C.name; b.setAttribute("aria-label", C.name); b.innerHTML = icoHTML(id);
    b.style.setProperty("--c", C.col); b.style.setProperty("--cr", hexRgb(C.col));
    b.onclick = () => { if (cpSel === id) return; cpSel = id; cpSk = 4; cpShow(true); };
    tabs.appendChild(b);
  });
  cpShow(false);
}
function cpShow(anim) {
  const C = CLASSES[cpSel], box = $("class-pick");
  box.style.setProperty("--c", C.col); box.style.setProperty("--cr", hexRgb(C.col));
  [...$("cp-tabs").children].forEach(b => b.classList.toggle("on", b.dataset.id === cpSel));
  $("cp-av").classList.toggle("spr-av", hasSpr(cpSel));
  $("cp-av").innerHTML = hasSpr(cpSel) ? sprHTML(cpSel) : C.icon + '<span class="wp">' + C.wp + "</span>";
  if (anim) { const cv = $("cp-av").querySelector("canvas.sp"); cv && sprPlay(cv, "atk1"); }   // đổi class: nhân vật vung vũ khí chào
  $("cp-name").textContent = C.name;
  $("cp-role").textContent = (CP_ROLE[C.role] || "") + " " + C.role;
  $("cp-tag").textContent = C.tag || "";
  $("cp-vit").innerHTML = '<div class="vbar hp"><i></i><span><b><u class="vi"></u>HP</b><em>' + C.hp + '</em></span></div><div class="vbar mp"><i></i><span><b><u class="vi"></u>Mana</b><em>' + C.mana + '</em></span></div>';
  $("cp-stats").innerHTML = CP_STATS.map((s, i) => '<div class="cps"><b>' + s[0] + " " + s[1] + "</b><i>" + [0, 1, 2, 3, 4].map(n => '<u class="' + (n < C.rt[i] ? "f" : "") + '"></u>').join("") + "</i></div>").join("");
  const sk = $("cp-skills"); sk.innerHTML = "";
  C.sk.forEach((k, i) => {
    const b = document.createElement("button");
    b.className = "sk cs " + (k.tier === "ult" ? "cs-ult" : k.tier === "adv" ? "t-adv" : "t-basic");
    b.innerHTML = "<b>" + k.i + "</b>"; b.title = k.n; b.setAttribute("aria-label", k.n);
    b.onclick = b.onmouseenter = () => cpSkill(i);
    sk.appendChild(b);
  });
  cpSkill(cpSk);
  $("c-ok").textContent = "✔ Chọn " + C.name;
  if (anim) { const h = $("cp-hero"); h.classList.remove("swap"); void h.offsetWidth; h.classList.add("swap"); sfx("heal"); }
}
function cpSkill(i) {
  cpSk = i;
  const k = CLASSES[cpSel].sk[i];
  [...$("cp-skills").children].forEach((b, j) => b.classList.toggle("on", j === i));
  const tl = k.tier === "ult" ? "Tối thượng" : k.tier === "adv" ? "Nâng cao" : "Cơ bản";
  $("cp-skinfo").innerHTML = "<b>" + k.i + " " + esc(k.n) + '</b><span class="ut">' + tl + "</span><em>" + k.c + "💧 · ⏱" + k.cdn + "</em><br>" + esc(k.d);
}
$("c-ok").onclick = () => {
  const C = CLASSES[cpSel]; myClass = cpSel;
  try { localStorage.setItem("rpgClass", cpSel); } catch (e) {}
  showPage("play", C.name + " · Chọn chế độ chơi");
};
document.addEventListener("keydown", e => {   // ← → đổi class khi đang ở màn chọn class
  if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || !$("menu").classList.contains("show") || $("menu").dataset.pg !== "class") return;
  if (document.querySelector("#settings.show,#pause.show")) return;
  const ids = Object.keys(CLASSES), at = ids.indexOf(cpSel);
  cpSel = ids[(at + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length]; cpSk = 4; cpShow(true);
});
$("m-play").onclick = $("m-class").onclick = () => { drawClass(); showPage("class", "Chọn nhân vật"); };
$("c-back").onclick = () => showPage("main", "");
$("m-back").onclick = () => showPage("main", "");
$("m-set").onclick = () => openSettings();
$("m-exit").onclick = () => { closeCoop(); try { window.close(); } catch (e) {} showPage("bye", ""); };
$("b-back").onclick = () => showPage("main", "");
$("l-leave").onclick = () => toPlay("");
$("l-start").onclick = () => { if (co && co.me === 0 && !co.s && co.conn && co.conn.open && co.names[1]) hostStart(); };
$("l-copy").onclick = () => {
  const b = $("l-copy");
  try { navigator.clipboard.writeText(co.code.toUpperCase()).then(() => { b.textContent = "✔ Đã chép"; setTimeout(() => b.textContent = "📋 Sao chép mã", 1500); }, () => {}); } catch (e) {}
};

/* ----- Cài đặt ----- */
function openSettings() {
  let best = 0;
  try { best = +localStorage.getItem("rpgBest") || 0; } catch (e) {}
  $("set-best").textContent = "Kỷ lục: " + (best ? "tầng " + best : "chưa có");
  $("settings").classList.add("show");
}
function applyTheme(t) {
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  document.querySelectorAll("#theme-seg button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
}
document.querySelectorAll("#theme-seg button").forEach(b => b.onclick = () => { try { localStorage.setItem("rpgTheme", b.dataset.t); } catch (e) {} applyTheme(b.dataset.t); });
$("set-close").onclick = () => $("settings").classList.remove("show");
$("set-reset").onclick = () => { try { localStorage.removeItem("rpgBest"); } catch (e) {} openSettings(); };
let savedTheme = "auto";
try { savedTheme = localStorage.getItem("rpgTheme") || "auto"; } catch (e) {}
applyTheme(savedTheme);

