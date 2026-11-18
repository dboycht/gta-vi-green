/* =====================================================
 * GTA VI 绿色纯净版 —— 2D 俯视角迷你 GTA
 * 世界/素材/音效全部程序化生成，无任何外部资源
 * 依赖：installer.js 的 $、el、Audio
 * ===================================================== */
"use strict";

/* ================= 基础工具 ================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= 存档 ================= */
const SAVE_KEY = "gtaViGreenSaveV1";
const Save = {
  data: { ch: 1, free: false, packages: Array(10).fill(false),
          money: 0, stats: { peds: 0, busted: 0, passed: 0, time: 0 } },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* 私密模式等：无存档也能玩 */ }
    return this.data;
  },
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) {}
  },
  reset() {
    this.data = { ch: 1, free: false, packages: Array(10).fill(false),
                  money: 0, stats: { peds: 0, busted: 0, passed: 0, time: 0 } };
    this.write();
  },
};
Save.load();

/* ================= 世界常量 ================= */
const ROAD = 90, BW = 300, BH = 240, COLS = 6, ROWS = 5;
const WORLD_W = COLS * BW + (COLS + 1) * ROAD;   /* 2430 */
const WORLD_H = ROWS * BH + (ROWS + 1) * ROAD;   /* 1740 */
const VX = Array.from({ length: COLS + 1 }, (_, i) => ROAD / 2 + i * (BW + ROAD));
const HY = Array.from({ length: ROWS + 1 }, (_, j) => ROAD / 2 + j * (BH + ROAD));
const SPAWN = { x: VX[3], y: HY[3], a: -Math.PI / 2 };  /* 车头朝上：↑ 就是往屏幕上方开 */

const PARKS = [[1, 1], [4, 2]];
const PARKING = [2, 3];
const DOCK = [5, 4];

/* 10 个隐藏包裹 */
const PACKAGE_SPOTS = [
  [215, 322], [1050, 178], [2320, 342], [622, 902], [1468, 702],
  [1798, 1078], [332, 1498], [938, 1618], [1882, 498], [2248, 1562],
];

const ROOF_COLORS = ["#8f959e", "#9aa0a8", "#7d8894", "#a8a29a",
                     "#6e7a86", "#98a0aa", "#8c6f62", "#7e8a7e"];
const CAR_COLORS = ["#c0392b", "#2980b9", "#27ae60", "#f39c12",
                    "#8e44ad", "#16a085", "#d35400", "#7f8c8d"];

/* ================= 世界数据 ================= */
const World = {
  buildings: [], trees: [], lamps: [], parkedCars: [],
  packages: [], money: [],
  gen() {
    const rng = mulberry32(20261110);
    this.buildings = []; this.trees = []; this.lamps = []; this.parkedCars = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const bx = ROAD + c * (BW + ROAD), by = ROAD + r * (BH + ROAD);
      if (PARKS.some(([pc, pr]) => pc === c && pr === r)) {
        const n = 7 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++)
          this.trees.push({ x: bx + 26 + rng() * (BW - 52), y: by + 26 + rng() * (BH - 52),
                            r: 13 + rng() * 10, tone: rng() });
        continue;
      }
      if (PARKING[0] === c && PARKING[1] === r) {
        for (let k = 0; k < 5; k++) {
          const px = bx + 30 + k * 52, py = by + 40 + (k % 2) * 120;
          this.parkedCars.push({ x: px, y: py, w: 40, h: 20, color: CAR_COLORS[k % CAR_COLORS.length] });
        }
        continue;
      }
      if (DOCK[0] === c && DOCK[1] === r) continue; /* 码头：无建筑 */
      const m = 16;
      const ix = bx + m, iy = by + m, iw = BW - 2 * m, ih = BH - 2 * m;
      const pattern = rng();
      const put = (x, y, w, h) => {
        const col = ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)];
        const b = { x, y, w, h, color: col, seed: rng(), tower: w * h > 30000 && rng() < 0.4 };
        this.buildings.push(b);
      };
      if (pattern < 0.35) put(ix, iy, iw, ih);
      else if (pattern < 0.6) { /* 竖切 */
        const s = iw * (0.35 + rng() * 0.25);
        put(ix, iy, s - 6, ih); put(ix + s + 6, iy, iw - s - 6, ih);
      } else if (pattern < 0.85) { /* 横切 */
        const s = ih * (0.35 + rng() * 0.25);
        put(ix, iy, iw, s - 6); put(ix, iy + s + 6, iw, ih - s - 6);
      } else { /* L 形 */
        put(ix, iy, iw, ih * 0.45); put(ix, iy + ih * 0.45 + 6, iw * 0.55, ih * 0.55 - 6);
      }
    }
    /* 路灯：路口四角 */
    for (const x of VX) for (const y of HY)
      this.lamps.push({ x: x - 34, y: y - 34 }, { x: x + 34, y: y + 34 });
    /* 包裹 */
    this.packages = PACKAGE_SPOTS.map(([x, y]) => ({ x, y, got: false }));
    this.nudgePackages();
    this.spawnMoney();
  },
  nudgePackages() {
    for (const p of this.packages) {
      for (let tries = 0; tries < 40; tries++) {
        let inside = false;
        for (const b of this.buildings)
          if (p.x > b.x - 16 && p.x < b.x + b.w + 16 && p.y > b.y - 16 && p.y < b.y + b.h + 16) { inside = true; break; }
        if (!inside) break;
        p.y += 26; /* 往下推到人行道 */
        if (p.y > WORLD_H - 40) { p.y = 40; p.x = (p.x + 390) % (WORLD_W - 80); }
      }
    }
  },
  spawnMoney() {
    this.money = [];
    const rng = mulberry32(777);
    for (let k = 0; k < 8; k++) {
      const x = VX[Math.floor(rng() * VX.length)] + (rng() * 60 - 30);
      const y = 100 + rng() * (WORLD_H - 200);
      this.money.push({ x, y, got: false, respawn: 0, seed: rng() });
    }
  },
  /* 码头大门（M4 终点） */
  dockGate() { return { x: ROAD + DOCK[0] * (BW + ROAD) + BW / 2, y: ROAD + DOCK[1] * (BH + ROAD) + 20 }; },
};
World.gen();

/* ================= 游戏状态 ================= */
const G = {
  state: "off",          /* off|splash|menu|howto|game|ended */
  paused: false,
  frozen: false,         /* BUSTED / 过场时锁输入 */
  chapter: 0,            /* 当前章节索引 0..4，-1 = 自由模式 */
  freeMode: false,
  mission: null,
  money: Save.data.money,
  wanted: 0,
  evadeT: 0,
  bustedT: 0,
  stats: null,
  time: 0,
  rainbow: false,
};
const player = { x: SPAWN.x, y: SPAWN.y, angle: 0, vx: 0, vy: 0, speed: 0, honkT: 0 };
const cam = { x: SPAWN.x, y: SPAWN.y };
let traffic = [], peds = [], police = [], particles = [], decals = [];
let keys = new Set();
let bigText = null;      /* {text, sub, color, t, dur, hold} */
let messages = [];
let freezeTimer = 0;
let shake = 0;
let crashCd = 0;

/* ================= 音频（游戏部分） ================= */
const GameAudio = {
  engineOsc: null, engineGain: null, sirenIv: null, skidT: 0,
  engineStart() {
    if (!Audio.ctx || this.engineOsc) return;
    const o = Audio.ctx.createOscillator(), g = Audio.ctx.createGain();
    const f = Audio.ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = 50;
    f.type = "lowpass"; f.frequency.value = 420;
    g.gain.value = 0.0;
    o.connect(f); f.connect(g); g.connect(Audio.master);
    o.start();
    this.engineOsc = o; this.engineGain = g;
  },
  engineUpdate(speed, throttle) {
    if (!this.engineOsc) return;
    const t = Audio.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(46 + Math.abs(speed) * 0.30, t, 0.06);
    this.engineGain.gain.setTargetAtTime(0.045 + throttle * 0.05, t, 0.1);
  },
  engineStop() {
    if (!this.engineOsc) return;
    try { this.engineOsc.stop(); } catch (e) {}
    this.engineOsc = null; this.engineGain = null;
  },
  sirenStart() {
    if (!Audio.ctx || this.sirenIv) return;
    let hi = false;
    this.sirenIv = setInterval(() => {
      Audio.beep(hi ? 920 : 660, 0.28, "square", 0.06);
      hi = !hi;
    }, 340);
  },
  sirenStop() { if (this.sirenIv) { clearInterval(this.sirenIv); this.sirenIv = null; } },
  crash() { Audio.noise(0.22, 0.3, 900); Audio.beep(90, 0.18, "sine", 0.3, 40); },
  skid() { Audio.noise(0.12, 0.1, 1600); },
  pickup() { Audio.beep(880, 0.07, "square", 0.16); setTimeout(() => Audio.beep(1318, 0.1, "square", 0.16), 70); },
  package() { [660, 880, 1100, 1318].forEach((f, i) => setTimeout(() => Audio.beep(f, 0.12, "square", 0.15), i * 90)); },
  wantedUp() { Audio.beep(220, 0.16, "square", 0.2); setTimeout(() => Audio.beep(220, 0.16, "square", 0.2), 200); },
  horn() { Audio.beep(220, 0.18, "square", 0.22); Audio.beep(277, 0.18, "square", 0.16); },
  passed() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => Audio.beep(f, 0.16, "square", 0.18), i * 110)); },
  failed() { [400, 340, 280, 210].forEach((f, i) => setTimeout(() => Audio.beep(f, 0.2, "sawtooth", 0.16), i * 140)); },
  busted() { [330, 262, 220, 165].forEach((f, i) => setTimeout(() => Audio.beep(f, 0.26, "square", 0.2), i * 170)); },
};

/* ================= 任务定义 ================= */
const CHAPTER_INFO = [
  { name: "序章 · 拿照上路", badge: "#3ca23c" },
  { name: "第一章 · 热辣披萨", badge: "#e67e22" },
  { name: "第二章 · 甩掉尾巴", badge: "#2980b9" },
  { name: "第三章 · 包裹风暴", badge: "#8e44ad" },
  { name: "终章 · 黎明大逃亡", badge: "#c0392b" },
];

const MISSIONS = {
  m0: {
    title: "拿照上路", reward: 100,
    brief: "开着你的破车，依次通过 3 个检查点。别撞楼。",
    start(m) { m.route = [[VX[2], HY[1]], [VX[1], HY[3]], [VX[3], HY[3]]]; m.step = 0; },
    objective(m) { return m.step === m.route.length ? "返回中央大道" : `通过第 ${m.step + 1} 个检查点（黄色箭头）`; },
    target(m) { return m.route[m.step] || null; },
    update(m, dt) {
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < 55) {
        m.step++;
        GameAudio.pickup();
        if (m.step === 1) msg("很好！按住 ↑ 油门，← → 转向。");
        if (m.step === 2) msg("漂亮。空格是手刹，弯道漂移很好用。");
        if (m.step === 3) msg("最后一段！按 H 可以按喇叭吓路人。");
        if (m.step >= m.route.length) passMission();
      }
    },
  },
  m1: {
    title: "热辣披萨", reward: 240, timeLimit: 100,
    brief: "三个街区点了披萨。100 秒内全部送达，凉了顾客会打差评。",
    start(m) { m.route = [[VX[1], HY[1]], [VX[5], HY[2]], [VX[3], HY[4]]]; m.step = 0; m.timer = this.timeLimit; },
    objective(m) { return `送出披萨 ${m.step}/3 · 剩余 ${Math.ceil(m.timer)} 秒`; },
    target(m) { return m.route[m.step] || null; },
    update(m, dt) {
      m.timer -= dt;
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < 55) {
        m.step++; GameAudio.pickup(); G.money += 80;
        msg("披萨送达 +$80");
        if (m.step < 3) msg(`下一单已标记，快！`);
        else passMission();
      }
      if (m.timer <= 0) return failMission("披萨全凉了。顾客给了 1 星差评。");
    },
  },
  m2: {
    title: "甩掉尾巴", reward: 180,
    brief: "你撞了不该撞的人。甩掉 2 星通缉：拉开 400 米以上，坚持几秒。",
    start(m) { setWanted(2); },
    objective(m) { return `当前通缉 ${"★".repeat(G.wanted) || "无"} · 甩掉所有警车`; },
    target(m) { return null; },
    update(m, dt) { if (G.wanted === 0) passMission(); },
  },
  m3: {
    title: "包裹风暴", reward: 260, failOnBusted: true,
    brief: "收 5 个包裹。巡逻警车就在附近，被抓住任务直接失败。",
    start(m) {
      m.step = 0;
      m.route = World.packages.slice(0, 5).map((p) => [p.x, p.y]);
      setWanted(1);
    },
    objective(m) { return `收集包裹 ${m.step}/5 · ${"★".repeat(G.wanted) || "无通缉"}`; },
    target(m) { return m.route[m.step] || null; },
    update(m, dt) {
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < 30) {
        m.step++; GameAudio.package(); msg("包裹到手");
        World.packages[m.step - 1].got = true;
      }
      if (m.step >= 5) passMission();
    },
  },
  m4: {
    title: "黎明大逃亡", reward: 0, failOnBusted: true,
    brief: "5 星通缉！穿过全城开到码头，赶上黎明那班渡轮。",
    start(m) {
      m.route = [[VX[1], HY[2]], [VX[2], HY[3]], [VX[4], HY[2]], [VX[4], HY[4]]];
      m.step = 0;
      const g = World.dockGate();
      m.route.push([g.x, g.y]);
      setWanted(5);
    },
    objective(m) { return `逃亡路线 ${m.step}/${m.route.length} · ${"★".repeat(G.wanted)} 通缉`; },
    target(m) { return m.route[m.step] || null; },
    update(m, dt) {
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < (m.step === m.route.length - 1 ? 60 : 55)) {
        m.step++; GameAudio.pickup();
        if (m.step === m.route.length) startEnding();
        else msg(m.step === m.route.length - 1 ? "码头就在前方！冲！" : "继续，别恋战！");
      }
    },
  },
};

/* 自由模式任务生成器 */
const FREE_TYPES = [
  () => ({
    title: "自由 · 快送", reward: 120, timeLimit: 75,
    brief: "限时送达 2 个地点。",
    start(m) {
      m.route = [rndIntersection(), rndIntersection()];
      m.step = 0; m.timer = this.timeLimit;
    },
    objective(m) { return `送达 ${m.step}/2 · 剩余 ${Math.ceil(m.timer)} 秒`; },
    target(m) { return m.route[m.step] || null; },
    update(m, dt) {
      m.timer -= dt;
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < 55) { m.step++; GameAudio.pickup(); G.money += 40; }
      if (m.step >= 2) return passMission();
      if (m.timer <= 0) return failMission("超时了。自由世界的配送也要讲信誉。");
    },
  }),
  () => ({
    title: "自由 · 甩警察", reward: 140,
    brief: "2 星通缉已到账。甩掉他们，拿走辛苦费。",
    start(m) { setWanted(2); },
    objective(m) { return `甩掉所有警车（当前 ${"★".repeat(G.wanted) || "无"}）`; },
    target(m) { return null; },
    update(m) { if (G.wanted === 0) passMission(); },
  }),
  () => ({
    title: "自由 · 收破烂", reward: 110,
    brief: "城里有 3 个包裹无人认领。先到先得。",
    start(m) {
      m.step = 0;
      const pool = World.packages.filter((p) => !p.got);
      m.route = pool.length >= 3
        ? pool.slice(0, 3).map((p) => [p.x, p.y])
        : [rndIntersection(), rndIntersection(), rndIntersection()];
    },
    objective(m) { return `收集 ${m.step}/3`; },
    target(m) { return m.route[m.step] || null; },
    update(m) {
      const t = this.target(m);
      if (t && dist(player.x, player.y, t[0], t[1]) < 30) { m.step++; GameAudio.package(); }
      if (m.step >= 3) passMission();
    },
  }),
];
function rndIntersection() {
  const x = VX[Math.floor(Math.random() * VX.length)];
  const y = HY[Math.floor(Math.random() * HY.length)];
  return [x, y];
}

/* ================= 任务控制流 ================= */
function startChapter(idx) {
  G.freeMode = false;
  G.state = "game";
  G.paused = false;
  $("#menu").classList.remove("show");
  $("#pause").classList.remove("show");
  $("#ending").classList.remove("show");
  G.chapter = idx;
  resetRun();
  const def = MISSIONS["m" + idx];
  G.mission = { def, data: {}, state: "active", introT: 2.4 };
  def.start(G.mission.data);
  bigText = { text: CHAPTER_INFO[idx].name, sub: def.brief, color: "#ffd257", t: 0, dur: 3.0 };
  Save.data.ch = Math.max(Save.data.ch, idx + 1);
  Save.write();
}
function startFree() {
  G.freeMode = true;
  G.state = "game";
  G.paused = false;
  $("#menu").classList.remove("show");
  $("#pause").classList.remove("show");
  G.chapter = -1;
  resetRun();
  newFreeMission();
}
function newFreeMission() {
  const def = FREE_TYPES[Math.floor(Math.random() * FREE_TYPES.length)]();
  G.mission = { def, data: {}, state: "active", introT: 2.0 };
  def.start(G.mission.data);
  bigText = { text: def.title, sub: def.brief, color: "#7ee0ff", t: 0, dur: 2.4 };
}
function passMission() {
  const m = G.mission;
  if (!m || m.state !== "active") return;
  m.state = "passed";
  const rw = m.def.reward || 0;
  G.money += rw;
  Save.data.stats.passed++;
  Save.data.money = G.money;
  GameAudio.passed();
  bigText = { text: "MISSION PASSED!", sub: rw ? `奖励 +$${rw}` : "干净利落", color: "#6fd06f", t: 0, dur: 2.6 };
  if (G.freeMode) {
    setTimeout(() => { if (G.mission === m) newFreeMission(); }, 3200);
  } else if (G.chapter < 4) {
    Save.data.ch = Math.max(Save.data.ch, G.chapter + 2);
    Save.write();
    setTimeout(() => { if (G.mission === m) startChapter(G.chapter + 1); }, 3400);
  }
}
function failMission(reason) {
  const m = G.mission;
  if (!m || m.state !== "active") return;
  m.state = "failed";
  GameAudio.failed();
  bigText = { text: "MISSION FAILED", sub: `${reason}（按 R 重试 · Enter 回主菜单）`, color: "#e05555", t: 0, dur: 99 };
  G.frozen = false;
}
function retryChapter() {
  if (G.freeMode) { const f = G.freeMode; startFree(); G.freeMode = f; return; }
  startChapter(G.chapter);
}
function setWanted(n) {
  n = clamp(n, 0, 5);
  if (n > G.wanted) GameAudio.wantedUp();
  G.wanted = n;
  G.evadeT = 0;
  syncPolice();
}
function syncPolice() {
  while (police.length < G.wanted) spawnPolice();
  while (police.length > G.wanted) police.pop();
}
function spawnPolice() {
  let x, y, tries = 0;
  do {
    const t = rndIntersection();
    x = t[0]; y = t[1];
  } while (dist(x, y, player.x, player.y) < 480 && ++tries < 30);
  police.push({ x, y, angle: Math.random() * TAU, speed: 0, stuckT: 0, revT: 0 });
}
function doBusted() {
  GameAudio.busted();
  GameAudio.sirenStop();
  G.frozen = true;
  G.bustedT = 0;
  bigText = { text: "BUSTED", sub: "罚款 -$150", color: "#e05555", t: 0, dur: 2.4 };
  G.money = Math.max(0, G.money - 150);
  Save.data.stats.busted++;
  setTimeout(() => {
    player.x = SPAWN.x; player.y = SPAWN.y; player.vx = player.vy = 0;
    player.angle = SPAWN.a;
    cam.x = player.x; cam.y = player.y;
    setWanted(0);
    G.frozen = false;
    if (G.mission && G.mission.state === "active" && G.mission.def.failOnBusted)
      failMission("被捕了，任务作废。");
  }, 2500);
}
function startEnding() {
  const m = G.mission;
  m.state = "passed";
  G.frozen = true;
  GameAudio.passed();
  /* 渐黑进结局 */
  const fade = $("#g-fade");
  fade.classList.add("on");
  setTimeout(() => {
    fade.classList.remove("on");
    G.state = "ended";
    Save.data.free = true;
    Save.data.ch = 5;
    Save.data.money = G.money;
    Save.write();
    showEnding();
    $("#ending").classList.add("show");
  }, 1600);
  bigText = { text: "MISSION PASSED!", sub: "你赶上了那班渡轮。", color: "#6fd06f", t: 0, dur: 3 };
}
function resetRun() {
  police = []; particles = []; decals = []; messages = [];
  G.wanted = 0; G.evadeT = 0; G.frozen = false; bigText = null;
  World.packages.forEach((p) => (p.got = Save.data.packages[World.packages.indexOf(p)] || false));
  World.spawnMoney();
  traffic = spawnTraffic();
  peds = spawnPeds();
  player.x = SPAWN.x; player.y = SPAWN.y; player.angle = SPAWN.a;
  player.vx = player.vy = 0;
  cam.x = player.x; cam.y = player.y;
}

/* ================= 实体生成 ================= */
function spawnTraffic() {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const cars = [];
  for (let k = 0; k < 12; k++) {
    const axis = rng() < 0.5 ? "v" : "h";
    const road = Math.floor(rng() * (axis === "v" ? VX.length : HY.length));
    const dir = rng() < 0.5 ? 1 : -1;
    const c = {
      axis, road, dir,
      speed: 0, baseSpeed: 80 + rng() * 50,
      color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      taxi: rng() < 0.18, x: 0, y: 0, angle: 0,
    };
    if (axis === "v") {
      c.x = VX[road] + (dir > 0 ? -20 : 20);
      c.y = 80 + rng() * (WORLD_H - 160);
      c.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      c.y = HY[road] + (dir > 0 ? 20 : -20);
      c.x = 80 + rng() * (WORLD_W - 160);
      c.angle = dir > 0 ? 0 : Math.PI;
    }
    if (dist(c.x, c.y, player.x, player.y) > 220) cars.push(c);
  }
  return cars;
}
function spawnPeds() {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const list = [];
  for (let k = 0; k < 26; k++) {
    const c = Math.floor(rng() * COLS), r = Math.floor(rng() * ROWS);
    const bx = ROAD + c * (BW + ROAD), by = ROAD + r * (BH + ROAD);
    const side = Math.floor(rng() * 4), t = rng();
    let x, y;
    if (side === 0) { x = bx + t * BW; y = by + 7; }
    else if (side === 1) { x = bx + t * BW; y = by + BH - 7; }
    else if (side === 2) { x = bx + 7; y = by + t * BH; }
    else { x = bx + BW - 7; y = by + t * BH; }
    list.push({
      x, y, tx: x, ty: y, color: `hsl(${Math.floor(rng() * 360)},55%,55%)`,
      skin: ["#e8b88a", "#c68d5c", "#8a5a3a", "#f0d0b0"][Math.floor(rng() * 4)],
      down: false, downT: 0, bob: rng() * TAU,
    });
  }
  return list;
}
function pedNewTarget(p) {
  const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
  const bx = ROAD + c * (BW + ROAD), by = ROAD + r * (BH + ROAD);
  const side = Math.floor(Math.random() * 4), t = Math.random();
  if (side === 0) { p.tx = bx + t * BW; p.ty = by + 7; }
  else if (side === 1) { p.tx = bx + t * BW; p.ty = by + BH - 7; }
  else if (side === 2) { p.tx = bx + 7; p.ty = by + t * BH; }
  else { p.tx = bx + BW - 7; p.ty = by + t * BH; }
}

/* ================= 碰撞 ================= */
function circleRect(px, py, r, rc) {
  const cx = clamp(px, rc.x, rc.x + rc.w), cy = clamp(py, rc.y, rc.y + rc.h);
  let dx = px - cx, dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 < 0.0001) {
    /* 圆心在矩形内：沿最短边推出 */
    const l = px - rc.x, rr = rc.x + rc.w - px, t = py - rc.y, b = rc.y + rc.h - py;
    const m = Math.min(l, rr, t, b);
    if (m === l) return { nx: -1, ny: 0, pen: l + r };
    if (m === rr) return { nx: 1, ny: 0, pen: rr + r };
    if (m === t) return { nx: 0, ny: -1, pen: t + r };
    return { nx: 0, ny: 1, pen: b + r };
  }
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, pen: r - d };
}
function resolveObstacles(ent, r) {
  let hit = null;
  for (const b of World.buildings) {
    const h = circleRect(ent.x, ent.y, r, b);
    if (h) { ent.x += h.nx * h.pen; ent.y += h.ny * h.pen; hit = h; }
  }
  for (const pc of World.parkedCars) {
    const h = circleRect(ent.x, ent.y, r, pc);
    if (h) { ent.x += h.nx * h.pen; ent.y += h.ny * h.pen; hit = h; }
  }
  /* 世界边界 */
  if (ent.x < r) { ent.x = r; hit = { nx: 1, ny: 0, pen: 0 }; }
  if (ent.x > WORLD_W - r) { ent.x = WORLD_W - r; hit = { nx: -1, ny: 0, pen: 0 }; }
  if (ent.y < r) { ent.y = r; hit = { nx: 0, ny: 1, pen: 0 }; }
  if (ent.y > WORLD_H - r) { ent.y = WORLD_H - r; hit = { nx: 0, ny: -1, pen: 0 }; }
  return hit;
}

/* ================= 玩家物理 ================= */
function updatePlayer(dt) {
  const up = keys.has("ArrowUp") || keys.has("KeyW");
  const down = keys.has("ArrowDown") || keys.has("KeyS");
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const hb = keys.has("Space");
  const fx = Math.cos(player.angle), fy = Math.sin(player.angle);
  const rx = -fy, ry = fx;

  if (up) { player.vx += fx * 340 * dt; player.vy += fy * 340 * dt; }
  if (down) {
    const fwd = player.vx * fx + player.vy * fy;
    if (fwd > 0) { player.vx -= fx * 480 * dt; player.vy -= fy * 480 * dt; }
    else { player.vx -= fx * 200 * dt; player.vy -= fy * 200 * dt; }
  }
  /* 阻力 */
  const drag = up || down ? 0.4 : 1.6;
  player.vx -= player.vx * drag * dt;
  player.vy -= player.vy * drag * dt;

  /* 横向抓地（手刹漂移） */
  const f = player.vx * fx + player.vy * fy;
  const l = player.vx * rx + player.vy * ry;
  const grip = hb ? 1.6 : 9.0;
  const nl = l * Math.max(0, 1 - grip * dt);
  player.vx = fx * f + rx * nl;
  player.vy = fy * f + ry * nl;
  if (hb && Math.abs(l) > 90 && G.time - GameAudio.skidT > 0.13) {
    GameAudio.skidT = G.time;
    GameAudio.skid();
    decals.push({ x: player.x - fx * 12, y: player.y - fy * 12, r: 5, a: 0.3, type: "skid" });
  }

  /* 限速 */
  const sp = Math.hypot(player.vx, player.vy);
  if (sp > 250) { player.vx *= 250 / sp; player.vy *= 250 / sp; }

  /* 转向（原地也有基础转向力，GTA1 式坦克调头） */
  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  const dirSign = f >= 0 ? 1 : -1;
  const authority = clamp(Math.abs(f) / 130, 0.35, 1);
  player.angle += steer * 2.5 * authority * dirSign * dt;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const hit = resolveObstacles(player, 13);
  if (hit && sp > 90 && crashCd <= 0) {
    crashCd = 0.45;
    GameAudio.crash();
    shake = Math.min(shake + sp / 400, 1.2);
    for (let k = 0; k < 6; k++)
      particles.push({ x: player.x, y: player.y, vx: (Math.random() - .5) * 120,
                       vy: (Math.random() - .5) * 120, life: 0.5, r: 3 + Math.random() * 3,
                       color: "#c8c8c8" });
    player.vx *= 0.35; player.vy *= 0.35;
  }

  player.speed = Math.hypot(player.vx, player.vy);
  GameAudio.engineUpdate(player.speed, up ? 1 : 0);

  /* 漂移尾烟 */
  if (hb && sp > 100 && Math.random() < 0.4)
    particles.push({ x: player.x - fx * 14, y: player.y - fy * 14,
                     vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30,
                     life: 0.6, r: 4 + Math.random() * 3, color: "#999" });
}

/* ================= 交通 / 行人 / 警察 ================= */
function updateTraffic(dt) {
  for (const c of traffic) {
    /* 前车 / 玩家距离 → 跟车减速 */
    let ahead = 1e9;
    for (const o of traffic) {
      if (o === c || o.axis !== c.axis || o.dir !== c.dir) continue;
      const along = c.axis === "v" ? (o.y - c.y) * c.dir : (o.x - c.x) * c.dir;
      const side = c.axis === "v" ? Math.abs(o.x - c.x) : Math.abs(o.y - c.y);
      if (along > 0 && along < ahead && side < 30) ahead = along;
    }
    const pdNow = dist(player.x, player.y, c.x, c.y);
    if (pdNow < ahead) ahead = pdNow;
    const want = ahead < 95 ? clamp(ahead - 55, 15, c.baseSpeed) : c.baseSpeed;
    c.speed = lerp(c.speed, want, 3 * dt);
    const mv = c.speed * dt;

    if (c.axis === "v") {
      c.y += mv * c.dir;
      c.x = lerp(c.x, VX[c.road] + (c.dir > 0 ? -20 : 20), 2 * dt);
      c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      /* 路口：转弯 / 掉头 */
      for (let j = 0; j < HY.length; j++) {
        if (Math.abs(c.y - HY[j]) > 4.5) continue;
        const roll = Math.random();
        const from = c.road;
        if (roll < 0.16) {
          const nd = Math.random() < 0.5 ? 1 : -1;
          c.axis = "h"; c.dir = nd; c.road = j;
          c.x = VX[from];
          c.y = HY[j] + (nd > 0 ? 20 : -20);
        } else if (roll < 0.26) {
          c.dir = -c.dir;
          c.x = VX[from] + (c.dir > 0 ? -20 : 20);
        }
        break;
      }
      if (c.y < 25 || c.y > WORLD_H - 25) {
        c.dir = -c.dir;
        c.x = VX[c.road] + (c.dir > 0 ? -20 : 20);
      }
    } else {
      c.x += mv * c.dir;
      c.y = lerp(c.y, HY[c.road] + (c.dir > 0 ? 20 : -20), 2 * dt);
      c.angle = c.dir > 0 ? 0 : Math.PI;
      for (let i2 = 0; i2 < VX.length; i2++) {
        if (Math.abs(c.x - VX[i2]) > 4.5) continue;
        const roll = Math.random();
        const from = c.road;
        if (roll < 0.16) {
          const nd = Math.random() < 0.5 ? 1 : -1;
          c.axis = "v"; c.dir = nd; c.road = i2;
          c.x = VX[i2] + (nd > 0 ? -20 : 20);
          c.y = HY[from];
        } else if (roll < 0.26) {
          c.dir = -c.dir;
          c.y = HY[from] + (c.dir > 0 ? 20 : -20);
        }
        break;
      }
      if (c.x < 25 || c.x > WORLD_W - 25) {
        c.dir = -c.dir;
        c.y = HY[c.road] + (c.dir > 0 ? 20 : -20);
      }
    }
    /* 与玩家碰撞 */
    if (pdNow < 27 && !G.frozen) {
      const dx = player.x - c.x, dy = player.y - c.y, d = Math.max(pdNow, 0.01);
      player.x += (dx / d) * (27 - pdNow) * 0.6;
      player.y += (dy / d) * (27 - pdNow) * 0.6;
      c.x -= (dx / d) * (27 - pdNow) * 0.4;
      c.y -= (dy / d) * (27 - pdNow) * 0.4;
      if (player.speed > 130 && crashCd <= 0) { crashCd = 0.4; GameAudio.crash(); shake = 0.5; }
    }
  }
}
function updatePeds(dt) {
  for (const p of peds) {
    if (p.down) {
      p.downT -= dt;
      if (p.downT <= 0) { Object.assign(p, spawnPeds()[0] || p); }
      continue;
    }
    const d = dist(p.x, p.y, p.tx, p.ty);
    if (d < 5) { pedNewTarget(p); continue; }
    const sp = 34;
    p.x += ((p.tx - p.x) / d) * sp * dt;
    p.y += ((p.ty - p.y) / d) * sp * dt;
    const hit = circleRect(p.x, p.y, 5, { x: 0, y: 0, w: WORLD_W, h: WORLD_H });
    p.bob += dt * 9;
    /* 被玩家撞 */
    if (dist(p.x, p.y, player.x, player.y) < 16 && player.speed > 70) {
      p.down = true; p.downT = 6;
      decals.push({ x: p.x, y: p.y, r: 9, a: 0.5, type: "blood" });
      G.money = Math.max(0, G.money - 15);
      Save.data.stats.peds++;
      if (G.wanted < 5 && Math.random() < 0.7) setWanted(G.wanted + 1);
      msg("撞到路人 -$15，通缉升级");
      GameAudio.crash();
    }
  }
}
function updatePolice(dt) {
  if (G.wanted > 0 && !GameAudio.sirenIv) GameAudio.sirenStart();
  if (G.wanted === 0) GameAudio.sirenStop();
  let minD = 1e9;
  for (const p of police) {
    const d = dist(p.x, p.y, player.x, player.y);
    minD = Math.min(minD, d);
    const ta = Math.atan2(player.y - p.y, player.x - p.x);
    let da = ta - p.angle;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    p.angle += clamp(da, -3.2 * dt, 3.2 * dt);
    /* 卡住自救 */
    if (Math.abs(p.speed) < 25) p.stuckT += dt; else p.stuckT = 0;
    if (p.stuckT > 1.4) { p.revT = 0.8; p.stuckT = 0; }
    if (p.revT > 0) { p.revT -= dt; p.speed = lerp(p.speed, -80, 4 * dt); }
    else p.speed = lerp(p.speed, 205, 2.2 * dt);
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    resolveObstacles(p, 14);
    /* 贴身推挤：警车顶住玩家，保持接触 */
    const dNow = dist(p.x, p.y, player.x, player.y);
    if (dNow < 27 && !G.frozen) {
      const dx = player.x - p.x, dy = player.y - p.y, dd = Math.max(dNow, 0.01);
      p.x -= (dx / dd) * (27 - dNow) * 0.7;
      p.y -= (dy / dd) * (27 - dNow) * 0.7;
      player.x += (dx / dd) * (27 - dNow) * 0.3;
      player.y += (dy / dd) * (27 - dNow) * 0.3;
    }
    /* 拘捕判定：贴住不放就 BUSTED */
    if (dNow < 32 && !G.frozen) {
      G.bustedT += dt * (player.speed < 60 ? 3.2 : 0.9);
      if (G.bustedT > 0.85) { doBusted(); return; }
    }
  }
  if (G.bustedT > 0 && minD > 50) G.bustedT = Math.max(0, G.bustedT - dt * 2);
  /* 甩掉判定 */
  if (G.wanted > 0) {
    if (minD > 420) {
      G.evadeT += dt;
      if (G.evadeT > 4) { setWanted(G.wanted - 1); msg(G.wanted === 0 ? "成功甩掉警车！" : "甩掉一辆，继续跑！"); }
    } else G.evadeT = Math.max(0, G.evadeT - dt * 2);
  }
}

/* ================= 拾取物 ================= */
function updatePickups(dt) {
  for (const m of World.money) {
    if (m.got) {
      m.respawn -= dt;
      if (m.respawn <= 0) m.got = false;
      continue;
    }
    if (dist(m.x, m.y, player.x, player.y) < 22) {
      m.got = true; m.respawn = 16;
      G.money += 50;
      Save.data.money = G.money;
      GameAudio.pickup();
      msg("+$50");
      particles.push({ x: m.x, y: m.y, vx: 0, vy: -40, life: 0.5, r: 5, color: "#6fd06f" });
    }
  }
  for (let i = 0; i < World.packages.length; i++) {
    const p = World.packages[i];
    if (p.got || Save.data.packages[i]) continue;
    if (G.mission && G.mission.state === "active" && G.freeMode === false && G.chapter === 3 && i < 5) continue;
    if (dist(p.x, p.y, player.x, player.y) < 26) {
      p.got = true;
      Save.data.packages[i] = true;
      Save.write();
      GameAudio.package();
      const got = Save.data.packages.filter(Boolean).length;
      msg(`隐藏包裹 ${got}/10`);
      if (got === 10) { G.rainbow = true; Save.data.rainbow = true; Save.write(); msg("🏆 集齐 10 个包裹！获得彩虹车漆！"); }
    }
  }
}

/* ================= 渲染 ================= */
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
let DPR = 1;
function setupCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 1280 * DPR;
  canvas.height = 720 * DPR;
}
setupCanvas();

function drawScene(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  /* 镜头跟随 */
  const lookX = player.x + player.vx * 0.3, lookY = player.y + player.vy * 0.3;
  cam.x = lerp(cam.x, lookX, Math.min(1, 5 * dt));
  cam.y = lerp(cam.y, lookY, Math.min(1, 5 * dt));
  cam.x = clamp(cam.x, 640, WORLD_W - 640);
  cam.y = clamp(cam.y, 360, WORLD_H - 360);
  let sx = 0, sy = 0;
  if (shake > 0) {
    shake = Math.max(0, shake - dt * 2.5);
    sx = (Math.random() - .5) * 18 * shake;
    sy = (Math.random() - .5) * 18 * shake;
  }
  ctx.save();
  ctx.translate(640 - cam.x + sx, 360 - cam.y + sy);

  const vx0 = cam.x - 660, vy0 = cam.y - 380, vx1 = cam.x + 660, vy1 = cam.y + 380;

  /* 地面（沥青） */
  ctx.fillStyle = "#3b3f44";
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  /* 街区（人行道平台） */
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const bx = ROAD + c * (BW + ROAD), by = ROAD + r * (BH + ROAD);
    if (bx > vx1 || by > vy1 || bx + BW < vx0 || by + BH < vy0) continue;
    const park = PARKS.some(([pc, pr]) => pc === c && pr === r);
    const dock = DOCK[0] === c && DOCK[1] === r;
    const parking = PARKING[0] === c && PARKING[1] === r;
    ctx.fillStyle = park ? "#4e6b3e" : dock ? "#6b6257" : "#9aa0a6";
    ctx.fillRect(bx, by, BW, BH);
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.strokeRect(bx + .5, by + .5, BW - 1, BH - 1);
    if (park) {
      ctx.fillStyle = "#c9b98a";
      ctx.fillRect(bx + BW / 2 - 8, by, 16, BH);
      ctx.fillRect(bx, by + BH / 2 - 8, BW, 16);
    }
    if (dock) {
      ctx.strokeStyle = "rgba(0,0,0,.22)";
      for (let k = 1; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(bx, by + k * (BH / 8));
        ctx.lineTo(bx + BW, by + k * (BH / 8));
        ctx.stroke();
      }
      drawShip(bx + BW / 2, by + BH - 30);
    }
    if (parking) {
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.moveTo(bx + 22 + k * 50, by + 20);
        ctx.lineTo(bx + 22 + k * 50, by + 70);
        ctx.moveTo(bx + 22 + k * 50, by + 130);
        ctx.lineTo(bx + 22 + k * 50, by + 180);
        ctx.stroke();
      }
    }
  }
  /* 道路标线 */
  ctx.strokeStyle = "#d8b93a";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 18]);
  for (const x of VX) {
    if (x < vx0 - 4 || x > vx1 + 4) continue;
    ctx.beginPath(); ctx.moveTo(x, Math.max(0, vy0)); ctx.lineTo(x, Math.min(WORLD_H, vy1)); ctx.stroke();
  }
  for (const y of HY) {
    if (y < vy0 - 4 || y > vy1 + 4) continue;
    ctx.beginPath(); ctx.moveTo(Math.max(0, vx0), y); ctx.lineTo(Math.min(WORLD_W, vx1), y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  /* 树影 + 树 */
  for (const t of World.trees) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.arc(t.x + 5, t.y + 6, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = t.tone > .5 ? "#3f7a34" : "#4e8a3c";
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.beginPath(); ctx.arc(t.x - t.r / 3, t.y - t.r / 3, t.r / 2.4, 0, TAU); ctx.fill();
  }

  /* 车位上的停车 */
  for (const pc of World.parkedCars) drawCar(pc.x, pc.y, Math.PI / 2, pc.color, "civil", 0);

  /* 建筑阴影 + 屋顶 */
  for (const b of World.buildings) {
    if (b.x > vx1 || b.y > vy1 || b.x + b.w < vx0 || b.y + b.h < vy0) continue;
    ctx.fillStyle = "rgba(0,0,0,.26)";
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    ctx.strokeStyle = "rgba(0,0,0,.24)";
    ctx.strokeRect(b.x + 5.5, b.y + 5.5, b.w - 11, b.h - 11);
    /* 屋顶细节：由种子决定，稳定不闪 */
    const rng = mulberry32(Math.floor(b.seed * 1e9) | 1);
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const vw = 10 + rng() * 22, vh = 10 + rng() * 16;
      const vx2 = b.x + 10 + rng() * (b.w - 24 - vw);
      const vy2 = b.y + 10 + rng() * (b.h - 24 - vh);
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(vx2, vy2, vw, vh);
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.fillRect(vx2 + 1.5, vy2 + 1.5, vw - 3, vh - 3);
    }
    if (b.tower) {
      const tx = b.x + b.w / 2, ty = b.y + b.h / 2;
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath(); ctx.arc(tx + 3, ty + 4, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = "#7c6a58";
      ctx.beginPath(); ctx.arc(tx, ty, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.beginPath(); ctx.arc(tx, ty, 13, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#93826e";
      ctx.beginPath(); ctx.arc(tx, ty, 6, 0, TAU); ctx.fill();
    }
  }

  /* 地面贴片（血迹 / 胎痕） */
  for (const d of decals) {
    ctx.fillStyle = d.type === "blood" ? `rgba(120,20,20,${d.a})` : `rgba(20,20,20,${d.a})`;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
  }

  /* 拾取物 */
  const tt = G.time;
  for (const m of World.money) {
    if (m.got) continue;
    if (m.x < vx0 || m.x > vx1 || m.y < vy0 || m.y > vy1) continue;
    const bob = Math.sin(tt * 3 + m.seed * 9) * 2;
    ctx.fillStyle = "rgba(111,208,111,.22)";
    ctx.beginPath(); ctx.arc(m.x, m.y, 15 + bob, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3ca23c";
    ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("$", m.x, m.y + 1);
  }
  for (let i = 0; i < World.packages.length; i++) {
    const p = World.packages[i];
    const missionManaged = G.chapter === 3 && !G.freeMode && i < 5 &&
                           G.mission && G.mission.state === "active";
    if (missionManaged ? p.got : (p.got || Save.data.packages[i])) continue;
    if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
    const pulse = 0.55 + 0.25 * Math.sin(tt * 4 + i);
    const gr = ctx.createLinearGradient(p.x, p.y - 46, p.x, p.y + 8);
    gr.addColorStop(0, "rgba(126,224,255,0)");
    gr.addColorStop(1, `rgba(126,224,255,${pulse * .5})`);
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - 7, p.y - 46, 14, 54);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(tt * 1.6);
    ctx.fillStyle = "#c8a24a";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = "#5e4a1e";
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
    ctx.restore();
  }

  /* 行人 */
  for (const p of peds) {
    if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.down) { ctx.rotate(Math.PI / 2.2); ctx.globalAlpha = clamp(p.downT / 2, 0.2, 0.9); }
    const bob = p.down ? 0 : Math.sin(p.bob) * 1.4;
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.ellipse(2, 3, 8, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.fillRect(-6, -4, 12, 8 + bob * 0.3);
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(0, bob * 0.4, 4.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* 交通车 */
  for (const c of traffic) {
    if (c.x < vx0 - 40 || c.x > vx1 + 40 || c.y < vy0 - 40 || c.y > vy1 + 40) continue;
    drawCar(c.x, c.y, c.angle, c.taxi ? "#f1c40f" : c.color, c.taxi ? "taxi" : "civil", 0);
  }

  /* 警车 */
  for (const p of police) drawCar(p.x, p.y, p.angle, "#eef2f5", "police", tt);

  /* 玩家 */
  drawCar(player.x, player.y, player.angle,
          G.rainbow ? `hsl(${(tt * 90) % 360},80%,55%)` : "#c0392b", "player", tt);

  /* 粒子 */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.globalAlpha = clamp(p.life * 2, 0, 1) * 0.6;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* 目标标记 */
  const m0 = G.mission;
  if (m0 && m0.state === "active") {
    const t = m0.def.target(m0.data);
    if (t) {
      const pulse = 0.5 + 0.3 * Math.sin(tt * 5);
      ctx.strokeStyle = `rgba(255,210,87,${pulse + 0.3})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(t[0], t[1], 42 + pulse * 8, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1;
      const gr = ctx.createLinearGradient(t[0], t[1] - 70, t[0], t[1]);
      gr.addColorStop(0, "rgba(255,210,87,0)");
      gr.addColorStop(1, `rgba(255,210,87,${pulse * .6})`);
      ctx.fillStyle = gr;
      ctx.fillRect(t[0] - 8, t[1] - 70, 16, 70);
    }
  }

  ctx.restore();

  /* ---- 夜色 / 灯光（屏幕空间叠加） ---- */
  const dark = currentDarkness();
  if (dark > 0.02) {
    const [r, g2, b2] = currentTint();
    ctx.fillStyle = `rgba(${r},${g2},${b2},${dark})`;
    ctx.fillRect(0, 0, 1280, 720);
    if (dark > 0.3) {
      /* 街灯 */
      ctx.save();
      ctx.translate(640 - cam.x + sx, 360 - cam.y + sy);
      for (const lp of World.lamps) {
        if (lp.x < vx0 || lp.x > vx1 || lp.y < vy0 || lp.y > vy1) continue;
        const gr = ctx.createRadialGradient(lp.x, lp.y, 4, lp.x, lp.y, 85);
        gr.addColorStop(0, "rgba(255,220,150,.30)");
        gr.addColorStop(1, "rgba(255,220,150,0)");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(lp.x, lp.y, 85, 0, TAU); ctx.fill();
      }
      /* 车头灯 */
      drawHeadlight(player.x, player.y, player.angle);
      for (const c of traffic) drawHeadlight(c.x, c.y, c.angle);
      for (const p of police) drawHeadlight(p.x, p.y, p.angle);
      ctx.restore();
    }
    /* 雨丝（第三章） */
    if (G.chapter === 3 && !G.freeMode) {
      ctx.strokeStyle = "rgba(180,200,255,.25)";
      ctx.beginPath();
      for (let k = 0; k < 60; k++) {
        const rx = ((k * 97 + tt * 520) % 1320) - 20;
        const ry = ((k * 211 + tt * 900) % 780) - 30;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + 16);
      }
      ctx.stroke();
    }
  }

  drawHUD(tt, dt);
}

function drawShip(x, y) {
  ctx.fillStyle = "#2e2a38";
  ctx.fillRect(x - 90, y - 26, 180, 46);
  ctx.fillStyle = "#4a4458";
  ctx.fillRect(x - 70, y - 40, 34, 16);
  ctx.fillRect(x - 20, y - 40, 34, 16);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(x - 58, y - 20, 24, 12);
  ctx.fillStyle = "#2980b9";
  ctx.fillRect(x - 26, y - 20, 24, 12);
  ctx.fillStyle = "#f39c12";
  ctx.fillRect(x + 6, y - 20, 24, 12);
}
function drawCar(x, y, angle, color, type, tt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(-21, -9, 44, 22);
  const L = type === "truck" ? 52 : 42;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -11, L, 22, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.stroke();
  /* 车顶/挡风 */
  ctx.fillStyle = "rgba(10,14,20,.72)";
  ctx.beginPath();
  ctx.roundRect(-L * 0.16, -8, L * 0.34, 16, 3);
  ctx.fill();
  if (type === "taxi") {
    ctx.fillStyle = "#222";
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = "#ffd257";
    ctx.fillRect(-4, -3, 8, 6);
  }
  if (type === "police") {
    ctx.fillStyle = "#1e4fa0";
    ctx.fillRect(-L / 2 + 4, -11, 8, 22);
    ctx.fillRect(L / 2 - 12, -11, 8, 22);
    const ph = Math.floor(tt * 5) % 2;
    ctx.fillStyle = ph ? "#ff3b30" : "#2f6cff";
    ctx.fillRect(-5, -8, 4, 16);
    ctx.fillStyle = ph ? "#2f6cff" : "#ff3b30";
    ctx.fillRect(1, -8, 4, 16);
  }
  if (type === "player") {
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.fillRect(-L / 2 + 3, -9, L - 8, 3);
  }
  /* 车灯 */
  ctx.fillStyle = "#ffe9b0";
  ctx.fillRect(L / 2 - 3, -9, 3, 5);
  ctx.fillRect(L / 2 - 3, 4, 3, 5);
  ctx.fillStyle = "#c03028";
  ctx.fillRect(-L / 2, -9, 2.5, 5);
  ctx.fillRect(-L / 2, 4, 2.5, 5);
  ctx.restore();
}
function drawHeadlight(x, y, angle) {
  const fx = Math.cos(angle), fy = Math.sin(angle);
  const px = x + fx * 24, py = y + fy * 24;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  const gr = ctx.createLinearGradient(0, 0, 130, 0);
  gr.addColorStop(0, "rgba(255,235,170,.20)");
  gr.addColorStop(1, "rgba(255,235,170,0)");
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(130, -34); ctx.lineTo(130, 34); ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* 昼夜 */
function currentDarkness() {
  if (G.freeMode) return 0.34;
  return [0, 0.16, 0.52, 0.58, 0.30][G.chapter] || 0;
}
function currentTint() {
  if (G.freeMode) return [12, 16, 52];
  return [[255, 250, 235], [255, 150, 60], [8, 12, 44], [10, 14, 50], [255, 120, 90]][G.chapter] || [0, 0, 0];
}

/* ================= HUD ================= */
const FONT = '"PingFang SC","Microsoft YaHei",sans-serif';
function drawHUD(tt, dt) {
  /* 任务面板 */
  const m = G.mission;
  if (m && m.state === "active") {
    const badge = G.freeMode ? "#2f9ee0" : CHAPTER_INFO[G.chapter].badge;
    ctx.fillStyle = "rgba(8,10,18,.72)";
    ctx.beginPath(); ctx.roundRect(14, 14, 330, 84, 8); ctx.fill();
    ctx.fillStyle = badge;
    ctx.fillRect(14, 14, 6, 84);
    ctx.fillStyle = "#fff";
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(G.freeMode ? "自由模式" : CHAPTER_INFO[G.chapter].name, 32, 22);
    ctx.fillStyle = "#ffd257";
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(m.def.title, 32, 42);
    ctx.fillStyle = "#d8d2f0";
    ctx.font = `12px ${FONT}`;
    ctx.fillText(m.def.objective(m.data), 32, 66);
    if (m.def.timeLimit && m.data.timer != null) {
      const w = 300 * clamp(m.data.timer / m.def.timeLimit, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,.15)";
      ctx.fillRect(32, 86, 300, 5);
      ctx.fillStyle = m.data.timer < 15 ? "#e05555" : "#6fd06f";
      ctx.fillRect(32, 86, w, 5);
    }
    /* 目标箭头 */
    const t = m.def.target(m.data);
    if (t) {
      const psx = player.x - cam.x + 640, psy = player.y - cam.y + 360;
      const dx = t[0] - player.x, dy = t[1] - player.y;
      const d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const ax = clamp(psx + Math.cos(ang) * 130, 40, 1240);
      const ay = clamp(psy + Math.sin(ang) * 130, 120, 640);
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(ang);
      ctx.fillStyle = "rgba(255,210,87,.92)";
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#ffd257";
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(d / 10)}m`, ax, ay + 18);
    }
  }
  /* 金钱 + 通缉 */
  ctx.textAlign = "right";
  ctx.font = `italic bold 24px ${FONT}`;
  ctx.fillStyle = "rgba(8,10,18,.6)";
  ctx.beginPath(); ctx.roundRect(1276 - 168, 14, 154, 64, 8); ctx.fill();
  ctx.fillStyle = "#7ee08a";
  ctx.fillText("$" + G.money, 1268, 20);
  ctx.font = `18px ${FONT}`;
  let stars = "";
  for (let k = 0; k < 5; k++) stars += k < G.wanted ? "★" : "☆";
  ctx.fillStyle = G.wanted ? "#ffd257" : "#5e5a76";
  ctx.fillText(stars, 1268, 48);
  /* 速度表 */
  ctx.textAlign = "right";
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText(`${Math.round(player.speed * 0.6)} km/h`, 1262, 686);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.fillText("H 喇叭 · 空格 手刹 · P 暂停", 1262, 704);
  /* 小地图 */
  drawMinimap();
  /* 消息 */
  ctx.textAlign = "center";
  let my = 640 - messages.length * 22;
  for (const msg2 of messages) {
    ctx.fillStyle = "rgba(8,10,18,.7)";
    ctx.font = `13px ${FONT}`;
    const w = ctx.measureText(msg2.t).width + 20;
    ctx.beginPath(); ctx.roundRect(640 - w / 2, my - 6, w, 22, 4); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(msg2.t, 640, my + 8);
    my += 24;
  }
  /* 大字 */
  if (bigText) {
    bigText.t += dt;
    const bt = bigText;
    if (bt.t > bt.dur) bigText = null;
    else {
      const a = clamp(bt.t * 3, 0, 1) * (bt.dur > 90 ? 1 : clamp((bt.dur - bt.t) * 2, 0, 1));
      ctx.textAlign = "center";
      ctx.globalAlpha = a;
      ctx.font = `italic bold 56px ${FONT}`;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillText(bt.text, 642, 262);
      ctx.fillStyle = bt.color;
      ctx.fillText(bt.text, 640, 258);
      if (bt.sub) {
        ctx.font = `15px ${FONT}`;
        ctx.fillStyle = "#e8dcff";
        ctx.fillText(bt.sub, 640, 306);
      }
      ctx.globalAlpha = 1;
    }
  }
}
function drawMinimap() {
  const mw = 200, mh = 143, mx = 14, my = 720 - mh - 14;
  const s = mw / WORLD_W;
  ctx.fillStyle = "rgba(8,10,18,.78)";
  ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 6); ctx.fill();
  ctx.save();
  ctx.translate(mx, my);
  ctx.scale(s, s);
  ctx.fillStyle = "#232a33";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const park = PARKS.some(([pc, pr]) => pc === c && pr === r);
    const dock = DOCK[0] === c && DOCK[1] === r;
    ctx.fillStyle = park ? "#2e4a2a" : dock ? "#45405a" : "#3a434f";
    ctx.fillRect(ROAD + c * (BW + ROAD), ROAD + r * (BH + ROAD), BW, BH);
  }
  ctx.restore();
  const px = (x) => mx + x * s, py = (y) => my + y * s;
  for (const c of traffic) { ctx.fillStyle = "#8a93a0"; ctx.fillRect(px(c.x) - 1, py(c.y) - 1, 2.4, 2.4); }
  for (const p of police) { ctx.fillStyle = "#ff5555"; ctx.fillRect(px(p.x) - 2, py(p.y) - 2, 4.5, 4.5); }
  const m = G.mission;
  if (m && m.state === "active") {
    const t = m.def.target(m.data);
    if (t && Math.floor(G.time * 3) % 2 === 0) {
      ctx.fillStyle = "#ffd257";
      ctx.beginPath(); ctx.arc(px(t[0]), py(t[1]), 4.5, 0, TAU); ctx.fill();
    }
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(px(player.x), py(player.y), 3.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.6)";
  ctx.beginPath();
  ctx.moveTo(px(player.x), py(player.y));
  ctx.lineTo(px(player.x) + Math.cos(player.angle) * 9, py(player.y) + Math.sin(player.angle) * 9);
  ctx.stroke();
}

/* ================= 消息 ================= */
function msg(text) {
  messages.push({ t: text, life: 3.2 });
  if (messages.length > 4) messages.shift();
}

/* ================= 菜单（DOM） ================= */
const MENU = { items: [], sel: 0 };
function showMenu() {
  G.state = "menu";
  $("#splash").classList.remove("show");
  $("#pause").classList.remove("show");
  $("#ending").classList.remove("show");
  $("#menu").classList.add("show");
  const d = Save.data;
  const items = [];
  if (d.ch > 1 || d.stats.passed > 0) items.push({ label: `继续游戏`, note: CHAPTER_INFO[Math.min(d.ch - 1, 4)].name, act: () => startChapter(Math.min(d.ch - 1, 4)) });
  items.push({ label: "开始新游戏", note: "从序章开始", act: () => { Save.reset(); G.money = 0; G.rainbow = false; startChapter(0); } });
  items.push({
    label: "自由模式",
    note: d.free ? "已解锁" : "通关后解锁 🔒",
    locked: !d.free,
    act: () => { if (d.free) { G.rainbow = !!d.rainbow; startFree(); } else msg2Lock(); },
  });
  items.push({ label: "操作说明", act: () => { G.state = "howto"; $("#menu").classList.remove("show"); $("#howto").classList.add("show"); } });
  MENU.items = items;
  MENU.sel = 0;
  renderMenu();
  GameAudio.engineStop();
  GameAudio.sirenStop();
}
function msg2Lock() {
  const list = $("#menu-list");
  list.querySelectorAll(".menu-item.locked").forEach((e) => {
    e.style.color = "#e05555";
    setTimeout(() => (e.style.color = ""), 500);
  });
}
function renderMenu() {
  const list = $("#menu-list");
  list.innerHTML = "";
  MENU.items.forEach((it, i) => {
    const d = el("div", "menu-item" + (i === MENU.sel ? " sel" : "") + (it.locked ? " locked" : ""),
      it.label + (it.note ? `<span class="mi-note">${it.note}</span>` : ""));
    d.addEventListener("click", () => { MENU.sel = i; menuActivate(); });
    d.addEventListener("pointerenter", () => {
      if (MENU.sel !== i) { MENU.sel = i; renderMenu(); }
    });
    list.appendChild(d);
  });
}
function menuActivate() {
  const it = MENU.items[MENU.sel];
  if (!it || it.locked) { msg2Lock(); return; }
  it.act();
}
function showPause() {
  G.paused = true;
  GameAudio.engineUpdate(0, 0);
  const pl = $("#pause-list");
  pl.innerHTML = "";
  const items = [
    ["继续游戏", () => { G.paused = false; $("#pause").classList.remove("show"); }],
    ["重玩本章", () => { G.paused = false; $("#pause").classList.remove("show"); retryChapter(); }],
    ["返回主菜单", () => { G.paused = false; $("#pause").classList.remove("show"); showMenu(); }],
  ];
  items.forEach(([label, act], i) => {
    const d = el("div", "menu-item" + (i === 0 ? " sel" : ""), label);
    d.addEventListener("click", act);
    pl.appendChild(d);
  });
  const s = Save.data.stats;
  $("#pause-stats").textContent =
    `金钱 $${G.money} · 通缉 ${"★".repeat(G.wanted) || "无"}\n` +
    `撞到行人 ${s.peds} · 被捕 ${s.busted} · 完成任务 ${s.passed}\n` +
    `隐藏包裹 ${Save.data.packages.filter(Boolean).length}/10`;
  $("#pause").classList.add("show");
}

/* ================= 结局 ================= */
function showEnding() {
  const s = Save.data.stats;
  const got = Save.data.packages.filter(Boolean).length;
  $("#end-stats").textContent =
    `总收入 $${G.money}\n` +
    `撞到行人 ${s.peds} 次 · 被 BUSTED ${s.busted} 次 · 完成任务 ${s.passed} 个\n` +
    `隐藏包裹 ${got}/10 ${got === 10 ? "（彩虹车漆已到手）" : ""}`;
  $("#end-credits").textContent =
    "绿色纯净工作组 出品\n" +
    "引擎 / 程序 —— 极简引擎™ 与一位不肯睡的程序员\n" +
    "美术 —— 全部由代码当场生成，无一素材幸存\n" +
    "音乐音效 —— WebAudio 8-bit 分部\n" +
    "警车友情提供 —— 洛圣都警局（编外）\n" +
    "特别鸣谢 —— 每一位被装了 12 个必要组件的朋友\n" +
    "本游戏与 Rockstar Games 无关，纯属致敬与玩笑 · CC BY-NC 4.0";
  $("#end-unlock").textContent = "🏆 自由模式已解锁 · 快去收集剩下的包裹";
}

/* ================= 输入 ================= */
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
    e.preventDefault();
  Audio.resume();
  const layer = $("#game-layer");
  if (!layer.classList.contains("show")) return;

  if (G.state === "splash") { showMenu(); return; }
  if (G.state === "howto") { $("#howto").classList.remove("show"); showMenu(); return; }
  if (G.state === "ended") {
    if (e.code === "Enter" || e.code === "Space" || e.code === "Escape") {
      $("#ending").classList.remove("show");
      showMenu();
    }
    return;
  }
  if (G.state === "menu") {
    if (e.code === "ArrowUp") { MENU.sel = (MENU.sel + MENU.items.length - 1) % MENU.items.length; renderMenu(); }
    else if (e.code === "ArrowDown") { MENU.sel = (MENU.sel + 1) % MENU.items.length; renderMenu(); }
    else if (e.code === "Enter" || e.code === "Space") menuActivate();
    return;
  }
  if (G.paused) {
    if (e.code === "KeyP" || e.code === "Escape") { G.paused = false; $("#pause").classList.remove("show"); }
    return;
  }
  if (G.state !== "game") return;
  if (e.code === "KeyP" || e.code === "Escape") { showPause(); return; }
  /* 任务失败态 */
  if (G.mission && G.mission.state === "failed") {
    if (e.code === "KeyR") retryChapter();
    else if (e.code === "Enter") showMenu();
    return;
  }
  keys.add(e.code);
  if (e.code === "KeyH" && G.time - player.honkT > 0.3) { player.honkT = G.time; GameAudio.horn(); }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
$("#splash").addEventListener("click", () => { if (G.state === "splash") showMenu(); });
$("#howto").addEventListener("click", () => { if (G.state === "howto") { $("#howto").classList.remove("show"); showMenu(); } });

/* ================= 主循环 ================= */
let lastT = 0, fpsAcc = 0, fpsN = 0, fps = 60;
function loop(now) {
  requestAnimationFrame(loop);
  if (!$("#game-layer").classList.contains("show")) return;
  const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05);
  lastT = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }

  if (G.state === "game" && !G.paused) {
    G.time += dt;
    Save.data.stats.time += dt;
    crashCd -= dt;
    if (!G.frozen) updatePlayer(dt);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updatePickups(dt);
    if (G.mission && G.mission.state === "active") {
      if (G.mission.introT > 0) G.mission.introT -= dt;
      else G.mission.def.update(G.mission.data, dt);
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      messages[i].life -= dt;
      if (messages[i].life <= 0) messages.splice(i, 1);
    }
  }
  drawScene(G.paused ? 0 : dt);
}
requestAnimationFrame(loop);

/* ================= 对外启动接口 ================= */
window.GameBoot = {
  start() {
    $("#game-layer").classList.add("show");
    G.state = "splash";
    G.money = Save.data.money;
    G.rainbow = !!Save.data.rainbow;
    $("#splash").classList.add("show");
    const d = Save.data;
    $("#sp-save").textContent =
      d.ch > 1 ? `检测到存档：${CHAPTER_INFO[Math.min(d.ch - 1, 4)].name} · 包裹 ${d.packages.filter(Boolean).length}/10` : "";
    setupCanvas();
  },
};

/* ================= roundRect 兼容 ================= */
if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
