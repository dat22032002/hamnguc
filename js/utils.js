/* js/utils.js — Tiện ích chung: rand/esc/pct, tính né/chí mạng, âm thanh WebAudio (tone, SFX), nhật ký log(). */
/* =====================================================
   PHẦN 3: HÀM TIỆN ÍCH
   ===================================================== */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const $ = (id) => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = v => Math.round(v * 100);
/* Né tránh = né cơ bản + (tốc độ bên né - tốc độ bên đánh) x speedEvasion, giới hạn 0%..60% */
function dodgeChance(def, att, bonus = 0) {
  return Math.max(0, Math.min(0.85, Math.min(0.6, (def.evasion || 0) + bonus + (effSpd(def) - effSpd(att)) * CONFIG.speedEvasion) + (hasSt(att, "blind") ? 0.4 : 0)));
}
/* Chí mạng = chí mạng cơ bản + may mắn x luckCrit (chưa tính hiệu ứng tạm như Ẩn thân) */
const critBase = p => Math.max(0, Math.min(0.95, (p.critChance || 0) + (p.luck || 0) * CONFIG.luckCrit));

/* ÂM THANH: tạo bằng WebAudio, không cần file âm thanh */
let muted = false, AC;
try { muted = localStorage.getItem("rpgMute") === "1"; } catch (e) {}
function tone(f, d, type = "square", vol = 0.06, delay = 0, slide = 0) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    d *= TS(); delay *= TS(); const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const SFX = {
  dmg:  () => { tone(160, .14, "sine", .12, 0, -90); noise(.09, .1, 1800, 400, "lowpass"); },
  crit: () => { tone(120, .2, "sine", .14, 0, -60); noise(.12, .12, 5000, 800, "bandpass"); tone(1000, .2, "square", .05, .03, -500); tone(1500, .25, "triangle", .05, .06); },
  heal: () => [660, 880, 1320].forEach((f, i) => tone(f, .22, "sine", .06, i * .07)),
  miss: () => { noise(.22, .09, 600, 3500, "bandpass", 0, 1.5); tone(500, .15, "sine", .03, .04, 300); },
  lvl:  () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, "square", .06, i * .1)),
  gold: () => [1175, 1568].forEach((f, i) => tone(f, .09, "square", .05, i * .07)),
  win:  () => [392, 523, 659].forEach((f, i) => tone(f, .14, "triangle", .08, i * .1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, .3, "triangle", .08, i * .2)),
  evo:  () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .2, "triangle", .07, i * .09))
};
const lastSfx = {};
const sfx = k => { const t = performance.now(); if (lastSfx[k] && t - lastSfx[k] < 70) return; lastSfx[k] = t; SFX[k] && SFX[k](); };

/* =====================================================
   PHẦN 4: NHẬT KÝ CHIẾN ĐẤU
   ===================================================== */
function log(text, cls = "") {
  const p = document.createElement("p");
  p.textContent = text;
  if (cls) p.className = cls;
  $("log").appendChild(p);
  $("log").scrollTop = $("log").scrollHeight;
}
function logTurnHeader() {
  const p = document.createElement("p");
  p.className = "turn";
  p.textContent = "— Lượt " + state.turn + " —";
  $("log").appendChild(p);
}

