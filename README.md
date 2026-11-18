# GTA VI 绿色纯净版

披着「盗版游戏安装器」外衣的开源 2D 迷你 GTA：先是一本正经的假安装向导
（捆绑组件勾不掉、取消无效、进度卡 99%），装完「启动」，真正的游戏才开始 ——
一个完整可玩的俯视角洛圣都。

> 免责声明：粉丝戏仿（parody）整蛊作品，与 Rockstar Games 无关，不含任何官方
> 游戏资源；全部代码、画面与音效由代码即时程序化生成。详见 `LICENSE`。

## 玩法

- **整蛊链路**：假 Win7 桌面 → GTA VI 安装向导（12 个「必要」捆绑组件、
  取消按钮错误代码 `0xGTA666`、99% 永远卡住）→ 启动 → 假 loading → 真游戏。
- **主线**：5 个章节任务（教学 → 限时送披萨 → 甩掉 2 星警车 → 包裹风暴 →
  黎明大逃亡），通关进结算与制作名单。
- **自由模式**：通关解锁，任务随机刷新；全城藏了 10 个隐藏包裹，
  集齐解锁彩虹车漆。沿途捡 `$` 补贴家用。
- **警察系统**：撞行人/任务会涨通缉星级（1-5），警车数量随星级增加；
  拉开 400 米以上持续几秒即可甩掉；被警车贴住不放会被 **BUSTED**（罚款 $150）。

## 操作

| 按键 | 作用 |
| --- | --- |
| ↑ / W | 油门 |
| ↓ / S | 刹车 / 倒车 |
| ← → / A D | 转向 |
| 空格 | 手刹（漂移） |
| H | 喇叭 |
| P | 暂停菜单 |
| Esc | 退出应用（仅 macOS .app；网页版请关标签页） |

存档自动写入浏览器 `localStorage`（章节进度 / 包裹 / 统计）。

## 怎么跑

- **网页版**：直接双击打开 `web/index.html` 即可（无需服务器）；
  或 `python3 -m http.server` 后访问。
- **macOS 应用**（无边框窗口 + 图标，整蛊效果最佳）：

  ```sh
  bash build.sh        # 产物：out/GTA VI 绿色纯净版.app
  open "out/GTA VI 绿色纯净版.app"
  ```

  构建依赖：macOS 自带 `swiftc`、`sips`、`iconutil`。版本号单一来源为 `VERSION`
  文件，构建时注入 `Info.plist`。

## 仓库结构

```
web/            游戏本体（HTML + CSS + 安装器 JS + 游戏 JS，无任何外部依赖）
app/            macOS 无边框外壳（Swift + WKWebView，约 80 行）
build.sh        打包 .app
VERSION         版本号单一来源
```

## 机械检查

```sh
# 每个任务定义必须有通关出口（曾因 m0/m1 缺 passMission 导致永远无法通关）
[ "$(grep -c 'passMission()' web/game.js)" -ge 8 ] && echo OK || echo FAIL
```

## English

**GTA VI Green Edition** — an open-source 2D mini-GTA disguised as a shady
pirated-game installer. A pixel-perfect fake Windows 7 installer walks your
friend through 12 unremovable "required components" and a progress bar stuck
at 99%… then the actual game boots: a fully playable top-down open city with
5 story missions, police chase AI, handbrake drifting, a free-roam mode and
10 hidden packages. Everything (graphics, audio, city) is procedurally
generated at runtime — zero external assets. Runs as a plain web page, or as
a borderless macOS app (`bash build.sh`).

## 许可

CC BY-NC 4.0 + 附加声明（署名-非商业），见 `LICENSE`。禁止商用。
