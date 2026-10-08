/* js/overlays.js — Menu tạm dừng, bảng chỉ số, tooltip kỹ năng. */
/* ----- Menu trong game (nút ☰ hoặc phím Esc) ----- */
function openPause() {
  const coop = state.mode === "coop" && co;
  $("p-restart").style.display = coop ? "none" : ""; $("p-bag").style.display = coop ? "none" : "";
  $("pause-info").textContent = coop ? "Phòng " + co.code.toUpperCase() + " · Co-op vẫn chạy khi mở menu" : "Tầng " + (state.monsterIndex + 1) + " · Cấp " + state.player.level + " · Đã hạ " + state.kills + " quái";
  $("pause").classList.add("show");
}
$("pausebtn").onclick = openPause;
function statPanel(p) {
  const C = CLASSES[p.cls] || CLASSES.knight;
  return '<div class="stp"><div class="stp-h"><span class="fig" style="--c:' + C.col + '">' + icoHTML(p.cls) + '</span><span>' + esc(p.name === C.name ? C.name : p.name + " · " + C.name) + '</span><span class="lvb">Lv ' + p.level + '</span></div><div class="sgrid">' + statGrid(p) + '</div></div>';
}
function fillStats() {
  const cp = state.mode === "coop" && co && co.s, P = cp ? co.s.players : [state.player];
  const i = cp ? (toggleStats.x === "mate" ? 1 - co.me : co.me) : 0;
  $("stat-body").innerHTML = statPanel(P[i]);
}
function toggleStats(on, x) {
  const ov = $("stat-ov"); on = on === undefined ? !ov.classList.contains("show") : on;
  if (on) { if (document.querySelector(".overlay.show")) return; toggleStats.x = x; fillStats(); }
  ov.classList.toggle("show", on);
}
$("party").addEventListener("click", e => { const b = e.target.closest(".statb"); if (b) toggleStats(true, b.dataset.x); });
$("stat-close").onclick = () => toggleStats(false);
$("stat-ov").addEventListener("click", e => { if (e.target === e.currentTarget) toggleStats(false); });

$("p-resume").onclick = () => $("pause").classList.remove("show");
$("p-bag").onclick = () => { $("pause").classList.remove("show"); openBag(); };
$("me").addEventListener("click", e => { if (e.target.closest(".eq") && state.mode !== "coop" && !document.querySelector(".overlay.show")) openBag(); });   // bấm vào ô trang bị để mở túi
$("p-set").onclick = () => openSettings();
$("p-restart").onclick = () => start();
let quitArmed = false;
$("p-menu").onclick = () => {   // bấm 2 lần để tránh lỡ tay mất tiến trình
  const b = $("p-menu");
  if (!quitArmed) { quitArmed = true; b.textContent = "⚠️ Bấm lần nữa để thoát"; return setTimeout(() => { quitArmed = false; b.textContent = "🏠 Về menu chính"; }, 3000); }
  quitArmed = false; b.textContent = "🏠 Về menu chính";
  showMenu();
};
/* Menu chính: ↑ ↓ để chọn nút */
document.addEventListener("keydown", e => {
  if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || !$("menu").classList.contains("show") || document.querySelector("#settings.show,#pause.show")) return;
  if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  const pg = [...document.querySelectorAll("#menu .pg")].find(x => x.style.display !== "none"); if (!pg) return;
  const list = [...pg.querySelectorAll("button")].filter(b => !b.disabled && b.offsetParent), at = list.indexOf(document.activeElement);
  if (!list.length) return; e.preventDefault();
  list[(at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus();
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if ($("settings").classList.contains("show")) return $("settings").classList.remove("show");
  if ($("bag").classList.contains("show")) return $("bag").classList.remove("show");
  if ($("pause").classList.contains("show")) return $("pause").classList.remove("show");
  if (!document.querySelector(".overlay.show")) openPause();
});

/* Nhấn giữ nút kỹ năng (và icon kỹ năng của quái) trên cảm ứng → hiện chi tiết; thả tay thì ẩn, không kích hoạt kỹ năng */
function skTip(k, tier, cd, lack, sil, evoHtml) {
  let fx = ""; try { fx = stTxt(k); } catch (e) {}
  return "<b>" + k.i + " " + esc(k.n) + "</b><div class=\"tt\">" + tier + " · " + k.c + "💧 · hồi chiêu " + k.cdn + " lượt</div><div>" + esc(k.d) + "</div>" +
    (fx ? "<div class=\"tt\">Hiệu ứng: " + fx + " (trừ kháng của mục tiêu)</div>" : "") +
    (evoHtml || "") +
    (cd > 0 ? "<div class=\"tw\">⏳ Còn " + cd + " lượt hồi chiêu</div>" : lack ? "<div class=\"tw\">💧 Thiếu mana</div>" : sil ? "<div class=\"tw\">🤐 Đang bị câm lặng</div>" : "");
}
(function () {
  const tip = document.createElement("div"); tip.id = "tip"; document.body.appendChild(tip);
  let timer = 0, sx = 0, sy = 0, shown = false, mute = 0;
  const hide = () => { clearTimeout(timer); timer = 0; tip.style.display = "none"; if (shown) mute = Date.now() + 450; shown = false; };
  const show = (el, html, isText) => {
    if (isText) tip.textContent = html; else tip.innerHTML = html;
    tip.style.display = "block"; shown = true;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8), y = r.top - h - 10;
    if (y < 8) y = Math.min(r.bottom + 10, window.innerHeight - h - 8);
    tip.style.left = x + "px"; tip.style.top = y + "px";
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  };
  const find = (box, e) => {   // tìm theo toạ độ vì nút bị khoá (disabled) không nhận sự kiện
    if (box.id === "skills") return [...box.querySelectorAll("[data-tip]")].find(b => { const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    const t = e.target.closest && e.target.closest(".msk span[title]"); return t && box.contains(t) ? t : null;
  };
  [$("skills"), $("mons")].forEach(box => {
    box.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      const el = find(box, e); if (!el) return;
      sx = e.clientX; sy = e.clientY; clearTimeout(timer);
      timer = setTimeout(() => { timer = 0; const t = el.dataset.tip; t ? show(el, t) : show(el, el.title, true); }, 420);
    });
    box.addEventListener("pointermove", e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) { clearTimeout(timer); timer = 0; } });
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev => box.addEventListener(ev, hide));
    box.addEventListener("click", e => { if (shown || Date.now() < mute) { e.stopPropagation(); e.preventDefault(); } }, true);   // thả tay sau khi giữ: không bấm nhầm
    box.addEventListener("contextmenu", e => { if (e.pointerType !== "mouse") e.preventDefault(); });
  });
  window.addEventListener("scroll", hide, true); window.addEventListener("blur", hide);
})();

