/* js/entities.js — Tạo thực thể: mkPlayer, newGame, bảng quái MT và spawnGroup() sinh nhóm quái theo tầng/cấp. */

function mkPlayer(name, cls) {
  const C = CLASSES[cls];
  return { name, cls, maxHp: C.hp, hp: C.hp, atkMin: C.a[0], atkMax: C.a[1], critChance: C.crit, evasion: C.eva, res: RES_BASE[cls] ?? 0, defendReduce: C.red,
           maxMana: C.mana, mana: C.mana, regen: C.rg ?? 6, spd: C.spd, luck: C.luck, critDmg: C.cd, defending: false, fx: {}, st: {}, level: 1, xp: 0, xpToNext: CONFIG.levelUp.baseXp,
           equipment: { weapon: null, armor: null, charm: null }, bag: [], gbag: [], gold: CONFIG.gold.start, pending: 0, cds: [0, 0, 0, 0, 0], act: null, tg: 0, picked: false, offers: [],
           evoStage: [0, 0, 0, 0, 0], evoProg: mkEvoProg(), evoQueue: [] };
}

/* Mỗi lần lên cấp: máu / sát thương tăng theo class (CLASSES[x].lv), không khai báo thì dùng CONFIG.levelUp */
const xpNeed = lv => { const U = CONFIG.levelUp; return Math.round(U.baseXp + (lv - 1) * U.xpPerLevel + (lv - 1) * (lv - 1) * (U.xpPerLevel2 || 0)); };   // XP cần để lên từ cấp lv → lv+1
function lvGain(p) { const g = (CLASSES[p.cls] || {}).lv || {}, U = CONFIG.levelUp; return { hp: g.hp ?? U.hp, atk: g.atk ?? U.atk }; }

function newGame() {
  gameId++;
  state = { turn: 1, busy: false, over: false, mode: "solo", kills: 0, monsterIndex: 0, step: 0, zone: 1,   /* zone: khu vực hiện tại trong tầng, 1..CONFIG.map.zones; = zones+1 là phòng boss */
           
            player: mkPlayer(CLASSES[myClass].name, myClass), monsters: spawnGroup(0) };
  state.player.bag = Array.from({ length: CONFIG.solo.startPotions }, () => ({ k: "hp", r: 0 }));   // solo: bắt đầu với vài Thuốc máu
}

/* ----- QUÁI: 3 cỡ. Nhỏ (s) hay xuất hiện 1~4 con, vừa (m) ít hơn, to (l) hiếm ----- */
const MT = {
  s: [{ n: "Slime", a: "🟢", sprite: "slime", hp: 30, lo: 3, hi: 6, xp: 10, spd: 6 }, { n: "Dơi Đêm", a: "🦇", sprite: "bat", hp: 24, lo: 4, hi: 7, xp: 12, ev: .15, spd: 16 }, { n: "Chuột Cống", a: "🐀", hp: 28, lo: 3, hi: 7, xp: 11, spd: 12 }],
  m: [{ n: "Goblin", a: "👺", hp: 85, lo: 9, hi: 13, xp: 40, spd: 11 }, { n: "Sói Xám", a: "🐺", hp: 100, lo: 10, hi: 15, xp: 48, spd: 15 }, { n: "Xương Binh", a: "💀", hp: 90, lo: 10, hi: 14, xp: 44, spd: 8 }],
  l: [{ n: "Ogre", a: "👹", hp: 230, lo: 17, hi: 24, xp: 100, spd: 5 }, { n: "Troll", a: "🧌", hp: 260, lo: 18, hi: 26, xp: 115, spd: 6 }]
};
let MID = 0;
/* plv = cấp người chơi (co-op: cấp trung bình). Cấp quái bám theo cấp người chơi: thường +0~1, tinh anh +1~2, trùm +2~3 */
/* Loại đợt cuối của tầng: "boss" (tầng 5, 10...) · "mini" (boss phụ, tầng 3, 8...) · true (tinh anh, các tầng còn lại) */
const finalKind = floor => floor % CONFIG.bossEvery === 0 ? "boss" : floor % CONFIG.bossEvery === CONFIG.miniBossAt ? "mini" : true;
/* step: 0 = đợt 1 · 1 = đợt 2 · 2 = chọn phòng · 3 = đợt 3 (đợt cuối) */
const waveTxt = st => st === 2 ? "Phòng" : "Đợt " + (st === 3 ? 3 : st + 1) + "/3";
/* elite: false (thường) | true (tinh anh) | "mini" (boss phụ) | "boss" (boss chính) */
function spawnGroup(i, elite = false, coop = false, plv = 1) {
  const floor = i + 1, pick = a => a[rand(0, a.length - 1)], scale = lv => 1 + CONFIG.lvScale * (lv - 1) + CONFIG.lvScale2 * (lv - 1) * (lv - 1);   // hệ số chỉ số theo CẤP quái
  const S = coop ? null : CONFIG.solo, fs = S ? 1 + S.floorScale * (floor - 1) : 1 + COOP_FLOOR * (floor - 1);   // solo: quái yếu hơn một chút nhưng mạnh dần theo tầng
  const mk = (sz, b, el, boss, mini) => { const lv = Math.max(1, plv + (boss || mini ? rand(2, 3) : el ? rand(1, 2) : rand(0, 1))), q = scale(lv) * (el ? 1.35 : 1) * (mini ? 1.25 : 1),
      mh = S ? S.hp * fs * (boss ? S.bossHp : 1) * (el ? S.eliteMul : 1) : COOP_HP * fs * (boss ? COOP_BOSS_HP : 1), c = S ? S.atk * fs * (boss ? S.bossAtk : 1) * (el ? S.eliteMul : 1) : COOP_ATK * fs * (boss ? COOP_BOSS_ATK : 1),
      h = Math.round(b.hp * q * mh);
    return { id: ++MID, lv, size: sz, elite: !!el, boss: !!boss, mini: !!mini, name: (mini ? "Thủ lĩnh " : el ? "Tinh anh " : "") + b.n, avatar: b.a, sprite: b.sprite, maxHp: h, hp: h, evasion: b.ev ?? 0.05, spd: Math.round((b.spd ?? 10) * Math.min(1.4, 1 + 0.01 * (lv - 1)) * (el ? 1.15 : 1)),
             atkMin: Math.round(b.lo * q * c), atkMax: Math.round(b.hi * q * c), xp: Math.round(b.xp * q * (S ? S.xp : COOP_XP)), ...mkSk(b.n, boss, el), res: Math.min(.7, (sz === "m" ? .1 : sz === "l" ? .2 : 0) + (el ? .1 : 0) + (boss ? .15 : 0)) }; };
  const g = [], B = CONFIG.boss;
  if (elite === "boss") {
    g.push(mk("l", { n: B.name, a: B.avatar, hp: B.maxHp, lo: B.atkMin, hi: B.atkMax, xp: B.xp, ev: B.evasion, spd: B.spd }, false, true));
    for (let j = rand(0, 2); j > 0; j--) g.push(mk("s", pick(MT.s)));
  } else if (elite === "mini") {   // boss phụ: quái to, mạnh hơn tinh anh, kèm 1~2 quái nhỏ
    g.push(mk("l", pick(MT.l), true, false, true));
    for (let j = rand(1, 2); j > 0; j--) g.push(mk("s", pick(MT.s)));
  } else if (elite) {
    const sz = Math.random() < .5 ? "m" : "l"; g.push(mk(sz, pick(MT[sz]), true));
    if (Math.random() < .5) g.push(mk("s", pick(MT.s)));
  } else {
    const r = floor < 3 ? Math.random() * .6 : Math.random();
    if (r < .6) for (let j = rand(1, 4); j > 0; j--) g.push(mk("s", pick(MT.s)));
    else if (r < .9) { for (let j = rand(1, 2); j > 0; j--) g.push(mk("m", pick(MT.m))); if (Math.random() < .5) g.push(mk("s", pick(MT.s))); }
    else { g.push(mk("l", pick(MT.l))); if (Math.random() < .5) g.push(mk("s", pick(MT.s))); }
  }
  return g;
}

