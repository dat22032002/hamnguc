/* js/combat.js — Luật chiến đấu: trạng thái buff/debuff, kỹ năng quái, perform, thứ tự lượt, takeTurn, thắng/thua. */
/* =====================================================
   TRẠNG THÁI (buff / debuff) + KỸ NĂNG QUÁI
   Quái thường: 1 kỹ năng · Tinh anh (nâng cao): 2 · Trùm: 3. Mỗi kỹ năng tốn mana (c) và có hồi chiêu (cdn).
   Kỹ năng: t = hit | aoe | self · m = hệ số sát thương · ls = hút máu · v = hiệu ứng hình · st = [[trạng thái, số lượt, tỉ lệ, hệ số]]
   Thêm trạng thái mới: thêm vào STATUS (+ xử lý trong tickStart / dmgOut / dmgIn nếu cần).
   ===================================================== */
const RES_BASE = { knight: .15, swordmaster: .05, cleric: .15, mage: .10 };   // kháng hiệu ứng gốc của từng class
const STATUS = {
  stun:    { i: "💫", n: "Choáng",    bad: 1, d: "Mất lượt kế tiếp" },
  freeze:  { i: "❄️", n: "Đóng băng", bad: 1, d: "Mất lượt kế tiếp" },
  bleed:   { i: "🩸", n: "Chảy máu",  bad: 1, dot: 1, d: "Mất máu mỗi lượt" },
  poison:  { i: "☠️", n: "Trúng độc", bad: 1, dot: 1, d: "Mất % máu tối đa mỗi lượt" },
  burn:    { i: "🔥", n: "Bỏng",      bad: 1, dot: 1, d: "Cháy, mất máu mỗi lượt" },
  weak:    { i: "💔", n: "Suy yếu",   bad: 1, d: "Sát thương gây ra -30%" },
  vuln:    { i: "🎯", n: "Phá giáp",  bad: 1, d: "Sát thương nhận vào +30%" },
  slow:    { i: "🐌", n: "Làm chậm",  bad: 1, d: "Tốc độ -40%" },
  blind:   { i: "🌑", n: "Mù",        bad: 1, d: "Đòn đánh dễ trượt (+40%)" },
  silence: { i: "🤐", n: "Câm lặng",  bad: 1, d: "Không dùng được kỹ năng" },
  regen:   { i: "💚", n: "Hồi phục",  d: "Hồi máu mỗi lượt" },
  shield:  { i: "🛡️", n: "Khiên phép", d: "Hấp thụ sát thương" },
  rage:    { i: "😡", n: "Cuồng nộ",  d: "Sát thương gây ra +40%" },
  haste:   { i: "⚡", n: "Tăng tốc",  d: "Tốc độ +40%" },
  thorns:  { i: "🌵", n: "Gai nhọn",  d: "Phản st về kẻ đánh" },
  evade:   { i: "💨", n: "Thân pháp", d: "Né +40%" },
  manashield: { i: "🔷", n: "Khiên mana", d: "St trừ vào mana" },
  immune:  { i: "🔰", n: "Miễn nhiễm", d: "Không dính hiệu ứng xấu" }
};
const MSK = {
  "Slime": [{ n: "Dịch nhầy", i: "🟢", c: 8, cdn: 3, t: "hit", m: .8, v: "venom", st: [["slow", 3, .7]], d: "Làm chậm mục tiêu" },
    { n: "Nuốt chửng", i: "🌀", c: 16, cdn: 4, t: "hit", m: 2.0, v: "smash", heavy: true, d: "Đòn mạnh ẩn" }],
  "Dơi Đêm": [{ n: "Hút máu", i: "🦷", c: 8, cdn: 3, t: "hit", m: 1.1, ls: .8, v: "claw", d: "Cắn và hút máu" },
    { n: "Xé toạc", i: "🩸", c: 16, cdn: 4, t: "hit", m: 2.0, v: "claw", heavy: true, d: "Đòn mạnh ẩn" }],
  "Orc": [{ n: "Bột cay", i: "🌶️", c: 10, cdn: 3, t: "hit", m: .8, v: "venom", st: [["blind", 2, .6]], d: "Gây mù" },
             { n: "Cuồng nộ", i: "😡", c: 12, cdn: 5, t: "self", v: "rage", st: [["rage", 4, 1]], d: "Tự tăng sát thương" },
             { n: "Bom cay", i: "💥", c: 20, cdn: 4, t: "aoe", m: 1.2, v: "smash", heavy: true, d: "Đòn mạnh ẩn" }],
  "Sói Xám": [{ n: "Xé xác", i: "🩸", c: 12, cdn: 3, t: "hit", m: 1.3, v: "claw", st: [["bleed", 3, .7, .35]], d: "Gây chảy máu" },
              { n: "Tru gọi bầy", i: "🌕", c: 12, cdn: 5, t: "self", v: "rage", st: [["haste", 4, 1]], d: "Tự tăng tốc" },
              { n: "Vồ xé", i: "🐺", c: 20, cdn: 4, t: "hit", m: 2.0, v: "claw", heavy: true, d: "Đòn mạnh ẩn" }],
  "Xương Binh": [{ n: "Chém phá giáp", i: "🗡️", c: 12, cdn: 3, t: "hit", m: 1.1, v: "smash", st: [["vuln", 3, .7]], d: "Phá giáp mục tiêu" },
                 { n: "Lời nguyền", i: "🤐", c: 14, cdn: 4, t: "hit", m: .8, v: "venom", st: [["silence", 2, .5]], d: "Câm lặng, chặn kỹ năng" },
                 { n: "Chém tử thần", i: "💀", c: 22, cdn: 5, t: "hit", m: 2.2, v: "smash", heavy: true, d: "Đòn mạnh ẩn" }],
  "Troll": [{ n: "Tái sinh", i: "💚", c: 14, cdn: 4, t: "self", v: "heal", st: [["regen", 4, 1, .07]], d: "Hồi máu mỗi lượt" },
            { n: "Nện búa", i: "🔨", c: 16, cdn: 3, t: "hit", m: 1.5, v: "smash", st: [["stun", 1, .35]], d: "35% gây choáng" },
            { n: "Quật tan xác", i: "💢", c: 24, cdn: 5, t: "hit", m: 2.2, v: "smash", heavy: true, d: "Đòn mạnh ẩn" }],
  "Rồng Lửa": [{ n: "Móng vuốt xé", i: "🐾", c: 10, cdn: 2, t: "hit", m: 1.6, v: "claw", st: [["bleed", 3, .7, .3]], d: "Gây chảy máu" },
               { n: "Hơi thở rồng", i: "🔥", c: 24, cdn: 3, t: "aoe", m: 1.0, v: "dragon", st: [["burn", 3, .7, .25]], d: "Phun lửa cả đội, gây bỏng" },
               { n: "Long uy", i: "🛡️", c: 28, cdn: 5, t: "self", v: "wall", st: [["shield", 4, 1, .12], ["thorns", 4, 1]], d: "Khiên phép + gai nhọn" },
               { n: "Hủy diệt", i: "☄️", c: 30, cdn: 5, t: "aoe", m: 1.4, v: "dragon", heavy: true, d: "Đòn mạnh ẩn" }]
};
function mkSk(key, boss, el) {
  const all = MSK[key] || [], heavy = all.filter(k => k.heavy);   // đòn mạnh luôn có, nhưng ẩn
  const sk = all.filter(k => !k.heavy).slice(0, boss ? 3 : el ? 2 : 1).concat(heavy);
  const mc = Math.max(10, ...sk.map(k => k.c));
  return { sk, maxMp: mc * 3, mp: mc * 3, mr: Math.ceil(mc * .5), cds: sk.map(() => 0), st: {}, fres: 0 };
}
const hasSt = (x, k) => !!(x && x.st && x.st[k] && x.st[k].d > 0);
const stOf = x => x.st || (x.st = {});
const effSpd = x => (x.spd || 0) * (hasSt(x, "slow") ? .6 : 1) * (hasSt(x, "haste") ? 1.4 : 1);
const dmgOut = (a, d) => d * (hasSt(a, "weak") ? .7 : 1) * (hasSt(a, "rage") ? 1.4 : 1);
function dmgIn(t, d) {   // trả về [sát thương lên máu, lượng khiên chặn]
  d = Math.max(1, Math.round(d * (hasSt(t, "vuln") ? 1.3 : 1)));
  const sh = hasSt(t, "shield") ? t.st.shield : null; let ab = 0;
  if (sh && sh.v > 0) { ab = Math.min(sh.v, d); sh.v -= ab; d -= ab; if (sh.v <= 0) delete t.st.shield; }
  return [d, ab];
}
const stIcons = x => Object.entries(x.st || {}).filter(([k, s]) => STATUS[k] && s.d > 0).map(([k, s]) => '<span title="' + STATUS[k].n + " (" + s.d + " lượt) — " + STATUS[k].d + '">' + STATUS[k].i + "<sub>" + s.d + "</sub></span>").join(" ");
function cleanse(q) { const S = stOf(q); let n = 0; for (const k in S) if (STATUS[k] && STATUS[k].bad) { delete S[k]; n++; } return n; }
/* Tỉ lệ trúng debuff thực tế = tỉ lệ của kỹ năng x (1 - kháng hiệu ứng của mục tiêu). Tối đa 95% nên không bao giờ "tự dính". Buff thì không bị kháng. */
const stChance = (c, t) => Math.max(0, Math.min(.95, c ?? 1) * (1 - Math.min(.8, t.res || 0)));
function rollSt(t, ti, src, [k, dur, ch, val], base, cls) {
  const T = STATUS[k]; if (!T || t.hp <= 0) return false;
  if (T.bad && hasSt(t, "immune")) { LG("🔰 " + t.name + " miễn nhiễm " + T.n.toLowerCase() + "!", cls); FXX(ti, "Miễn nhiễm", "st"); return false; }
  const c0 = Math.min(.95, ch ?? 1), fin = T.bad ? stChance(c0, t) : c0, r = Math.random(), nm = T.n.toLowerCase();
  if (r >= c0) { LG("🎲 " + t.name + " không dính " + nm + " (tỉ lệ " + pct(fin) + "%)."); FXX(ti, "Trượt", "st"); return false; }
  if (r >= fin) { LG("🔰 " + t.name + " kháng " + nm + "! (tỉ lệ " + pct(fin) + "%, kháng " + pct(Math.min(.8, t.res || 0)) + "%)", cls); FXX(ti, "Kháng!", "st"); return false; }
  if (!applySt(t, src, k, dur, val, base)) return false;
  LG(T.i + " " + t.name + " dính " + nm + "! (tỉ lệ " + pct(fin) + "%)", cls); FXX(ti, T.i + T.n, "st"); return true;
}
const stTxt = k => (k.st || []).filter(x => STATUS[x[0]].bad).map(x => STATUS[x[0]].i + STATUS[x[0]].n + " " + pct(Math.min(.95, x[2] ?? 1)) + "%").join(", ");
/* Gây trạng thái. base = sát thương vừa gây (dùng tính chảy máu / bỏng). Choáng & đóng băng: sau khi dính thì được kháng vài lượt */
function applySt(t, src, k, dur, val, base) {
  if (!STATUS[k] || t.hp <= 0) return false;
  if ((k === "stun" || k === "freeze") && t.fres > 0) { LG("🔰 " + t.name + " kháng " + STATUS[k].n.toLowerCase() + "!"); return false; }
  const S = stOf(t), o = S[k], avg = ((src.atkMin || 0) + (src.atkMax || 0)) / 2; let v = 0;
  if (k === "bleed" || k === "burn") v = Math.max(1, Math.round((base ?? avg) * (val ?? .3)));
  else if (k === "poison") v = Math.max(1, Math.round(t.maxHp * (val ?? .05)));
  else if (k === "regen" || k === "shield") v = Math.round(t.maxHp * (val ?? .08));
  S[k] = { d: Math.max(dur, o ? o.d : 0), v: k === "shield" ? (o ? o.v : 0) + v : Math.max(v, o ? o.v : 0) };
  return true;
}
/* Đầu lượt của chủ: trừ máu theo thời gian, hồi phục, mất lượt vì choáng / đóng băng. Trả về true nếu mất lượt (hoặc đã chết) */
function tickStart(x, xi) {
  const S = stOf(x), mine = typeof xi === "number"; let skip = false;
  Object.keys(S).forEach(k => {
    const s = S[k], T = STATUS[k]; if (!T || s.d <= 0 || x.hp <= 0) return;
    if (T.dot) { x.hp = Math.max(0, x.hp - s.v); LG(T.i + " " + x.name + " mất " + s.v + " máu vì " + T.n.toLowerCase() + (x.hp <= 0 ? " — gục ngã!" : "."), mine ? "bad" : "good"); FXX(xi, "-" + s.v, "dmg", true); }
    else if (k === "regen") { const b = x.hp; x.hp = Math.min(x.maxHp, x.hp + s.v); if (x.hp > b) { LG("💚 " + x.name + " hồi " + (x.hp - b) + " máu.", mine ? "good" : "bad"); FXX(xi, "+" + (x.hp - b), "heal"); } }
    else if (k === "stun" || k === "freeze") { skip = true; s.d--; x.fres = x.boss ? 2 : 1; VF(k === "stun" ? "stun" : "iceLock", xi, [xi]); LG(T.i + " " + x.name + " bị " + T.n.toLowerCase() + ", mất lượt.", mine ? "bad" : "good"); }
  });
  return skip || x.hp <= 0;
}
/* Cuối lượt của chủ: mọi trạng thái giảm 1 lượt (choáng / đóng băng đã trừ lúc mất lượt) */
function tickEnd(x, lost) {
  const S = stOf(x);
  for (const k in S) { if (k !== "stun" && k !== "freeze") S[k].d--; if (S[k].d <= 0) delete S[k]; }
  if (!lost && x.fres > 0) x.fres--;
}
/* Sau mỗi đòn của người chơi: gây trạng thái của kỹ năng + gai phản đòn (đếm choáng cho tiến hóa) */
function afterHit(p, pi, m, mi, d, k, si) {
  if (m.hp > 0 && k && k.st) k.st.forEach(x => { if (rollSt(m, mi, p, x, d, "good") && x[0] === "stun" && p.evoProg && si != null && p.evoProg[si]) { p.evoProg[si].stuns++; addEvoXp(p, si, "stuns"); } });
  if (hasSt(m, "thorns") && p.hp > 0 && d > 0) { const r = Math.max(1, Math.round(d * .3)); p.hp = Math.max(0, p.hp - r); LG("🌵 " + p.name + " bị gai phản " + r + " sát thương.", "bad"); FXX(pi, "-" + r, "dmg", true); }
}
/* Quái đánh 1 người (có thể kèm kỹ năng k) */
function mHit(m, mk, P, ti, mul, k) {
  const t = P[ti];
  if (Math.random() < dodgeChance(t, m, (t.fx.hide > 0 ? .6 : 0) + (hasSt(t, "evade") ? .4 : 0))) { LG(t.name + " né được " + (k ? k.n : "đòn") + " của " + m.name + "!", "good"); return FXX(ti, "Né!", "miss"); }
  let d = dmgOut(m, rand(m.atkMin, m.atkMax) * mul);
  if (t.defending) d *= 1 - Math.min(.9, t.defendReduce);
  if (t.fx.guard > 0) d *= .3;
  if (t.fx.taunt > 0) d *= .6;
  if (t.fx.thornsGuard > 0) d *= .5;
  if (hasSt(t, "manashield") && t.mp > 0) { const mcost = Math.min(t.mp, Math.round(d)); t.mp -= mcost; d -= mcost; if (mcost > 0) { LG("🔷 " + t.name + " chặn " + mcost + " st bằng mana!", "good"); FXX(ti, "-" + mcost + "🔷", "heal"); } }
  const [dd, ab] = dmgIn(t, d); t.hp = Math.max(0, t.hp - dd);
  LG(m.name + (k ? " dùng " + k.n + " lên " : " đánh ") + t.name + ", gây " + dd + " sát thương" + (ab ? " (khiên chặn " + ab + ")" : "") + (t.hp <= 0 ? ". " + t.name + " gục ngã!" : "."), "bad");
  FXX(ti, "-" + dd, "dmg", true);
  if (hasSt(t, "thorns") && m.hp > 0 && dd > 0) { const r = Math.max(1, Math.round(dd * .5)); m.hp = Math.max(0, m.hp - r); LG("🌵 " + m.name + " bị phản " + r + " st!", "good"); FXX(mk, "-" + r, "dmg", true); }
  if (k && k.ls && m.hp > 0) { const b = m.hp; m.hp = Math.min(m.maxHp, m.hp + Math.round(dd * k.ls)); if (m.hp > b) { LG(m.name + " hút " + (m.hp - b) + " máu.", "bad"); FXX(mk, "+" + (m.hp - b), "heal"); } }
  if (k && k.st && t.hp > 0) k.st.forEach(x => rollSt(t, ti, m, x, dd, "bad"));
}
Object.assign(VFX, {
  venom: (F, X) => X.forEach(([x, y]) => proj(F, [x, y], 110, 260, 9, () => { fl(x, y, 110, 70); bst(x, y, 110, 14, 5); rng(x, y, 110, 55, 420, 4); })),
  stun:  F => { rng(F[0], F[1] - 34, 50, 46, 520, 5); bst(F[0], F[1] - 34, 50, 10, 4); },
  rage:  F => { fl(F[0], F[1], 0, 90, 600); rng(F[0], F[1], 0, 80, 550, 5); rise(F[0], F[1], 0, 10); }
});
Object.assign(SND, {
  venom: () => { noise(.3, .08, 800, 200, "lowpass"); tone(300, .25, "sawtooth", .04, 0, -120); },
  stun:  () => { tone(700, .12, "square", .05); tone(520, .12, "square", .05, .1); },
  rage:  () => { tone(100, .4, "sawtooth", .1, 0, 60); noise(.3, .08, 300, 900, "bandpass"); }
});
Object.assign(DUR, { venom: 700, stun: 500, rage: 600 });
SFX.st = () => tone(420, .18, "triangle", .05, 0, -160);

/* Gây sát thương lên 1 quái (dùng chung cho đánh thường + mọi skill) */
function dealHit(p, pi, mons, m, mul, q, cx) {
  const mi = "m" + mons.indexOf(m);
  if (!q) VF(cx.cur, pi, [mi]);
  if (Math.random() < dodgeChance(m, p)) { LG(m.name + " né được đòn của " + p.name + "!"); return FXX(mi, "Né!", "miss"); }
  let d = dmgOut(p, rand(p.atkMin, p.atkMax) * mul * (p.fx.buff > 0 ? 1.4 : 1));
  const cr = Math.random() < Math.min(0.95, critBase(p) + (p.fx.hide > 0 ? .5 : 0));
  if (cr) d *= p.critDmg || 1.5;
  const [dd, ab] = dmgIn(m, d); d = dd; const wasAlive = m.hp > 0; m.hp = Math.max(0, m.hp - d);
  if (wasAlive && m.hp <= 0 && p.evoProg && cx.si != null && p.evoProg[cx.si]) { p.evoProg[cx.si].kills++; addEvoXp(p, cx.si, "kills"); }
  LG(p.name + " gây " + d + " sát thương lên " + m.name + (ab ? " (khiên chặn " + ab + ")" : "") + (cr ? " (CHÍ MẠNG!)" : "") + (m.hp <= 0 ? " — hạ gục!" : "."), "good");
  FXX(mi, "-" + d + (cr ? "!" : ""), cr ? "crit" : "dmg", true);
  afterHit(p, pi, m, mi, d, cx.ck, cx.si);
  if (cx.ls && p.hp > 0) { const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.round(d * cx.ls)); if (p.hp > b) { LG(p.name + " hút " + (p.hp - b) + " máu.", "good"); FXX(pi, "+" + (p.hp - b), "heal"); } }
}
/* Hồi máu cho 1 đồng đội (dùng chung cho heal/healall/smite/revive) */
function castHeal(p, pi, q, qi, a, qt, cx) {
  if (!qt) VF(cx.cur, pi, [qi]);
  const b = q.hp, clutch = q.hp <= q.maxHp * .3; q.hp = Math.min(q.maxHp, q.hp + a);
  if (clutch && p.evoProg && cx.si != null && p.evoProg[cx.si]) { p.evoProg[cx.si].clutch++; addEvoXp(p, cx.si, "clutch"); }
  LG(p.name + " hồi " + (q.hp - b) + " máu cho " + q.name + ".", "good"); FXX(qi, "+" + (q.hp - b), "heal");
  if (cleanse(q)) { LG("✨ " + q.name + " được giải trừ hiệu ứng xấu.", "good"); FXX(qi, "Giải trừ!", "st"); }
}
/* Tung 1 kỹ năng (đã trừ mana, đã cộng EXP dùng skill) */
function castSkill(p, pi, mons, al, P, tg, si, k, cx) {
  const live = P.map((q, i) => [q, i]).filter(x => x[0].hp > 0).sort((a, b) => a[0].hp / a[0].maxHp - b[0].hp / b[0].maxHp);
  const sup = { taunt: [pi], guard: [pi], hide: [pi], buff: live.map(x => x[1]) };
  if (sup[k.t]) VF(cx.cur, pi, sup[k.t]);
  const hit = (m, mul, q) => dealHit(p, pi, mons, m, mul, q, cx);
  const heal = (q, qi, a, qt) => castHeal(p, pi, q, qi, a, qt, cx);
  switch (k.t) {
    case "hit": hit(tg, k.m); break;
    case "aoe": VF(cx.cur, pi, al.map(m => "m" + mons.indexOf(m))); al.forEach(m => hit(m, k.m, 1)); break;
    case "multi": for (let j = 0; j < 3; j++) { const a2 = mons.filter(m => m.hp > 0); if (a2.length) hit(a2[rand(0, a2.length - 1)], k.m); } break;
    case "freeze": VF(cx.cur, pi, al.map(m => "m" + mons.indexOf(m))); al.forEach(m => hit(m, k.m, 1)); break;
    case "taunt": p.fx.taunt = k.dur || 3; break;
    case "guard": p.fx.guard = k.dur || 3; break;
    case "hide": p.fx.hide = 3; break;
    case "debuff": al.forEach((m, i) => { if (m.hp > 0 && k.st) k.st.forEach(x => rollSt(m, mons.indexOf(m), p, x, 0, "good")); }); break;
    case "evade": applySt(p, p, "evade", k.dur || 3, null, 1); FXX(pi, "💨+", "heal"); break;
    case "manashield": applySt(p, p, "manashield", k.dur || 3, null, 1); FXX(pi, "🔷+", "heal"); break;
    case "thorns": applySt(p, p, "thorns", k.dur || 4, null, 1); p.fx.thornsGuard = k.dur || 4; FXX(pi, "🌵+", "heal"); break;
    case "shieldall": live.forEach(x => { if (x[0].hp > 0) { applySt(x[0], p, "shield", k.dur || 3, .15, 1); FXX(x[1], "🛡️+", "heal"); } }); break;
    case "buff": P.forEach((q, i) => { if (q.hp > 0) { q.fx.buff = k.dur || 3; FXX(i, "⚔️+", "heal"); } }); break;
    case "heal": heal(live[0][0], live[0][1], k.a + p.level * 3); break;
    case "healall": VF(cx.cur, pi, live.map(x => x[1])); live.forEach(x => heal(x[0], x[1], k.a + p.level * 2, 1)); break;
    case "smite":   // Thánh quang: đánh mọi quái và hồi máu cả đội
      VF("holy", pi, al.map(m => "m" + mons.indexOf(m))); al.forEach(m => hit(m, k.m, 1));
      VF("holyAll", pi, live.map(x => x[1])); live.forEach(x => heal(x[0], x[1], k.a + p.level * 2, 1)); break;
    case "revive": {
      const d = P.map((q, i) => [q, i]).find(x => x[0].hp <= 0);
      if (d) { d[0].hp = Math.round(d[0].maxHp * 0.6); LG(d[0].name + " được hồi sinh!", "good"); VF("revive", pi, [d[1]]); FXX(d[1], "Hồi sinh!", "heal"); }
      VF("holyAll", pi, live.map(x => x[1])); live.forEach(x => heal(x[0], x[1], Math.round(x[0].maxHp * (d ? 0.3 : 0.6)), 1));
    }
  }
}

/* Thực hiện 1 hành động của người chơi p (pi = vị trí trong đội, ti = quái đang nhắm) */
function perform(p, pi, act, ti, mons) {
  const P = state.mode === "coop" ? co.s.players : [p], al = mons.filter(m => m.hp > 0);
  if (!al.length) return;
  const tg = mons[ti] && mons[ti].hp > 0 ? mons[ti] : al[0];
  const cx = { cur: ATKFX[p.cls] || "clang", ls: 0, ck: null, si: null };   // ngữ cảnh dùng chung cho dealHit/castHeal
  if (act === "attack") { sprA = "atk1"; return dealHit(p, pi, mons, tg, 1, 0, cx); }
  // defend: bỏ ở lượt người chơi, nút Thủ/Né chỉ dùng để đỡ/né đòn mạnh ở lượt quái (QTE)
  if (hasSt(p, "silence")) return LG("🤐 " + p.name + " bị câm lặng, không niệm được kỹ năng!", "bad");
  cx.si = +act[1]; const k = skDef(p, cx.si);
  sprA = /^(heal|revive|cleanse|buff)/.test(k.t) ? "heal" : k.tier === "ult" ? "atk3" : "atk2";   // tối thượng = đòn mạnh nhất, kỹ năng thường/nâng cao = đòn giữa
  p.mana -= k.c; cx.ls = k.ls || 0; cx.ck = k;
  if (p.evoProg && p.evoProg[cx.si]) { p.evoProg[cx.si].uses++; addEvoXp(p, cx.si, "use"); }
  LG("✨ " + p.name + " dùng " + k.n + "!", "good");
  cx.cur = SKFX[k.n] || "holy";
  { const sa = SPR_ATK[cx.cur]; if ((sa === "fire" || sa === "ice") && hasSpr(p.cls) && SPRITE_DATA[p.cls].rows[sa]) sprA = sa; }   // lửa / băng: dùng hoạt ảnh riêng nếu sheet có
  if (k.tier === "ult") { LG("🌟 ULTIMATE — " + p.name + " tung " + k.n + "!", "good"); FXX(pi, "★ ULTIMATE ★", "crit"); }
  castSkill(p, pi, mons, al, P, tg, cx.si, k, cx);
}

/* QTE đỡ/né đòn mạnh: quái phát sáng 0.7s báo trước, rồi nút Thủ phát sáng để bấm */
function heavyQTE(m, mi, k, isMelee) {
  return new Promise(res => {
    const btn = $("btn-defend"), monEl = document.querySelector('.mon[data-i="' + mi + '"]');
    const oldClick = btn.onclick;
    let done = false, to2 = null;
    const fin = r => {
      if (done) return; done = true;
      clearTimeout(to1); if (to2) clearTimeout(to2);
      btn.onclick = oldClick; btn.classList.remove("qte-glow");
      if (monEl) monEl.classList.remove("telegraph");
      res(r);
    };
    if (monEl) monEl.classList.add("telegraph");   // quái phát sáng báo trước
    const to1 = setTimeout(() => {
      btn.classList.add("qte-glow");   // nút Thủ phát sáng
      btn.disabled = false;   // cho bấm dù đang lượt quái
      btn.onclick = () => fin(isMelee ? "block" : "dodge");
      to2 = setTimeout(() => fin("miss"), 600);   // không bấm kịp: ăn đủ (không theo TS để luôn nhanh)
    }, 700);   // quái phát sáng 0.7s báo trước (không theo TS)
  });
}

/* Lượt của 1 con quái: đánh 1 người (ưu tiên người đang khiêu khích) */
async function monsterAct(m, mi, P, mons) {
  const gid = gameId;
  const mk = "m" + mi; let used = -1;
  if (!m.cds) m.cds = [];
  const lost = tickStart(m, mk);   // chảy máu / độc / bỏng / choáng / đóng băng...
  const live = P.map((q, i) => i).filter(i => P[i].hp > 0);
  if (!lost && live.length) {
    const sil = hasSt(m, "silence"), sks = m.sk || [];
    const can = sks.map((k, i) => [k, i]).filter(([k, i]) => !sil && m.mp >= k.c && !(m.cds[i] > 0) && (k.t !== "self" || k.st.some(x => !hasSt(m, x[0]))));
    const pk = can.length && Math.random() < (m.boss ? .8 : .6) ? can[rand(0, can.length - 1)] : null, k = pk && pk[0];
    const ti = live.find(i => P[i].fx.taunt > 0) ?? live[rand(0, live.length - 1)];
    if (k) { used = pk[1]; m.mp -= k.c; LG("✨ " + m.name + " dùng " + k.n + "!", "bad"); }
    if (k && k.t === "self") {
      VF(k.v || "rage", mk, [mk]);
      k.st.forEach(([x, dur, ch, val]) => applySt(m, m, x, dur + 1, val));   // +1 vì cuối lượt này đã trừ 1
      LG(STATUS[k.st[0][0]].i + " " + m.name + " tự cường hóa!", "bad"); FXX(mk, k.st.map(x => STATUS[x[0]].i).join(""), "st");
    } else if (k && k.heavy) {
      // Đòn mạnh ẩn: quái phát sáng 0.7s, rồi nút Thủ phát sáng để bấm đỡ/né
      LG("⚠️ " + m.name + " tụ lực tung đòn mạnh: " + k.n + "!", "bad");
      render();
      const tgt = k.t === "aoe" ? live : [ti];
      const isDodger = P[tgt[0]].cls === "cleric" || P[tgt[0]].cls === "mage";   // Tu sĩ/Pháp sư né, còn lại đỡ
      const qr = await heavyQTE(m, mi, k, !isDodger); if (gid !== gameId) return;
      const qmod = qr === "miss" ? 1 : isDodger ? 0 : 0.3;   // né tránh hẳn, đỡ giảm 70%
      if (qr !== "miss") {
        LG((isDodger ? "💨 " : "🛡️ ") + P[tgt[0]].name + (isDodger ? " né được đòn mạnh!" : " đỡ được đòn mạnh!"), "good");
        if (!isDodger) { sprA = "block"; VF("wall", tgt[0], [tgt[0]]); }   // giơ khiên đỡ
      }
      sprA = "atk2"; VF(k.v || "smash", mk, tgt.map(t => t));
      if (qmod === 0) { FXX(tgt[0], "Né!", "miss"); }   // né hoàn toàn: không mất máu, không dính hiệu ứng
      else tgt.forEach(t => mHit(m, mk, P, t, k.m * qmod, k));
      sprA = null;
    } else if (k && k.t === "aoe") { VF(k.v || "claw", mk, live); live.forEach(t => mHit(m, mk, P, t, k.m, k)); }
    else { sprA = k ? "atk2" : "atk1"; VF(k ? k.v || "claw" : m.boss ? "dragon" : m.size === "l" ? "smash" : "claw", mk, [ti]); sprA = null; mHit(m, mk, P, ti, k ? k.m : 1, k); }
  }
  tickEnd(m, lost);
  m.cds = (m.sk || []).map((k, i) => i === used ? k.cdn : Math.max(0, (m.cds[i] || 0) - 1));
  if (m.hp > 0) m.mp = Math.min(m.maxMp || 0, (m.mp || 0) + (m.mr || 0));   // hồi mana mỗi lượt
}

/* Thứ tự ra đòn: tốc độ cao đánh trước (bằng nhau thì người chơi đánh trước). Mã: số = người chơi, "m#" = quái */
function buildOrder(P, ms) {
  const a = [];
  P.forEach((p, i) => p.hp > 0 && a.push([i, effSpd(p), 0, i]));
  ms.forEach((m, i) => m.hp > 0 && a.push(["m" + i, effSpd(m), 1, i]));
  return a.sort((x, y) => y[1] - x[1] || x[2] - y[2] || x[3] - y[3]).map(x => x[0]);
}
/* Chạy 1 lượt của 1 nhân vật. Trả về true nếu có ra đòn. Hiệu ứng buff đếm theo lượt của chính chủ */
async function actorTurn(tok, P, ms) {
  vd = 0; stepEnd = 0;
  if (!ms.some(m => m.hp > 0)) return false;
  if (typeof tok === "string") { const mi = +tok.slice(1); if (ms[mi].hp <= 0) return false; await monsterAct(ms[mi], mi, P, ms); }
  else {
    const p = P[tok]; if (p.hp <= 0) return false;
    p.defending = false;   // thế thủ kéo dài tới lượt hành động kế của chính mình (kể cả sang vòng sau)
    const lost = tickStart(p, tok);   // sát thương theo thời gian / choáng / đóng băng
    const used = !lost && /^s[0-4]$/.test(p.act) && !hasSt(p, "silence") ? +p.act[1] : -1;
    if (!lost) { if (/^item:/.test(p.act)) useItem(p, p.act); else if (/^gear:/.test(p.act)) { gearAct(p, p.act); FXX(0, "🎽", "st"); } else { perform(p, tok, p.act, p.tg, ms); sprA = null; } }
    tickEnd(p, lost);
    for (const k in p.fx) if (p.fx[k] > 0) p.fx[k]--;
    if (!p.cds) p.cds = [0, 0, 0, 0, 0];
    p.cds.forEach((v, i) => { if (i !== used && v > 0) p.cds[i] = v - 1; });   // hồi chiêu giảm 1 sau mỗi lượt của chủ
    if (used >= 0) p.cds[used] = skDef(p, used).cdn || 0;               // kỹ năng vừa dùng vào hồi chiêu
  }
  stepEnd = Math.max(stepEnd, 600);
  return true;
}
const CD_REST = 2;   // mỗi trận thắng: mọi hồi chiêu giảm thêm chừng này lượt
function restCd(p) { if (p.cds) p.cds = p.cds.map(v => Math.max(0, v - CD_REST)); }

/* Cuối vòng: hết khiên, hồi mana (không hồi nếu trận đã kết thúc) */
function endRound(P, regen = true) {
  P.forEach(p => { p.act = null; if (!regen) p.defending = false; if (regen && p.hp > 0) p.mana = Math.min(p.maxMana, p.mana + p.regen); });
}
function actLabel() {
  const o = state.order, tk = o && o[state.cur]; if (tk == null) return "";
  const a = typeof tk === "string" ? state.monsters[+tk.slice(1)] : (co && co.s ? co.s.players : [state.player])[tk];
  return a ? "▶ Lượt của " + a.name : "";
}

function gainXp(amount) {
  const p = state.player, L2 = CONFIG.levelUp;
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext; p.level++; p.pending = (p.pending || 0) + 1;
    p.xpToNext = xpNeed(p.level);
    const G = lvGain(p); p.maxHp += G.hp; p.atkMin += G.atk; p.atkMax += G.atk; p.maxMana += 10;
    const hb = p.hp, mb = p.mana;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * L2.healPercent));
    p.mana = Math.min(p.maxMana, p.mana + 10 + Math.round(p.maxMana * L2.manaPercent));
    floatText("player-avatar", "LÊN CẤP!", "lvl");
    log("⭐ LÊN CẤP " + p.level + "! Máu tối đa +" + G.hp + ", sát thương +" + G.atk + ", mana tối đa +10. Hồi " + (p.hp - hb) + " máu, " + (p.mana - mb) + " mana. Sau trận được chọn 1 nâng cấp chỉ số.", "good");
  }
}

function handleVictory() {
  const xp = state.monsters.reduce((a, m) => a + m.xp, 0);
  state.kills += state.monsters.length;
  log("Hạ gục cả bầy! Nhận " + xp + " XP.", "good");
  gainXp(xp); sfx("win");
  if (state.mode !== "coop") addGold(state.player, rollGold(state.monsters, state.monsterIndex + 1, luckOf(state.player)), "Quái rơi");   // vàng (shop.js)
  const pl = state.player;   // KHÔNG hồi máu / mana sau trận: chỉ hồi khi lên cấp (hoặc dùng thuốc, suối hồi phục)
  restCd(pl); pl.st = {}; pl.fres = 0;
  render();
  if (state.mode !== "coop") { checkEvo(pl); if ((pl.evoQueue || []).length) return showEvo(); }   // skill đủ EXP → popup tiến hóa, xong tự gọi showLoot
  showLoot(); render();
  return true;
}

function checkEnd() {
  if (!state.monsters.some(m => m.hp > 0)) return handleVictory();
  if (state.player.hp <= 0) return endGame(false);
  return false;
}

async function takeTurn(action) {
  if (state.busy || state.over) return;
  if (state.mode === "coop") return coopAct(action);
  const p = state.player, ms = state.monsters, gid = gameId;
  if (/^item:/.test(action) ? !bagHas(p, action) : /^gear:/.test(action) ? !gearOk(p, action) : !canAct(p, action)) return;
  state.busy = true; p.act = action; logTurnHeader();
  state.order = buildOrder([p], ms);
  for (let i = 0; i < state.order.length; i++) {
    state.cur = i;
    if (await actorTurn(state.order[i], [p], ms)) {
      const end = stepEnd;
      await sleep(350); if (gid !== gameId) return;   // chờ đòn trúng rồi mới trừ máu trên thanh
      render();
      await sleep(Math.max(0, end - 350) + GAP); if (gid !== gameId) return;
    }
    if (p.hp <= 0 || !ms.some(m => m.hp > 0)) break;
  }
  state.order = null; state.cur = -1;
  const going = p.hp > 0 && ms.some(m => m.hp > 0);
  endRound([p], going);
  if (going) { state.turn++; state.busy = false; }
  render(); checkEnd();
}

function endGame(won) {
  state.over = true;
  if (!won) sfx("lose");
  $("result-title").textContent = won ? "🎉 Chiến thắng!" : "💀 Thất bại";
  const floor = state.monsterIndex + 1, best = saveBest(floor);
  $("result-text").textContent = won
    ? "Bạn đã hạ cả " + state.kills + " quái, đạt cấp " + state.player.level + " sau " + state.turn + " lượt."
    : "Bạn gục ngã ở tầng " + floor + " (cấp " + state.player.level + ", hạ " + state.kills + " quái). Kỷ lục: tầng " + best + ".";
  setTimeout(() => $("overlay").classList.add("show"), 500);
  render();
  return true;
}

