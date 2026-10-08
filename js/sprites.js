/* js/sprites.js — Engine sprite: vẽ/chạy hoạt ảnh canvas, setAv() gắn avatar nhân vật vào phần tử. */
/* =====================================================
   SPRITE: hoạt ảnh nhân vật (idle · tấn công 1/2/3 · bị thương · chết)
   Mọi <canvas class="sp" data-c="class"> trong trang đều tự chạy hoạt ảnh. Ghi chú:
   - ms / khung nhân với TS()/2 nên tự chậm / nhanh theo nút tốc độ hiệu ứng
   - Mọi class đều có sprite riêng trong SPRITE_DATA (kẻo rớt về emoji)
   ===================================================== */
const SPR_MS = { idle: 150, walk: 110, atk1: 60, atk2: 60, atk3: 52, block: 130, heal: 130, fire: 60, ice: 60, hurt: 70, death: 140 };
const SPR_LOOP = { idle: 1, walk: 1 }, SPR_U = 14;      // 1em = 14 điểm ảnh gốc → sprite tự to nhỏ theo cỡ chữ của avatar
// kiểu hiệu ứng → hoạt ảnh tấn công: đòn thường / kỹ năng / tối thượng
const SPR_ATK = { clang: "atk1", stab: "atk1", slash: "atk1", holy: "atk1", arcane: "atk1",
  bash: "atk2", backstab: "atk2", flurry: "atk2", taunt: "atk2", wall: "block", charge: "atk2", vanish: "atk2", heal: "heal", bless: "heal", fireball: "fire", frost: "ice",
  execute: "atk3", holyAll: "atk3", revive: "heal", firestorm: "fire", meteor: "fire" };
const SPR_IMG = {};
const hasSpr = cls => !!SPRITE_DATA[cls];
function sprImg(cls) { const s = SPRITE_DATA[cls].src; return SPR_IMG[s] || (SPR_IMG[s] = Object.assign(new Image(), { src: s })); }
function sprHTML(cls) {
  const D = SPRITE_DATA[cls], [bx, by, bw, bh] = D.box, [cx, cy, cw, ch] = D.core, e = n => (n * (D.sc || 1) / SPR_U).toFixed(4) + "em";   // D.sc: hệ số thu/phóng riêng cho từng nhân vật
  return '<span class="sfig" style="width:' + e(cw) + ";height:" + e(ch) + '"><canvas class="sp" data-c="' + cls + '" width="' + bw + '" height="' + bh + '" style="left:' + e(bx - cx) + ";top:" + e(by - cy) + ";width:" + e(bw) + ";height:" + e(bh) + '"></canvas></span>';
}
const icoHTML = cls => { const k = CLASSES[cls] ? cls : "knight"; return hasSpr(k) ? '<img class="ico" alt="" src="' + SPRITE_DATA[k].icon + '">' : CLASSES[k].icon; };
function sprPlay(cv, a) {
  const D = SPRITE_DATA[cv.dataset.c]; if (!D) return;
  if (!D.rows[a]) a = /^(block|heal|fire|ice)$/.test(a) ? "atk2" : "idle";   // sheet nào chưa có hoạt ảnh này thì dùng hoạt ảnh gần nhất
  cv._s = { a, t0: performance.now() };
}
function sprTick(now) {
  document.querySelectorAll("canvas.sp").forEach(cv => {
    const cls = cv.dataset.c, D = SPRITE_DATA[cls]; if (!D) return;
    const im = sprImg(cls); if (!im.complete || !im.naturalWidth) return;
    let s = cv._s || (cv._s = { a: "idle", t0: now - Math.random() * 900 });   // lệch pha để các nhân vật không nhép cùng nhịp
    let [row, n] = D.rows[s.a], f = Math.floor((now - s.t0) / (SPR_MS[s.a] * (s.a === "idle" && (cls === "knight" || cls === "cleric" || cls === "mage") ? 2 : 1) * TS() / 2));   // Hiệp sĩ / Nữ tu sĩ / Pháp sư đứng yên: chậm 1/2
    if (SPR_LOOP[s.a]) f %= n;
    else if (f >= n) {
      if (s.a === "death") f = n - 1;                                       // chết: nằm yên ở khung cuối
      else { s = cv._s = { a: "idle", t0: now }; [row, n] = D.rows.idle; f = 0; }   // đánh / bị thương xong → về đứng yên
    }
    const key = s.a + f + cls; if (cv._k === key) return; cv._k = key;
    const c = cv.getContext("2d"), [bx, by, bw, bh] = D.box;
    c.clearRect(0, 0, bw, bh); c.imageSmoothingEnabled = false;
    c.drawImage(im, f * 100 + bx, row * 100 + by, bw, bh, 0, 0, bw, bh);
  });
  requestAnimationFrame(sprTick);
}
requestAnimationFrame(sprTick);
/* Đồng bộ hoạt ảnh theo class của avatar: dead → chết (hồi sinh → đứng dậy) · hit → bị thương */
function sprSync(el) {
  const cv = el.querySelector("canvas.sp"); if (!cv) return;
  const dead = el.classList.contains("dead"), hit = el.classList.contains("hit"), was = el._hit, a = cv._s && cv._s.a;
  el._hit = hit;
  if (dead) { if (a !== "death") sprPlay(cv, "death"); }
  else if (a === "death") sprPlay(cv, "idle");
  else if (hit && !was) sprPlay(cv, "hurt");
}
function sprAtk(el, a) {   // gọi từ playVfx: người ra đòn vung vũ khí / niệm phép (a = tên hoạt ảnh)
  const cv = el.querySelector && el.querySelector("canvas.sp");
  if (!cv || !SPR_MS[a] || el.classList.contains("dead")) return;
  if (cv._s && cv._s.a === a) return;   // 1 hành động có nhiều hiệu ứng (vd Thánh quang): giữ nguyên hoạt ảnh đang chạy, không khởi động lại
  sprPlay(cv, a);
}

/* QUÁI có sprite: key lấy từ MT (m.sprite). Chỉ nhận khóa có thật trong SPRITE_DATA (dữ liệu co-op từ mạng) */
const monSpr = k => typeof k === "string" && Object.prototype.hasOwnProperty.call(SPRITE_DATA, k);
function setMonAv(el, m) {
  if (monSpr(m.sprite)) {
    if (el.dataset.e !== "s:" + m.sprite) {
      el.dataset.e = "s:" + m.sprite; el.classList.add("spr", "mspr"); el.innerHTML = sprHTML(m.sprite);
      if (!el._mo) { el._mo = new MutationObserver(() => sprSync(el)); el._mo.observe(el, { attributes: true, attributeFilter: ["class"] }); }
    }
    return sprSync(el);
  }
  el.classList.remove("spr", "mspr");
  if (el.dataset.e !== m.avatar) { el.dataset.e = m.avatar; el.textContent = m.avatar; }
}
const monIco = m => monSpr(m.sprite) ? '<img class="ico" alt="" src="' + SPRITE_DATA[m.sprite].icon + '">' : m.avatar;

function setAv(el, cls) {
  if (!CLASSES[cls]) cls = "knight";
  const C = CLASSES[cls];
  if (el.dataset.c === cls && el.querySelector(".fig,.sfig")) return sprSync(el);   // chỉ vẽ lại khi đổi class (để hiệu ứng bay không bị xóa)
  el.dataset.c = cls; el.style.setProperty("--c", C.col); el.style.setProperty("--cr", hexRgb(C.col));
  el.classList.toggle("spr", hasSpr(cls));
  el.innerHTML = hasSpr(cls) ? sprHTML(cls) : '<span class="fig" style="--c:' + C.col + '">' + C.icon + '</span><span class="wp">' + C.wp + '</span>';
  if (!el._mo) { el._mo = new MutationObserver(() => sprSync(el)); el._mo.observe(el, { attributes: true, attributeFilter: ["class"] }); }
  sprSync(el);
}
