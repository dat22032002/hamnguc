/* js/events.js — Sự kiện nút bấm, phím tắt và start() bắt đầu ván solo. */
/* =====================================================
   PHẦN 7: SỰ KIỆN & KHỞI ĐỘNG
   ===================================================== */
function start() {
  newGame();
  $("log").innerHTML = "";
  $("overlay").classList.remove("show");
  $("reward").classList.remove("show");
  $("rooms").classList.remove("show");
  $("rest").classList.remove("show");
  closeCoop();
  $("mate").style.display = "none"; 
  $("menu").classList.remove("show");
  ["pause", "loot"].forEach(id => $(id).classList.remove("show"));
  $("btn-restart").textContent = "Chơi lại";
  state.monsters.forEach(m => m.hp = 0);   // chưa có quái: vào game là chọn lối đi ngay
  log("🚪 Bạn bước vào hầm ngục. Chọn một lối đi để bắt đầu.");
  showRooms();
}

$("btn-attack").onclick = () => takeTurn("attack");
$("btn-defend").onclick = () => takeTurn("defend");
$("btn-heal").onclick = () => $("skills").classList.toggle("show");   // nút Kỹ năng: mở 5 kỹ năng (2 cơ bản, 2 nâng cao, 1 tối thượng)
document.querySelectorAll("#skills button").forEach((b, i) => b.onclick = () => { $("skills").classList.remove("show"); takeTurn("s" + i); });
$("mons").onclick = e => { const c = e.target.closest(".mon"); if (!c || !state.player) return; state.player.tg = +c.dataset.i; if (co) co.tg = +c.dataset.i; render(); };
$("btn-potion").onclick = openBag;
$("rest-short").onclick = () => restVote("short");
$("rest-long").onclick = () => restVote("long");
$("rest-go").onclick = restGo;
$("rest-bag").onclick = openBag;
$("bag-close").onclick = () => $("bag").classList.remove("show");
$("btn-restart").onclick = () => state.mode === "coop" ? leaveCoop() : start();
$("m-solo").onclick = start;
$("m-create").onclick = () => {
  hostCoop(newCode());
};
$("m-join").onclick = () => {
  const c = $("code").value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  if (c.length < 3) return menuNote("Nhập mã phòng của bạn bè nhé.");
  joinCoop(c);
};

document.addEventListener("keydown", e => {
  if (document.querySelector(".overlay.show") || e.key.length !== 1 || !"12345".includes(e.key)) return;
  const i = +e.key - 1;
  if (i === 4) { const u = $("btn-ult"); if (!u.disabled) u.click(); return; }   // phím 5: kỹ năng tối thượng (mở sẵn hay không đều dùng được)
  if ($("skills").classList.contains("show")) { const b = document.querySelectorAll("#skills button")[i]; if (b && !b.disabled) b.click(); return; }
  const btn = $(["btn-attack", "btn-defend", "btn-heal", "btn-potion"][i]);
  if (!btn.disabled) btn.click();
});

const syncMute = () => { $("set-sound").textContent = muted ? "🔇 Âm thanh: Tắt" : "🔊 Âm thanh: Bật"; };
const toggleMute = () => { muted = !muted; try { localStorage.setItem("rpgMute", muted ? "1" : "0"); } catch (e) {} syncMute(); sfx("heal"); };
$("set-sound").onclick = toggleMute;
/* Ẩn/hiện nhật ký chiến đấu (nhớ lựa chọn; mặc định ẩn trên điện thoại (kể cả xoay ngang) cho gọn) */
(function () {
  let v = null; try { v = localStorage.getItem("rpgLog"); } catch (e) {}
  const on = v === null ? !window.matchMedia("(max-width: 999px)").matches : v === "1";
  const g = $("game"), b = $("logbtn");
  const apply = on => { g.classList.toggle("nolog", !on); b.textContent = on ? "📜 Ẩn nhật ký ▴" : "📜 Hiện nhật ký ▾"; };
  let cur = on; apply(cur);
  b.onclick = () => { cur = !cur; apply(cur); try { localStorage.setItem("rpgLog", cur ? "1" : "0"); } catch (e) {} };
})();
$("speedbtn").onclick = () => { if (co && co.s && co.me === 1) return; setAnimSpeed(animSpeed === 1 ? 2 : 1, true); };   // co-op: chủ phòng điều khiển, người vào phòng theo chủ phòng
setAnimSpeed(animSpeed);
syncMute();

