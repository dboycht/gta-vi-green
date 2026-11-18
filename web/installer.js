/* =====================================================
 * GTA VI 绿色纯净版 —— 假桌面 + 安装向导
 * 完成后把舞台交给 game.js（window.GameBoot.start()）
 * ===================================================== */
"use strict";

/* ---------- 工具 ---------- */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
document.addEventListener("contextmenu", (e) => e.preventDefault());

/* 自备封面：把图存为 web/assets/cover.{jpg,png,jpeg,webp} 即可替换
 * 安装器左侧程序化画面（assets/ 不入库，仓库不携带任何版权素材） */
function tryLoadCover() {
  const candidates =
    ["assets/cover.jpg", "assets/cover.png", "assets/cover.jpeg", "assets/cover.webp"];
  const art = $("#inst-art");
  const next = (i) => {
    if (i >= candidates.length) return;
    const img = new Image();
    img.onload = () => {
      art.classList.add("custom");
      art.style.backgroundImage = `url("${candidates[i]}")`;
    };
    img.onerror = () => next(i + 1);
    img.src = candidates[i];
  };
  next(0);
}

/* ---------- 舞台缩放（1280×720 设计稿适配任意窗口） ---------- */
function fitStage() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  $("#stage").style.transform =
    `translate(-50%, -50%) scale(${s.toFixed(4)})`;
}
window.addEventListener("resize", fitStage);
fitStage();

/* =====================================================
 * 假桌面
 * ===================================================== */
const DESKTOP_ICONS_LEFT = [
  ["回收站", "🗑", "#5a6b7a"], ["360安全卫士", "🛡", "#3fa24a"],
  ["此电脑", "💻", "#4a7ab5"], ["电脑管家", "🧹", "#2a9d8f"],
  ["鲁大师", "🔧", "#e07b39"], ["Google Chrome", "🌐", "#e8443a"],
  ["好压", "🗜", "#3a7bd5"], ["万能播放器", "🎬", "#8e44ad"],
  ["Microsoft Edge", "🧭", "#2f9e8f"], ["游戏加速器", "🚀", "#e84393"],
  ["WPS Office", "📄", "#d63031"], ["腾讯视频", "📺", "#0984e3"],
  ["PDF转换王", "📕", "#d63031"], ["桌面天气", "⛅", "#f39c12"],
  ["微信", "💬", "#27ae60"], ["QQ", "🐧", "#12b3d6"],
  ["2345浏览器", "🔎", "#e17055"], ["手机助手", "📱", "#6c5ce7"],
  ["网易云音乐", "🎵", "#d63031"], ["一键清理", "✨", "#00b894"],
  ["壁纸大全", "🖼", "#e84393"], ["爱奇艺", "▶️", "#0984e3"],
  ["软件管家", "📦", "#636e72"], ["优酷视频", "🎞", "#2d3436"],
];
const DESKTOP_ICONS_RIGHT = [
  ["UC浏览器", "🐿", "#ff7a1a"], ["搜狗拼音输入法", "⌨", "#3a7bd5"],
  ["金山毒霸", "🛡", "#00b894"], ["风行视频", "📡", "#e17055"],
  ["微游浏览器", "🕹", "#6c5ce7"], ["WiFi万能钥匙", "📶", "#0984e3"],
  ["快手", "🎬", "#ff7a1a"], ["钉钉", "💼", "#2d6cdf"],
  ["QQ音乐", "🎶", "#00c853"], ["计算器", "🧮", "#636e72"],
  ["电脑诊所", "🏥", "#e84393"], ["驱动精灵", "⚙", "#636e72"],
];

/* 桌面初始为空：图标随安装进度逐个「装」出来（见 Installer.startIconDrip） */
function spawnDesktopIcon([name, emoji, color], col, isBin) {
  const d = el("div", "dicon pop");
  d.appendChild(el("div", "di-img", emoji)).style.background =
    `linear-gradient(160deg, ${color}, ${color}cc)`;
  d.appendChild(el("div", "di-name", name));
  d.addEventListener("click", () => {
    col.querySelectorAll(".dicon.sel").forEach((x) => x.classList.remove("sel"));
    d.classList.add("sel");
  });
  if (isBin) d.addEventListener("dblclick", () =>
    toast("回收站是空的，干净得像 GTA VI 的安装包。"));
  col.appendChild(d);
}

/* 安装成功后往桌面加 GTA VI 快捷方式 */
function addGtaShortcut() {
  if ($("#icons-gta").children.length) return;
  const d = el("div", "dicon");
  d.appendChild(el("div", "di-img di-gta", "VI"));
  d.appendChild(el("div", "di-name", "GTA VI"));
  d.addEventListener("dblclick", () => Installer.launch());
  $("#icons-gta").appendChild(d);
}

/* 任务栏时钟：读真实时间 */
function tickClock() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  $("#tb-time").textContent = `${p(now.getHours())}:${p(now.getMinutes())}`;
  $("#tb-date").textContent =
    `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
}
tickClock();
setInterval(tickClock, 10 * 1000);

/* =====================================================
 * Toast 与对话框
 * ===================================================== */
function toast(text, ms = 2400) {
  const t = el("div", "toast", text);
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), ms);
}

const DLG_ICONS = { info: "ℹ️", warn: "⚠️", err: "⛔" };
function dialog(type, title, text, onOk) {
  const layer = $("#dialog-layer");
  layer.innerHTML = "";
  layer.classList.add("show");
  const dlg = el("div", "dlg");
  const tb = el("div", "dlg-tb", title);
  const body = el("div", "dlg-body");
  body.appendChild(el("div", "dlg-ic", DLG_ICONS[type] || DLG_ICONS.info));
  body.appendChild(el("div", "dlg-text", text));
  const btns = el("div", "dlg-btns");
  const ok = el("button", "wbtn primary", "确定");
  btns.appendChild(ok);
  dlg.append(tb, body, btns);
  layer.appendChild(dlg);
  const close = () => { layer.classList.remove("show"); layer.innerHTML = ""; };
  ok.addEventListener("click", () => { close(); if (onOk) onOk(); });
  return { close };
}

/* =====================================================
 * 安装向导
 * ===================================================== */
const BUNDLEWARE = [
  "2345看图王", "极速下载助手", "桌面日历精灵",
  "快压", "电脑加速大师", "浏览器导航助手",
  "小鸟壁纸", "万能PDF阅读器", "游戏盒子",
  "驱动人生", "高清看图助手", "一键修复专家",
];
const RECOMMEND = [
  "看图精灵 Pro", "全能输入法", "天气小助手",
  "极速 PDF", "音乐盒", "高清影视",
  "网速管家", "小游戏大全",
];
const INSTALL_FILES = [
  "正在解压：洛圣都_地图_压缩包.zip (4.7 GB)",
  "正在安装：GTA6_绿色纯净版_本体.exe",
  "正在安装：2345看图王_必要组件.dll",
  "正在注册：快压_右键增强.reg",
  "正在安装：极速下载助手_服务.sys",
  "正在安装：电脑加速大师_驱动.vxd",
  "正在安装：小鸟壁纸_随机更换.dll",
  "正在安装：万能PDF阅读器_内核.sys",
  "正在设置：浏览器导航助手_主页.reg",
  "正在安装：一键修复专家_全家桶.exe",
  "正在安装：驱动人生_人生.dll",
  "正在安装：高清看图助手_像素.dll",
  "正在安装：桌面日历精灵_日期.dat",
  "正在安装：游戏盒子_盒子.box",
  "正在写入：你的_童年回忆.dat",
];

const Installer = {
  pageIdx: 0,
  pages: ["pg-welcome", "pg-license", "pg-location", "pg-recommended",
          "pg-installing", "pg-done"],
  refuseDodges: 0,
  installing: false,
  shortcutChecked: true,
  desktopQueue: [],
  dripTimer: null,

  init() {
    this.buildCheckboxGrid($("#grid-essential"), BUNDLEWARE, true);
    this.buildCheckboxGrid($("#grid-recommend"), RECOMMEND, true);
    this.bindTitlebar();
    this.bindButtons();
    this.bindLicense();
    this.bindLocation();
    this.showPage(0);
  },

  /* 图标随安装滴灌上桌 */
  startIconDrip() {
    this.desktopQueue = [
      ...DESKTOP_ICONS_LEFT.map((it) => [it, $("#icons-left")]),
      ...DESKTOP_ICONS_RIGHT.map((it) => [it, $("#icons-right")]),
    ];
    this.dripTimer = setInterval(() => {
      for (let k = 0; k < 3 && this.desktopQueue.length; k++) {
        const [it, col] = this.desktopQueue.shift();
        spawnDesktopIcon(it, col, it[0] === "回收站");
      }
      if (!this.desktopQueue.length) {
        clearInterval(this.dripTimer);
        this.dripTimer = null;
      }
    }, 1000);
  },

  flushDesktopIcons() {
    if (this.dripTimer) { clearInterval(this.dripTimer); this.dripTimer = null; }
    while (this.desktopQueue.length) {
      const [it, col] = this.desktopQueue.shift();
      spawnDesktopIcon(it, col, it[0] === "回收站");
    }
  },

  buildCheckboxGrid(grid, names, locked) {
    names.forEach((name) => {
      const lb = el("label", "chk");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = true;
      if (locked) cb.dataset.lock = "1";
      cb.addEventListener("change", () => {
        if (cb.checked || !cb.dataset.lock) return;
        const lb2 = lb;
        setTimeout(() => {
          cb.checked = true;
          lb2.classList.remove("wobble");
          void lb2.offsetWidth;
          lb2.classList.add("wobble");
          toast(`「${name}」是 GTA VI 运行的必要组件，无法取消勾选。`);
        }, 320);
      });
      lb.appendChild(cb);
      lb.appendChild(el("span", null, name));
      grid.appendChild(lb);
    });
  },

  showPage(i) {
    this.pageIdx = i;
    this.pages.forEach((id, k) =>
      $("#" + id).classList.toggle("active", k === i));
    $("#btn-back").disabled = i === 0;
    $("#btn-next").style.display = i === 4 ? "none" : "";
    $("#btn-back").style.display = i === 4 ? "none" : "";
    $("#btn-next").textContent =
      i === this.pages.length - 2 ? "安装(I) ›" :
      i === this.pages.length - 1 ? "完成(F)" : "下一步(N) ›";
  },

  bindTitlebar() {
    const win = $("#installer"), bar = $("#inst-titlebar");
    let drag = null;
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("win-btn")) return;
      const sc = $("#stage").getBoundingClientRect().width / 1280;
      drag = { dx: e.clientX / sc - win.offsetLeft, dy: e.clientY / sc - win.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const st = $("#stage").getBoundingClientRect();
      const sc = st.width / 1280;
      const x = Math.min(Math.max(e.clientX / sc - drag.dx, 0), 1280 - win.offsetWidth);
      const y = Math.min(Math.max(e.clientY / sc - drag.dy, 0), 678 - win.offsetHeight);
      win.style.left = x + "px";
      win.style.top = y + "px";
    });
    bar.addEventListener("pointerup", () => (drag = null));
    $("#wb-close").addEventListener("click", () => this.cancelAttempt());
    $("#wb-min").addEventListener("click", () => {
      win.style.visibility = "hidden";
      setTimeout(() => {
        win.style.visibility = "";
        toast("GTA VI 安装程序不允许被最小化，它太想被安装了。");
      }, 900);
    });
    $("#wb-max").addEventListener("click", () => {
      toast("最大化失败：安装窗口已经很努力了。");
    });
  },

  bindButtons() {
    $("#btn-next").addEventListener("click", () => {
      const i = this.pageIdx;
      if (i === 3) { this.startInstall(); return; }
      if (i === 4) return;
      if (i === 5) { this.finish(); return; }
      this.showPage(i + 1);
    });
    $("#btn-back").addEventListener("click", () => {
      if (this.pageIdx > 0 && !this.installing) this.showPage(this.pageIdx - 1);
    });
    $("#btn-cancel").addEventListener("click", () => this.cancelAttempt());
  },

  cancelAttempt() {
    if (this.installing) {
      dialog("warn", "GTA VI 绿色纯净版 - 安装程序",
        "安装已进入不可描述的阶段，无法取消。<br>请继续欣赏进度条。");
      return;
    }
    dialog("info", "GTA VI 绿色纯净版 - 安装程序", "确定要取消安装吗？", () => {
      dialog("err", "取消失败",
        "文件 'GTA6_最终版_不弹窗.exe' 强烈反对取消。<br>" +
        "（错误代码：0xGTA666）");
      const win = $("#installer");
      win.style.transition = "transform .08s";
      let n = 0;
      const iv = setInterval(() => {
        win.style.transform = `translate(${(n % 2 ? 6 : -6)}px, 0)`;
        if (++n > 5) { clearInterval(iv); win.style.transform = ""; }
      }, 70);
    });
  },

  bindLicense() {
    const refuse = el("button", "wbtn", "我拒绝(N)");
    refuse.id = "btn-refuse";
    refuse.style.marginRight = "auto";
    refuse.addEventListener("pointerenter", () => {
      this.refuseDodges++;
      if (this.refuseDodges > 3) {
        refuse.disabled = true;
        refuse.textContent = "拒绝无效";
        refuse.style.transform = "";
        return;
      }
      const dx = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 50);
      const dy = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 26);
      refuse.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    refuse.addEventListener("click", () => {
      dialog("info", "许可协议",
        "检测到您拒绝本协议。<br>协议第 1 条：您已同意本协议。");
    });
    const pane = $("#pg-license");
    pane.appendChild(refuse);
  },

  bindLocation() {
    $("#btn-browse").addEventListener("click", () => {
      dialog("info", "浏览文件夹",
        "浏览失败：C 盘是 GTA VI 唯指定居地。<br>（其他盘符表示抗议）");
    });
    $("#opt-usb").addEventListener("change", (e) => {
      if (!e.target.checked) return;
      e.target.checked = false;
      dialog("warn", "GTA VI 绿色纯净版",
        "未检测到 U 盘。<br>你根本没有插 U 盘。");
    });
  },

  startInstall() {
    this.installing = true;
    this.showPage(4);
    this.startIconDrip();
    let idx = 0, pct = 0;
    const fileEl = $("#inst-file"), fill = $("#inst-fill"), pctEl = $("#inst-pct");
    const setPct = (v) => {
      pct = v;
      fill.style.width = v + "%";
      pctEl.textContent = Math.round(v) + "%";
    };
    const nextFile = () => {
      fileEl.textContent = INSTALL_FILES[idx % INSTALL_FILES.length];
      idx++;
    };
    nextFile();
    /* 前段：匀速爬升 */
    const iv = setInterval(() => {
      setPct(Math.min(pct + 1.6 + Math.random() * 2.2, 88));
      if (Math.random() < 0.45) nextFile();
      if (pct >= 88) {
        clearInterval(iv);
        /* 中段：减速逼近 99% */
        const iv2 = setInterval(() => {
          setPct(Math.min(pct + 0.9, 99));
          if (pct >= 99) {
            clearInterval(iv2);
            fileEl.textContent = "正在校验您的耐心……";
            $("#inst-note").textContent =
              "99% 是安装最稳定的进度，请放心等待。";
            setTimeout(() => {
              fileEl.textContent = "正在生成绿色纯净认证……";
              setTimeout(() => {
                setPct(100);
                fileEl.textContent = "安装完成。";
                setTimeout(() => {
                  this.installing = false;
                  this.showPage(5);
                }, 700);
              }, 1600);
            }, 3400);
          }
        }, 260);
      }
    }, 150);
  },

  finish() {
    this.shortcutChecked = $("#opt-shortcut").checked;
    const run = $("#opt-run").checked;
    $("#installer").classList.add("hidden");
    this.flushDesktopIcons();
    if (this.shortcutChecked) addGtaShortcut();
    if (run) {
      this.launch();
    } else {
      toast("GTA VI 快捷方式已创建到桌面。双击即可开始整蛊。");
    }
  },

  /* 交给游戏：先播启动过场 */
  launch() {
    Audio.init(); /* 必须在用户手势里初始化 */
    const ov = $("#launch-overlay"), line = $("#lo-line"), fill = $("#lo-fill");
    ov.classList.add("show");
    const steps = [
      ["正在启动 GTA VI…", 24, 700],
      ["正在编译着色器 (2/1)…", 58, 900],
      ["正在加载洛圣都…", 86, 800],
      ["即将开始", 100, 600],
    ];
    let k = 0;
    const step = () => {
      if (k >= steps.length) {
        ov.classList.remove("show");
        fill.style.width = "0%";
        GameBoot.start();
        return;
      }
      line.textContent = steps[k][0];
      fill.style.width = steps[k][1] + "%";
      setTimeout(step, steps[k][2]);
      k++;
    };
    step();
  },
};

/* ---------- 极简 WebAudio 合成器（安装器只负责创建，游戏主力使用） ---------- */
const Audio = {
  ctx: null, master: null,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* 无声环境：静默降级 */ }
  },
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  beep(freq, dur, type = "square", vol = 0.2, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.2, vol = 0.25, freq = 800) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
};

Installer.init();
tryLoadCover();

/* ---------- 调试钩子（?debug=1 才暴露） ---------- */
if (/\bdebug\b/.test(location.search)) {
  window.__gta = {
    Installer, Audio,
    finishInstall() { Installer.showPage(5); },
    launch() { Installer.launch(); },
  };
}
