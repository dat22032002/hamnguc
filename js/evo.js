/* js/evo.js — Tiến hóa kỹ năng: định nghĩa hiệu lực (gộp nhánh tiến hóa), bộ đếm điều kiện, kiểm tra mở khóa khi lên cấp, popup chọn nhánh. */
/* evoStage[i]: 0 = chưa tiến hóa · 1 = nhánh A (mặc định) · 2 = nhánh B (điều kiện) */

/* Định nghĩa hiệu lực của skill i của p (đã gộp patch tiến hóa nếu có) */
function skDef(p, i) {
  const C = CLASSES[p.cls], base = C && C.sk[i];
  if (!base) return base;
  const st = (p.evoStage || [])[i] || 0, e = base.evo;
  if (!st || !e) return base;
  const br = st === 2 ? e.b : e.a;
  if (!br) return base;
  const patch = {};
  for (const k in br) if (k !== "cond") patch[k] = br[k];
  return Object.assign({}, base, patch);
}
/* Khởi tạo bộ đếm tiến hóa cho player mới */
function mkEvoProg() { return [0, 1, 2, 3, 4].map(() => ({ exp: 0, uses: 0, stuns: 0, clutch: 0, kills: 0 })); }
/* Cộng EXP cho skill si theo loại sự kiện (use/stuns/clutch/kills). Chỉ skill chưa tiến hóa mới nhận */
function addEvoXp(p, si, kind) {
  const base = CLASSES[p.cls].sk[si], e = base && base.evo;
  if (!e || ((p.evoStage || [])[si]) || !p.evoProg || !p.evoProg[si]) return;
  const pr = p.evoProg[si];
  pr.exp = Math.min(e.exp, (pr.exp || 0) + ((e.xp || {})[kind] || 0));
}
/* Điều kiện nhánh B của skill i đã đạt chưa */
function evoUnlocked(p, i) {
  const base = CLASSES[p.cls].sk[i], c = base && base.evo && base.evo.b && base.evo.b.cond;
  if (!c) return false;
  return ((p.evoProg || [])[i] || {})[c.k] >= c.n;
}
/* Sau mỗi trận: gom skill đã đủ EXP tiến hóa vào hàng đợi. Trả về true nếu có */
function checkEvo(p) {
  const sk = CLASSES[p.cls].sk;
  let n = 0;
  for (let i = 0; i < sk.length; i++) {
    const e = sk[i] && sk[i].evo;
    if (e && !((p.evoStage || [])[i]) && ((p.evoProg || [])[i] || {}).exp >= e.exp && !(p.evoQueue || []).includes(i)) { (p.evoQueue = p.evoQueue || []).push(i); n++; }
  }
  return n > 0;
}
/* Co-op (pilot): tự động tiến hóa nhánh A, không hiện popup chọn */
function autoEvo(p) {
  const sk = CLASSES[p.cls].sk;
  for (let i = 0; i < sk.length; i++) {
    const e = sk[i] && sk[i].evo;
    if (e && !((p.evoStage || [])[i]) && ((p.evoProg || [])[i] || {}).exp >= e.exp) {
      p.evoStage[i] = evoUnlocked(p, i) ? 2 : 1;
      LG("🌟 " + p.name + ": " + sk[i].n + " tiến hóa thành " + skDef(p, i).n + "!", "good");
    }
  }
}
/* Dòng tiến độ tiến hóa cho tooltip kỹ năng (giữ nút skill → xem) */
function evoTip(p, i) {
  const base = CLASSES[p.cls].sk[i], e = base && base.evo;
  if (!e) return "";
  const st = ((p.evoStage || [])[i]) || 0;
  if (st) return "<div class=\"tt\">🌟 Đã tiến hóa: " + esc(skDef(p, i).n) + "</div>";
  const c = e.b.cond, prog = (p.evoProg || [])[i] || {}, xp = prog.exp || 0;
  return "<div class=\"tt\">🌟 EXP kỹ năng: " + xp + "/" + e.exp + (xp >= e.exp ? " — đủ điều kiện tiến hóa!" : "") + "</div><div class=\"tt\">🔒 Nhánh B: " + esc(c.txt) + " (" + (prog[c.k] || 0) + "/" + c.n + ")</div>";
}
/* Mô tả ngắn gọn patch tiến hóa để hiện trên thẻ chọn */
function evoCardTxt(br) {
  const t = [];
  if (br.m) t.push("Sát thương ×" + br.m);
  if (br.a) t.push("Hồi " + br.a + " máu");
  if (br.ls) t.push("Hút máu " + Math.round(br.ls * 100) + "%");
  if (br.dur) t.push("Kéo dài " + br.dur + " lượt");
  if (br.c) t.push(br.c + "💧");
  if (br.cdn) t.push("Hồi chiêu " + br.cdn + " lượt");
  return t.join(" · ");
}
/* Hiện popup tiến hóa cho skill đầu hàng đợi. Xong thì gọi showLoot (luồng thắng trận solo) */
function showEvo() {
  const p = state.player, i = (p.evoQueue || [])[0];
  if (i == null) { $("evo").classList.remove("show"); showLoot(); render(); return; }
  const base = CLASSES[p.cls].sk[i], e = base.evo, open = evoUnlocked(p, i), prog = (p.evoProg || [])[i] || {};
  $("evo-title").textContent = "🌟 " + base.n + " có thể tiến hóa!";
  $("evo-sub").textContent = "Chọn 1 trong 2 hướng tiến hóa (vĩnh viễn trong lượt chạy này)";
  const list = $("evo-list"); list.innerHTML = "";
  const mkCard = (br, tag, branch, locked) => {
    const b = document.createElement("button");
    b.className = "evocard" + (locked ? " locked" : "");
    b.innerHTML = "<b>" + br.i + " " + esc(br.n) + "</b><span class=\"evotag\">" + tag + "</span><small>" + esc(br.d) + "</small><small class=\"evofx\">" + esc(evoCardTxt(br)) + "</small>" +
      (locked ? "<small class=\"evolock\">🔒 " + esc(br.cond.txt) + " (" + (prog[br.cond.k] || 0) + "/" + br.cond.n + ")</small>" : "");
    if (!locked) b.onclick = () => chooseEvo(i, branch);
    else b.disabled = true;
    list.appendChild(b);
  };
  mkCard(Object.assign({}, base, e.a), "Nhánh A · mặc định", 1, false);
  mkCard(Object.assign({}, base, e.b), "Nhánh B · điều kiện", 2, !open);
  sfx("evo");
  $("evo").classList.add("show");
}
function chooseEvo(i, branch) {
  const p = state.player, base = CLASSES[p.cls].sk[i];
  p.evoStage[i] = branch;
  p.evoQueue.shift();
  LG("🌟 " + base.n + " tiến hóa thành " + skDef(p, i).n + "!", "good");
  FXX(0, "★ TIẾN HÓA ★", "crit");
  render();
  showEvo();   // skill tiếp theo trong hàng đợi (nếu có), hết thì tự gọi showLoot
}
