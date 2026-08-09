# play-865455

`play.865455.xyz` 的小游戏集合，使用 Cloudflare Pages 部署。

## Games

- [Classic 2048](./2048/) — 本仓库自维护的纯 HTML5/CSS/JavaScript 2048，支持键盘、触摸、计分和本地最高分。
- [Sky Patrol](./shooter/) — 自维护的 HTML5 Canvas 街机风打飞机，自动发射、关卡、生命、道具、音效与移动端触控。
- [Classic Tetris](./tetris/) — 自维护的纯 HTML5 Canvas 俄罗斯方块，支持键盘、完整触控、计分、等级、下一个方块和本地最高分。
- [Classic Snake](./snake/) — 自维护的纯 HTML5 Canvas 贪食蛇，支持键盘、触摸、加速和穿墙玩法。
- [Breakout](./breakout/) — 自维护的纯 HTML5 Canvas 打砖块，支持反弹、关卡、生命、本地最高分、手机拖动和一键开始/发球。
- [Minesweeper](./minesweeper/) — 自维护的经典扫雷，支持首次落子保护、点击、右键/长按插旗、计时和本地最佳时间。
- [Alien Formation](./space-invaders/) — 自维护的经典固定阵型射击，支持移动、射击、波次、受击保护、手机触控和本地最高分。
- [Neon Maze](./maze/) — 原创迷宫吃点小游戏，支持寻路敌人、关卡、生命、本地最高分、手机滑动和触屏方向键。
- [Gomoku](./gomoku/) — Self-maintained 15×15 human-vs-computer Gomoku with three difficulty levels, undo, mouse/touch controls, last-move marking, and local records.
- [Pong](./pong/) — Self-maintained paddle game with AI, pointer/drag controls, score targets, and local records.
- [Sokoban](./sokoban/) — Self-maintained box-pushing puzzle with original levels, undo, restart, keyboard, swipe, and touch controls.
- [Asteroids](./asteroids/) — Self-maintained inertial space arcade game with splitting rocks, lives, levels, keyboard, and complete touch controls.
- [Crosswalk](./crosswalk/) — Self-maintained traffic-dodging arcade game with levels, lives, keyboard, swipe, and touch controls.
- [Simon](./simon/) — Self-maintained sequence-memory game with four touch pads, sound, strict mode, and local best score.
- [Sudoku](./sudoku/) — Self-maintained Sudoku with unique puzzles, three difficulties, notes, undo, hints, mistakes, timer, and local best times.
- [Lunar Lander](./lunar-lander/) — Self-maintained physics landing game with random terrain, limited fuel, progressive gravity, complete touch controls, and local records.
- [Connect Four](./connect-four/) — Self-maintained human-vs-computer strategy game with three AI levels, first-player selection, undo, touch controls, and local records.
- [Sky Hopper](./sky-hopper/) — Self-maintained vertical platform jumper with automatic bouncing, scrolling terrain, five platform types, keyboard/touch controls, and local high score.
- [Helicopter Cave](./helicopter-cave/) — Self-maintained single-action cave flyer with procedural navigable terrain, obstacles, progressive speed, keyboard/touch controls, and local distance record.

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
/gomoku/
/pong/
/sokoban/
/asteroids/
/crosswalk/
/simon/
/sudoku/
/lunar-lander/
/connect-four/
/sky-hopper/
/helicopter-cave/
```

## License

本仓库中的自维护小游戏代码采用 MIT License。

本仓库不包含任何 API token、账号凭证或运行时密钥。

## Credits

- Classic 2048: maintained in this repository
- Sky Patrol: maintained in this repository
- Classic Tetris: maintained in this repository
- Classic Snake: maintained in this repository
- Breakout: maintained in this repository
- Minesweeper: maintained in this repository
- Alien Formation: maintained in this repository
- Neon Maze: maintained in this repository
- Gomoku: maintained in this repository
- Pong: maintained in this repository
- Sokoban: maintained in this repository
- Asteroids: maintained in this repository
- Crosswalk: maintained in this repository
- Simon: maintained in this repository
- Sudoku: maintained in this repository
- Lunar Lander: maintained in this repository
- Connect Four: maintained in this repository
- Sky Hopper: maintained in this repository
- Helicopter Cave: maintained in this repository

> 本仓库中的小游戏为自维护实现；名称仅用于描述经典玩法。

## Changelog

### 2026-08-09

- Replaced the former 2048 copy with a self-maintained implementation.
- Added Sky Patrol.
- Sky Patrol uses automatic firing and includes mobile movement and pause controls.
- Added Classic Tetris with keyboard and touch controls.
- Added Classic Snake with wrap-around walls.
- Added Breakout, Minesweeper, Alien Formation, and Neon Maze.
- Added Gomoku with human-vs-computer play.
- Added Pong, Sokoban, Asteroids, Crosswalk, and Simon as original self-maintained browser games.
- Added Sudoku with unique puzzle generation, notes, hints, timer, and mobile controls.
- Added Lunar Lander and Connect Four with full keyboard and mobile controls.
- Added Sky Hopper with automatic bouncing, scrolling platforms, and complete mobile controls.
- Added Helicopter Cave with single-action flight, procedural cave generation, and progressive speed.
- Deleted the Gomoku directory and rebuilt it from an empty directory with a new rules engine, UI, input handling, and test suite.
