# play-865455

`play.865455.xyz` 的小游戏集合，使用 Cloudflare Pages 部署。

## Games

- [2048](./2048/) — 基于 [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048)，MIT License；本地副本移除了页面底部说明文字。
- [Sky Patrol](./shooter/) — 自维护的 HTML5 Canvas 街机风打飞机，自动发射、关卡、生命、道具、音效与移动端触控。
- [Classic Tetris](./tetris/) — 自维护的纯 HTML5 Canvas 俄罗斯方块，支持键盘、触摸、计分、等级、下一个方块和本地最高分。
- [Classic Snake](./snake/) — 自维护的纯 HTML5 Canvas 贪食蛇，支持键盘、触摸、加速和穿墙玩法。
- [Breakout](./breakout/) — 自维护的纯 HTML5 Canvas 打砖块，支持反弹、关卡、生命和本地最高分。
- [Minesweeper](./minesweeper/) — 自维护的经典扫雷，支持点击、右键/长按插旗、计时和本地最佳时间。
- [Alien Formation](./space-invaders/) — 自维护的经典固定阵型射击，支持移动、射击、波次和本地最高分。
- [Neon Maze](./maze/) — 原创迷宫吃点小游戏，支持敌人追踪、关卡、生命和本地最高分。

## Local development

直接使用任意静态文件服务器：

```bash
python3 -m http.server 8080
```

然后打开 `http://127.0.0.1:8080/`。

## Deployment

当前 Pages 项目名：`2048`。目录结构直接对应线上路径：

```text
/2048/
/shooter/
/tetris/
/snake/
/breakout/
/minesweeper/
/space-invaders/
/maze/
```

## License

`2048/` 保留上游项目的 MIT License 文件。`shooter/` 为本仓库自维护代码，采用 MIT License。

本仓库不包含任何 API token、账号凭证或运行时密钥。

## Credits

- 2048: Gabriele Cirulli and contributors
- Sky Patrol: maintained in this repository
- Classic Tetris: maintained in this repository
- Classic Snake: maintained in this repository
- Breakout: maintained in this repository
- Minesweeper: maintained in this repository
- Alien Formation: maintained in this repository
- Neon Maze: maintained in this repository

> “2048” 的名称、代码和相关版权归原作者及贡献者所有；本仓库只是部署用副本。

## Changelog

### 2026-08-09

- Added 2048.
- Added Sky Patrol.
- Sky Patrol uses automatic firing; manual fire remains available as an extra control.
- Added Classic Tetris with keyboard and touch controls.
- Added Classic Snake with wrap-around walls.
- Added Breakout, Minesweeper, Alien Formation, and Neon Maze.
