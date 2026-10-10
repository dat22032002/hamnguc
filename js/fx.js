/* js/fx.js — Hiệu ứng: âm thanh nhiễu, hạt/ánh sáng canvas, VFX từng chiêu, playVfx, canAct. */
/* =====================================================
   PHẦN 5: LOGIC CHIẾN ĐẤU (luật chơi)
   ===================================================== */
/* ===== ÂM THANH: tiếng ồn (gió, nổ) + âm điệu ===== */
function noise(d, vol = .1, f0 = 1000, f1 = 300, type = "bandpass", delay = 0, q = 1) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    d *= TS(); delay *= TS(); const t = AC.currentTime + delay, n = Math.ceil(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(), fl2 = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = b; fl2.type = type; fl2.Q.value = q;
    fl2.frequency.setValueAtTime(f0, t); fl2.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    src.connect(fl2); fl2.connect(g); g.connect(AC.destination); src.start(t);
  } catch (e) {}
}
const SND = {   // mỗi hiệu ứng một âm riêng, phát cùng lúc với hình
  clang: () => { noise(.1, .12, 4000, 900, "highpass"); tone(1100, .3, "square", .04, .08, -400); tone(1700, .25, "triangle", .05, .08, -600); },
  stab: () => { noise(.16, .1, 2500, 7000, "bandpass", 0, 2); tone(1800, .05, "square", .03, .1, -1200); },
  slash: () => { noise(.18, .08, 3000, 8000, "bandpass", 0, 2); tone(2200, .06, "square", .03, .08, -1500); },   // tiếng chém kiếm của Kiếm sĩ
  backstab: () => { noise(.2, .12, 2000, 8000, "bandpass", 0, 2); noise(.15, .1, 8000, 3000, "bandpass", .12); tone(150, .15, "sine", .1, .12, -60); },
  flurry: () => { noise(.12, .1, 3000, 7000, "bandpass", 0, 2); tone(1600, .04, "square", .03, .08, -900); },
  execute: () => { noise(.25, .13, 1500, 9000, "bandpass", 0, 2); tone(90, .5, "sine", .2, .13, -40); noise(.3, .12, 3000, 300, "lowpass", .13); },
  holy: () => { tone(880, .3, "sine", .06); tone(1320, .3, "sine", .05, .06); tone(1760, .25, "sine", .04, .26); },
  arcane: () => { tone(1000, .26, "sawtooth", .045, 0, -700); noise(.2, .05, 4000, 800, "bandpass", .2); tone(500, .15, "square", .05, .25, -250); },
  taunt: () => { tone(150, .35, "sawtooth", .08, 0, 80); tone(150, .35, "sawtooth", .08, .3, 80); noise(.3, .06, 500, 200, "lowpass"); },
  bash: () => { noise(.12, .1, 3500, 800, "highpass"); tone(70, .35, "sine", .22, .13, -30); tone(900, .25, "square", .05, .13, -500); },
  wall: () => { tone(500, .5, "triangle", .06, 0, 500); tone(750, .5, "sine", .05, .1, 600); noise(.4, .04, 3000, 6000, "highpass", .1); },
  charge: () => { noise(.5, .14, 300, 120, "lowpass"); tone(60, .5, "sawtooth", .12, .1, -20); tone(110, .3, "square", .06, .22, -60); },
  vanish: () => { noise(.5, .1, 4000, 300, "bandpass"); tone(400, .4, "sine", .04, 0, -250); },
  heal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .3, "sine", .06, i * .08)),
  holyAll: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .7, "sine", .045, i * .05)),
  bless: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .35, "triangle", .045, i * .1)); noise(.5, .03, 6000, 9000, "highpass"); },
  revive: () => { [262, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .6, "sine", .05, i * .09)); noise(.5, .04, 5000, 9000, "highpass", .2); },
  fireball: () => { noise(.3, .1, 400, 1500, "bandpass"); tone(300, .3, "sawtooth", .05, 0, -150); noise(.3, .14, 1800, 200, "lowpass", .3); tone(80, .3, "sine", .16, .3, -30); },
  firestorm: () => { noise(.9, .1, 500, 2500, "bandpass"); noise(.5, .13, 2000, 200, "lowpass", .35); tone(70, .6, "sine", .16, .35, -20); },
  frost: () => { [2093, 2637, 3136, 2349, 3520].forEach((f, i) => tone(f, .35, "sine", .035, i * .06)); noise(.5, .06, 6000, 2000, "bandpass", .1, 2); },
  meteor: () => { tone(900, .45, "sawtooth", .05, 0, -750); noise(.5, .1, 3000, 400, "bandpass"); noise(.6, .2, 1200, 80, "lowpass", .45); tone(55, .7, "sine", .24, .45, -20); },
  claw: () => { noise(.14, .1, 2500, 5000, "bandpass", 0, 1.5); tone(120, .15, "sawtooth", .06, .1, -50); },
  smash: () => { tone(60, .4, "sine", .22, .1, -20); noise(.2, .12, 800, 150, "lowpass", .1); },
  dragon: () => { noise(.5, .12, 600, 1800, "bandpass"); tone(90, .5, "sawtooth", .08, 0, -30); noise(.4, .12, 1500, 150, "lowpass", .3); },
  potion: () => { tone(400, .08, "sine", .06); tone(600, .12, "sine", .06, .08); tone(900, .2, "sine", .05, .16); },
  iceLock: () => { tone(2400, .25, "sine", .05, 0, -1200); noise(.15, .08, 6000, 1500, "bandpass", 0, 2); }
};

/* ===== HIỆU ỨNG HẠT (canvas, ánh sáng cộng): luồng sáng, tia lửa, vết chém, vòng sóng, đạn có đuôi ===== */
const ATKFX = { knight: "clang", swordmaster: "slash", cleric: "holy", mage: "arcane" };
const SKFX = { "Khiêu khích": "taunt", "Đập khiên": "bash", "Tường thép": "wall", "Xung kích": "charge", "Chém ngang": "slash", "Kiếm khí": "slash", "Liên trảm": "flurry", "Ngự kiếm": "wall", "Vạn kiếm quy tông": "execute",
  "Chữa lành": "heal", "Thánh quang": "holyAll", "Phước lành": "bless", "Tái sinh": "revive", "Cầu lửa": "fireball", "Bão lửa": "firestorm", "Băng giá": "frost", "Thiên thạch": "meteor", "Hồi sức": "heal", "Trừng phạt": "holy", "Tia sét": "arcane" };
const FXS = { ps: [], on: false, W: 0, H: 0 };
/* Tọa độ tâm phần tử theo hệ layout của canvas #fxc.
   Khi body.fland (mobile cầm dọc, khung bị xoay -90°): getBoundingClientRect() trả về theo màn hình
   thật nên phải đổi ngược lại — layoutX = innerHeight - tâmY_màn_hình, layoutY = tâmX_màn_hình. */
const FLAND = () => typeof document !== "undefined" && document.body.classList.contains("fland");
function vRel(el, a) {
  const r = el.getBoundingClientRect();
  let cx = r.left + r.width / 2, cy = r.top + r.height / 2, ax = a.left, ay = a.top;
  if (FLAND()) {
    const vh = window.innerHeight;
    cx = vh - (r.top + r.height / 2); cy = r.left + r.width / 2;
    ax = vh - a.top - a.height; ay = a.left;   // góc trên-trái của arena theo hệ layout
  }
  return [cx - ax, cy - ay];
}
const hsl = (h, a, l = 62) => "hsla(" + h + ",100%," + l + "%," + Math.max(0, a) + ")";
const at = (ms, fn) => setTimeout(fn, ms * TS());
const rnd = Math.random;
function PT(life, draw, end) { FXS.ps.push({ t0: performance.now(), life: life * TS(), draw, end }); if (!FXS.on) { FXS.on = true; requestAnimationFrame(fxLoop); } }
function fxLoop() {
  const cv = $("fxc"), A = $("arena"), dpr = Math.min(2, window.devicePixelRatio || 1), w = A.clientWidth, h = A.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); c.globalCompositeOperation = "lighter";
  FXS.W = w; FXS.H = h;
  const cur = FXS.ps; FXS.ps = [];
  cur.forEach(p => { const k = Math.max(0, (performance.now() - p.t0) / p.life); if (k >= 1) return p.end && p.end(); c.save(); p.draw(c, k); c.restore(); FXS.ps.push(p); });
  if (FXS.ps.length) requestAnimationFrame(fxLoop); else { FXS.on = false; c.clearRect(0, 0, w, h); }
}
function gl(c, x, y, r, h, a) {   // quầng sáng
  r = Math.max(.5, r); const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hsl(h, a, 92)); g.addColorStop(.4, hsl(h, a * .55, 62)); g.addColorStop(1, hsl(h, 0, 50));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
const fl = (x, y, h, r, life = 350) => PT(life, (c, k) => gl(c, x, y, r * (.5 + k * .8), h, 1 - k));
const rng = (x, y, h, r, life = 450, w = 4) => PT(life, (c, k) => { c.strokeStyle = hsl(h, 1 - k); c.lineWidth = w * (1 - k) + .5; c.beginPath(); c.arc(x, y, r * k + 4, 0, 7); c.stroke(); });
function bst(x, y, h, n, sp) {   // tia lửa bắn tung tóe
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283, v = sp * (.4 + rnd() * .8), hh = h + rnd() * 24 - 12;
    PT(400 + rnd() * 400, (c, k) => {
      const d = (1 - (1 - k) * (1 - k)) * v * 9, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + k * k * 30, L = v * 2.2 * (1 - k);
      c.strokeStyle = hsl(hh, 1 - k, 72); c.lineWidth = 3 * (1 - k) + .5; c.beginPath(); c.moveTo(px, py); c.lineTo(px - Math.cos(a) * L, py - Math.sin(a) * L); c.stroke();
    });
  }
}
function sl(x, y, h, ang, len, life = 320) {   // vết chém hình trăng khuyết
  PT(life, (c, k) => {
    const L = len * (.6 + k * .5), co = Math.cos(ang), si = Math.sin(ang), w = (1 - k) * 30;
    c.fillStyle = hsl(h, 1 - k * k, 78); c.beginPath(); c.moveTo(x - co * L, y - si * L);
    c.quadraticCurveTo(x - si * L * .5, y + co * L * .5, x + co * L, y + si * L);
    c.quadraticCurveTo(x - si * (L * .5 - w), y + co * (L * .5 - w), x - co * L, y - si * L); c.fill();
    gl(c, x, y, 34 * (1 - k), h, .8);
  });
}
const bm = (x, y, h) => PT(650, (c, k) => {   // cột sáng từ trên trời
  const s = Math.sin(Math.PI * k), w = 26 * s + 2, g = c.createLinearGradient(0, y - 230, 0, y + 20);
  g.addColorStop(0, hsl(h, 0, 90)); g.addColorStop(1, hsl(h, .9 * s, 75)); c.fillStyle = g; c.fillRect(x - w, y - 230, w * 2, 250); gl(c, x, y, 50, h, .6 * s);
});
function rise(x, y, h, n) {   // đom đóm bay lên
  for (let i = 0; i < n; i++) { const ox = (rnd() - .5) * 60, sp = 60 + rnd() * 50, L = 700 + rnd() * 400; at(rnd() * 300, () => PT(L, (c, k) => gl(c, x + ox + Math.sin(k * 9 + i) * 8, y + 25 - k * sp, 8 * (1 - k * .5), h, 1 - k))); }
}
function fall(x, y, h, n) {   // mưa tia sáng rơi xuống mục tiêu
  for (let i = 0; i < n; i++) { const ox = (rnd() - .5) * 70; at(rnd() * 200, () => PT(260, (c, k) => {
    const px = x + ox + (1 - k) * 60, py = y - (1 - k) * 220; c.strokeStyle = hsl(h, 1, 72); c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 14, py - 40); c.stroke(); gl(c, px, py, 9, h, 1);
  })); }
}
function proj(a, b, h, dur, sz, done) {   // đạn phép có đuôi sáng
  PT(dur, (c, k) => {
    const e = k * k, at2 = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], p = at2(e);
    gl(c, p[0], p[1], sz * 2.2, h, 1);
    for (let i = 1; i < 7; i++) { const q = at2(Math.max(0, e - i * .05)); gl(c, q[0], q[1], sz * 1.6 * (1 - i / 8), h, .6 * (1 - i / 7)); }
  }, done);
}
/* Sprite lửa nổ (Xung kích - Ultimate Hiệp sĩ): bảng 24 khung, mỗi khung 96x96 */
const FIRE_SHEET = Object.assign(new Image(), { src: "assets/sprites/fire-sheet.webp" });
function burstFire(x, y, size = 140) {
  PT(980, (c, k) => {
    if (!FIRE_SHEET.complete || !FIRE_SHEET.naturalWidth) return;
    const f = Math.min(23, Math.floor(k * 24));
    c.globalCompositeOperation = "source-over"; c.imageSmoothingEnabled = true;
    c.translate(x, y); c.rotate(Math.PI);   // sprite gốc bị ngược → xoay 180°
    c.drawImage(FIRE_SHEET, f * 96, 0, 96, 96, -size / 2, -size / 2, size, size);
  });
}
/* Vụ nổ pixel (Bão lửa - skill Pháp sư): sheet 5 khung 96x96: cháy lên → giữa → nổ lớn → tàn dần → tàn */
const PXBOOM = Object.assign(new Image(), { src: "assets/sprites/fx-explosion.webp" });
function burstPixel(x, y, size = 240) {
  const embers = [];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    embers.push({ a, sp: 60 + rnd() * 150, s: 3 + rnd() * 4, c: ["#ffb347", "#ff7847", "#ffd23f", "#9a9a9a"][i % 4] });
  }
  PT(900, (c, k) => {
    if (!PXBOOM.complete || !PXBOOM.naturalWidth) return;
    const p = k * 4, i = Math.min(3, Math.floor(p)), fr = p - i;   // nội suy mờ giữa 2 khung kề cho mượt
    const s2 = size * (.85 + k * .6), dx = x - s2 / 2, dy = y - s2 / 2;   // phình to dần
    c.globalCompositeOperation = "source-over"; c.imageSmoothingEnabled = false;   // giữ nét pixel
    c.globalAlpha = 1 - fr;
    c.drawImage(PXBOOM, i * 96, 0, 96, 96, dx, dy, s2, s2);
    c.globalAlpha = fr;
    c.drawImage(PXBOOM, (i + 1) * 96, 0, 96, 96, dx, dy, s2, s2);
    c.globalAlpha = 1 - k;                                // than lửa pixel bay ra, mờ dần
    embers.forEach(e => {
      const d = e.sp * k;
      c.fillStyle = e.c;
      c.fillRect(x + Math.cos(e.a) * d - e.s / 2, y + Math.sin(e.a) * d * .7 - e.s / 2, e.s, e.s);
    });
    c.globalAlpha = 1;
  });
}
function dash(el, F, X, ms = 340) {
  const h = el.closest("#mons, #party");   // nâng cả khu vực của bên tấn công lên trên trong lúc lao tới, để không bị thanh máu / bảng bên kia đè
  if (h) { h._z = (h._z || 0) + 1; h.style.zIndex = 8; }
  const mv = el.querySelector(":scope > .sfig > canvas.sp") || el;   // nhân vật sprite: chỉ hình lao ra khỏi khung, khung đứng yên
  const a = mv.animate([{ translate: "0 0" }, { translate: (X[0] - F[0]) * .6 + "px " + (X[1] - F[1]) * .6 + "px", offset: .4 }, { translate: "0 0" }], { duration: ms * TS() });
  const done = () => { if (h && --h._z <= 0) { h._z = 0; h.style.zIndex = ""; } };
  a.onfinish = done; a.oncancel = done;
}
/* Cận chiến: chạy tới gần quái, đánh xong mới chạy về. EVENT-DRIVEN: animation này onfinish mới chạy tiếp cái kia,
   sprite đánh xong (tự về idle) mới cho chạy về — không dùng setTimeout đoán thời gian nữa */
const RUN_GO = 220, RUN_BACK = 170;   // ms (chưa nhân TS()) chạy tới / chạy về; số nhỏ = nhanh hơn
function runAtk(el, F, X, onHit) {
  const h = el.closest("#mons, #party");
  if (h) { h._z = (h._z || 0) + 1; h.style.zIndex = 8; }
  const mv = el.querySelector(":scope > .sfig > canvas.sp") || el;
  const cv = el.querySelector(":scope > .sfig > canvas.sp");
  const atkAnim = cv && cv._s && cv._s.a !== "walk" ? cv._s.a : "atk1";
  const dx = (X[0] - F[0]) * .85, dy = (X[1] - F[1]) * .85, TSv = TS();
  let cleaned = false;   // chỉ trả z-index đúng 1 lần dù bị gọi từ nhiều sự kiện
  const cleanup = () => { if (cleaned) return; cleaned = true; if (h && --h._z <= 0) { h._z = 0; h.style.zIndex = ""; } };
  sprAtk(el, "walk");   // phase 1: chạy tới
  const go = mv.animate([{ translate: "0 0" }, { translate: dx + "px " + dy + "px" }], { duration: RUN_GO * TSv, easing: "ease-out", fill: "forwards" });
  go.oncancel = cleanup;
  go.onfinish = () => {
    sprAtk(el, atkAnim);   // phase 2: tới nơi, đổi sang anim đánh
    if (onHit) onHit();   // nổ hiệu ứng trúng
    const t0 = performance.now(), maxWait = 2500;   // dự phòng: quá 2.5s sprite chưa về idle thì ép chạy về
    const waitAtk = () => {   // chờ sprite đánh xong (tự về idle) rồi mới chạy về
      const cur = cv && cv._s ? cv._s.a : "idle";
      if (cur === "idle" || !el.isConnected || performance.now() - t0 > maxWait) {
        sprAtk(el, "walk");   // phase 3: chạy về
        const back = mv.animate([{ translate: dx + "px " + dy + "px" }, { translate: "0 0" }], { duration: RUN_BACK * TSv, easing: "ease-in", fill: "forwards" });
        // Về tới chỗ cũ: hủy cả 2 animation (nếu không, fill của "chạy tới" kéo nhân vật lại chỗ quái)
        back.onfinish = back.oncancel = () => {
          go.cancel(); back.cancel(); cleanup();
          if (cv && cv._s && cv._s.a === "walk" && !el.classList.contains("dead")) sprPlay(cv, "idle");   // walk tự lặp mãi → phải đổi lại idle (không đè hurt/death)
        };
      } else requestAnimationFrame(waitAtk);
    };
    waitAtk();
  };
}
const shake = () => { const A = $("arena"); A.classList.add("shake"); at(260, () => A.classList.remove("shake")); };
const tint = h => PT(650, (c, k) => { c.fillStyle = hsl(h, .3 * Math.sin(Math.PI * k), 55); c.fillRect(0, 0, FXS.W, FXS.H); });
function dodgeFx(id) {   // né: nhân vật lách sang bên + vệt gió
  const el = $(id), A = $("arena"); if (!el) return;
  const [x, y] = vRel(el, A.getBoundingClientRect());
  el.animate([{ translate: "0 0", opacity: 1 }, { translate: "-22px 0", opacity: .35, offset: .3 }, { translate: "0 0", opacity: 1 }], { duration: 400 * TS() });
  for (let i = 0; i < 4; i++) PT(350, (c, k) => { c.strokeStyle = hsl(200, .7 * (1 - k), 85); c.lineWidth = 2; c.beginPath(); c.moveTo(x + 10 - i * 4 + k * 40, y - 24 + i * 16); c.lineTo(x + 70 - i * 4 + k * 40, y - 24 + i * 16); c.stroke(); });
}
/* Mỗi hiệu ứng nhận (F = tâm người ra đòn, X = danh sách tâm mục tiêu, el = phần tử người ra đòn). Màu theo hue: 0 đỏ, 25 cam, 48 vàng, 130 lục, 200 lam, 280 tím */
const VFX = {
  clang:   (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { sl(x, y, 40, -.6, 80); bst(x, y, 35, 16, 7); rng(x, y, 40, 55, 350); }); },
  stab:    (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { sl(x, y, 275, .5, 80, 260); sl(x, y, 300, -.5, 80, 260); bst(x, y, 280, 10, 7); }); },
  slash:   (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { sl(x, y, 280, .7, 110, 280); sl(x, y, 300, -.7, 110, 280); bst(x, y, 290, 12, 7); }); },   // vệt chém rộng của Kiếm sĩ
  backstab:(F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { sl(x, y, 280, .6, 110); sl(x, y, 310, -.6, 110); fl(x, y, 280, 90); bst(x, y, 290, 18, 8); }); },
  flurry:  (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { sl(x, y, 290, (rnd() - .5) * 2.4, 90, 240); bst(x, y, 280, 8, 6); }); },
  execute: (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { fl(x, y, 0, 110, 500); sl(x, y, 0, .8, 120, 400); sl(x, y, 0, -.8, 120, 400); bst(x, y, 0, 28, 9); rng(x, y, 0, 85, 450, 6); shake(); }); },
  vanish:  F => { fl(F[0], F[1], 270, 90, 600); rng(F[0], F[1], 270, 80, 500, 5); bst(F[0], F[1], 275, 26, 4); },
  holy:    (F, X) => X.forEach(([x, y]) => proj(F, [x, y], 48, 260, 9, () => { fl(x, y, 48, 70); bst(x, y, 48, 14, 5); rng(x, y, 48, 45, 380); })),
  arcane:  (F, X) => X.forEach(([x, y]) => proj(F, [x, y], 290, 260, 9, () => { fl(x, y, 290, 70); bst(x, y, 300, 16, 6); rng(x, y, 290, 50, 380); })),
  taunt:   F => { [0, 150, 300].forEach(d => at(d, () => rng(F[0], F[1], 0, 110, 550, 5))); fl(F[0], F[1], 0, 90); },
  bash:    (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { fl(x, y, 210, 90); rng(x, y, 210, 90, 450, 7); rng(x, y, 40, 60, 350); bst(x, y, 40, 22, 8); shake(); }); },
  wall:    F => { rng(F[0], F[1], 210, 90, 500, 6); at(120, () => rng(F[0], F[1], 190, 65, 500, 4)); fl(F[0], F[1], 210, 80, 600); rise(F[0], F[1], 210, 10); },
  charge:  (F, X) => { tint(8); shake(); X.forEach(([x, y], i) => at(i * 70, () => burstFire(x, y))); },
  heal:    (F, X) => X.forEach(([x, y]) => { bm(x, y, 130); rise(x, y, 130, 14); rng(x, y + 20, 130, 40, 500); }),
  holyAll: (F, X) => { tint(50); const cx = X.reduce((s, p) => s + p[0], 0) / X.length, cy = X.reduce((s, p) => s + p[1], 0) / X.length;
    bm(cx, cy, 50); rise(cx, cy, 50, 20); rng(cx, cy + 20, 50, 140, 800, 6);
    X.forEach(([x, y]) => { bm(x, y, 50); rise(x, y, 50, 10); }); },
  bless:   (F, X) => X.forEach(([x, y]) => { rise(x, y, 45, 14); rng(x, y, 45, 55, 600, 3); fl(x, y, 55, 70, 500); }),
  revive:  (F, X) => X.forEach(([x, y]) => { bm(x, y, 55); fl(x, y, 55, 110, 700); rise(x, y, 55, 24); rng(x, y + 20, 55, 70, 700, 5); }),
  fireball:(F, X) => X.forEach(([x, y]) => proj(F, [x, y], 18, 300, 12, () => { fl(x, y, 30, 100, 400); bst(x, y, 20, 28, 8); rng(x, y, 15, 70, 420, 6); })),
  firestorm:(F, X) => { tint(15); shake(); const cx = X.reduce((s, p) => s + p[0], 0) / X.length, cy = X.reduce((s, p) => s + p[1], 0) / X.length;
    X.forEach(([x, y]) => fall(x, y, 22, 14));
    at(330, () => { burstPixel(cx, cy); bst(cx, cy, 20, 60, 14); rng(cx, cy, 15, 170, 700, 10); rng(cx, cy, 30, 120, 600, 6); });
    X.forEach(([x, y]) => at(380, () => { fl(x, y, 30, 70, 350); })); },
  frost:   (F, X) => { tint(200); shake(); const cx = X.reduce((s, p) => s + p[0], 0) / X.length, cy = X.reduce((s, p) => s + p[1], 0) / X.length;
    X.forEach(([x, y]) => fall(x, y, 195, 14));
    at(330, () => { fl(cx, cy, 195, 240, 700); bst(cx, cy, 190, 50, 12); rng(cx, cy, 200, 160, 700, 9); });
    X.forEach(([x, y]) => at(380, () => { fl(x, y, 195, 70, 350); })); },
  meteor:  (F, X) => { tint(8); shake(); const cx = X.reduce((s, p) => s + p[0], 0) / X.length, cy = X.reduce((s, p) => s + p[1], 0) / X.length;
    proj([cx - 200, cy - 380], [cx, cy], 15, 480, 28, () => { fl(cx, cy, 25, 280, 800); rng(cx, cy, 20, 200, 800, 12); rng(cx, cy, 40, 130, 600, 7); bst(cx, cy, 20, 70, 14); shake(); });
    X.forEach(([x, y]) => at(200, () => { fl(x, y, 25, 80, 400); })); },
  claw:    (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { [-14, 0, 14].forEach(o => sl(x + o, y, 0, .9, 55, 300)); bst(x, y, 0, 10, 6); }); },
  smash:   (F, X, el) => { const [x, y] = X[0]; runAtk(el, F, X[0], () => { fl(x, y, 30, 90); rng(x, y, 30, 80, 450, 7); bst(x, y, 30, 18, 8); shake(); }); },
  dragon:  (F, X) => { shake(); const cx = X.reduce((s, p) => s + p[0], 0) / X.length, cy = X.reduce((s, p) => s + p[1], 0) / X.length;
    proj(F, [cx, cy], 15, 300, 24, () => { fl(cx, cy, 20, 260, 700); bst(cx, cy, 15, 60, 12); rng(cx, cy, 10, 170, 650, 9); shake(); });
    X.forEach(([x, y]) => at(250, () => { fl(x, y, 20, 80, 350); })); },
  potion:  (F, X) => X.forEach(([x, y]) => { rise(x, y, 150, 14); rng(x, y + 20, 150, 40, 500); }),
  iceLock: (F, X) => X.forEach(([x, y]) => { rng(x, y, 195, 55, 500, 5); bst(x, y, 190, 16, 5); fl(x, y, 195, 70, 400); })
};
const GAP = 200, DUR = { clang: 1200, stab: 1200, slash: 1200, backstab: 1200, flurry: 1200, execute: 1300, vanish: 600, holy: 650, arcane: 650, taunt: 700, bash: 1200, wall: 600, charge: 1050, heal: 700, holyAll: 800, bless: 700, revive: 900, fireball: 750, firestorm: 800, frost: 800, meteor: 1100, claw: 1200, smash: 1200, dragon: 800, potion: 600, iceLock: 500 };
let vd = 0, stepEnd = 0;   // độ trễ tích lũy (ms) để các đòn trong 1 vòng diễn ra lần lượt
let sprA = null;           // hoạt ảnh sprite của hành động đang xử lý: atk1 (đánh thường) · atk2 (kỹ năng) · atk3 (tối thượng) · block (phòng thủ)
function VF(n, f, t) {
  const an = sprA, d = vd; vd = Math.min(1800, vd + (t.length > 1 ? 120 : 220)); stepEnd = Math.max(stepEnd, d + (DUR[n] || 600));
  if (state.mode === "coop") return co.evs.push({ k: "vfx", n, f, t, d, a: an });
  setTimeout(() => playVfx(n, idOf(f), t.map(x => idOf(x)), an), d * TS());
}
function playVfx(n, fid, tids, an) {
  const A = $("arena"), f = $(fid), ar = A.getBoundingClientRect(), T = tids.map($).filter(Boolean), fn = VFX[n];
  if (!fn || !f || !T.length) return;
  const C = el => vRel(el, ar);
  SND[n] && SND[n]();
  sprAtk(f, an || SPR_ATK[n]);
  fn(C(f), T.map(C), f);
}

const idOf = (w, me = 0) => typeof w === "string" ? "mon-" + w.slice(1) : w === me ? "player-avatar" : "mate-avatar";
const LG = (t, c) => state.mode === "coop" ? L(t, c) : log(t, c);
const FXX = (w, t, k, h) => { stepEnd = Math.max(stepEnd, vd + 500); if (state.mode === "coop") return FX(w, t, k, h); const id = idOf(w); setTimeout(() => { if (h) flash(id); floatText(id, t, k); }, vd * TS()); };
function canAct(p, a) { if (a === "attack" || a === "defend") return true; const k = skDef(p, +a[1]); return !!k && p.mana >= k.c && !((p.cds || [])[+a[1]] > 0) && !hasSt(p, "silence"); }

