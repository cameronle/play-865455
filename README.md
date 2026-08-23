# play-865455

`play.865455.xyz` 的小游戏集合，使用 Cloudflare Pages 部署。

## 游戏列表

<!-- BEGIN GENERATED: game-list -->
- [Classic 2048](./2048/) — 本仓库自维护的纯 HTML5/CSS/JavaScript 2048，支持键盘、触摸、计分和本地最高分。
- [Sky Patrol](./shooter/) — 自维护的 HTML5 Canvas 街机飞行射击游戏，支持自动发射、关卡、生命、道具、音效和移动端触控。
- [Classic Tetris](./tetris/) — 自维护的纯 HTML5 Canvas 俄罗斯方块，支持键盘、完整触控、计分、等级、下一个方块和本地最高分。
- [Classic Snake](./snake/) — 自维护的纯 HTML5 Canvas 贪食蛇，支持键盘、触摸、加速和穿墙玩法。
- [Breakout](./breakout/) — 自维护的纯 HTML5 Canvas 打砖块，支持反弹、关卡、生命、本地最高分、手机拖动和一键开始发球。
- [Minesweeper](./minesweeper/) — 自维护的经典扫雷，包含 20 个逐关解锁的关卡，支持首次落子保护、点击、右键或长按插旗、计时和每关本地最佳时间。
- [Alien Formation](./space-invaders/) — 自维护的经典固定阵型射击游戏，支持自动发射、左右移动、波次、受击保护、手机触控和本地最高分。
- [Neon Maze](./maze/) — 原创迷宫吃点游戏，支持寻路敌人、关卡、生命、本地最高分、手机滑动和触屏方向键。
- [Gomoku](./gomoku/) — 自维护的 15×15 人机五子棋，支持三档难度、撤销、鼠标与触控操作、最后落子标记和本地战绩。
- [Pong](./pong/) — 自维护的人机乒乓球游戏，支持指针拖动、目标比分和本地战绩。
- [Sokoban](./sokoban/) — 自维护的推箱子游戏，包含原创关卡，支持撤销、重置、键盘、滑动和触控操作。
- [Crosswalk](./crosswalk/) — 自维护的车流躲避街机游戏，包含 20 个逐关解锁关卡、信号节奏、路线选择、移动安全区，支持生命、键盘、滑动和触控操作。
- [Simon](./simon/) — 自维护的音序记忆游戏，包含四个触控色块、音效、严格模式和本地最高分。
- [Sudoku](./sudoku/) — 自维护的数独游戏，支持唯一解题目、三档难度、笔记、撤销、提示、错误计数、计时和本地最佳时间。
- [Lunar Lander](./lunar-lander/) — 自维护的月球着陆物理游戏，支持随机地形、有限燃料、递增重力、完整触控和本地最高分。
- [Connect Four](./connect-four/) — 自维护的人机四子棋，支持三档 AI、先手选择、撤销、触控操作和本地战绩。
- [Sky Hopper](./sky-hopper/) — 自维护的纵向平台跳跃游戏，支持自动弹跳、滚动场景、五种平台、键盘与触控操作和本地最高分。
- [Helicopter Cave](./helicopter-cave/) — 自维护的单键洞穴飞行游戏，支持程序生成的可通行地形、障碍、速度递增、键盘与触控操作和本地最远距离。
- [Endless Runner](./endless-runner/) — 自维护的横版跑酷游戏，支持高低跳、快速落地、按速度生成的公平障碍、坑洞、金币、触控操作和本地纪录。
- [Solitaire](./solitaire/) — 自维护的经典 Klondike 接龙，支持点选移动、双击自动收牌、撤销、提示和本地战绩。
- [Bubble Shooter](./bubble-shooter/) — 自维护的泡泡射手，支持触屏瞄准、墙壁反弹、同色消除、悬空掉落和本地最高分。
- [Nonogram](./nonogram/) — 自维护的数织像素谜题，包含 5×5、10×10 和 15×15 共 45 关，支持填充、标记、拖动绘制、撤销、提示、计时和本地最佳时间。
- [Flow Free](./flow/) — 自维护的连线填格解谜游戏，包含 4 种尺寸共 40 关，支持触摸拖动连线、全盘覆盖验证、关卡选择与最佳时间。
- [Bridges](./bridges/) — 自维护的数桥解谜游戏，包含 3 种尺寸共 30 关，支持岛屿架桥、并查集连通性验证、撤销与关卡选择。
- [15-Puzzle](./sliding-puzzle/) — 自维护的数字华容道，支持 3×3、4×4、5×5 三种尺寸、可解性乱序生成、整行整列滑动、键盘操作与本地最佳纪录。
- [Color Switch](./color-bounce/) — 自维护的色彩节拍弹跳街机，支持颜色匹配穿越、旋转几何体碰撞、换色道具与本地最高分。
- [Flappy Wings](./flappy/) — 自维护的极简飞行街机，支持单键轻触扑翼、重力加速度、平滑水管穿越与本地最高分。
<!-- END GENERATED: game-list -->

## 本地开发

直接使用任意静态文件服务器：

```bash
python3 -m http.server 8080
```

然后打开 `http://127.0.0.1:8080/`。

首页目录元数据以 `data/games.js` 为唯一来源。修改游戏名称、简介、排序或 README 文案后，运行：

```bash
npm run generate:catalog
npm test
```

## 部署

当前 Cloudflare Pages 项目名为 `2048`，目录结构直接对应线上路径：

<!-- BEGIN GENERATED: deploy-paths -->
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
/crosswalk/
/simon/
/sudoku/
/lunar-lander/
/connect-four/
/sky-hopper/
/helicopter-cave/
/endless-runner/
/solitaire/
/bubble-shooter/
/nonogram/
/flow/
/bridges/
/sliding-puzzle/
/color-bounce/
/flappy/
```
<!-- END GENERATED: deploy-paths -->

## 许可证

本仓库中的自维护小游戏代码采用 MIT License。

本仓库不包含任何 API token、账号凭证或运行时密钥。

## 维护说明

以上 28 款小游戏均由本仓库自行维护；游戏名称仅用于描述对应的经典玩法。

## 更新记录

### 2026-08-22

- 为小游戏首页增加中英双语国际化（i18n），默认显示中文，支持一键无刷新切换为英文与本地语言偏好记忆。
- 完整补充 28 款小游戏的中英双语名称、分类标签与玩法介绍。

### 2026-08-19

- 批量新增 5 款小游戏：Flow Free（40 关连线解谜）、Bridges（30 关数桥）、15-Puzzle（三种尺寸数字华容道）、Color Switch（色彩节拍跳跃）、Flappy Wings（极简单键飞行），均支持全平台触控、自动/深浅色主题与本地进度。
- 将 Crosswalk 从 8 关扩充至 20 关，加入公交车/卡车、车队、信号灯、施工路障、路线选择、移动安全区和章节检查点。
- 为 Crosswalk 增加关卡选择、逐关解锁、本地最佳分数/时间/无伤记录和移动端运行时测试。
- 重构小游戏首页，接入全站统一主题系统（AUTO/LIGHT/DARK），默认跟随系统主题，并将视觉风格调整为极简扁平设计，与各游戏子页保持统一。

### 2026-08-18

- 为 Minesweeper 增加 20 个逐关解锁的关卡，包含 EASY、NORMAL、HARD、EXPERT 四档难度。
- 为 Minesweeper 增加关卡选择、每关最佳时间、本地进度保存、通关自动标记雷区和下一关入口。

### 2026-08-12

- 新增 Nonogram，包含三种棋盘尺寸、九幅内置像素谜题、拖动绘制、撤销、提示和本地最佳时间。
- 将 Nonogram 从每种尺寸 3 关扩充至每种尺寸 12 关，共 36 关。
- 为 Nonogram 增加可视化关卡选择、通关进度保存、完成图案预览和每关最佳时间展示。
- 将 Nonogram 扩充至每种尺寸 15 关，共 45 关。
- 为 Nonogram 增加逐关自动存档、自动恢复上次棋局、进行中状态与重置按钮。
- 为 Nonogram 增加通关逐格点亮动画，并在动画后展示图案名称。
- 压缩 Nonogram 手机端状态区，按线索动态调整提示区，并确保核心操作完整显示且关卡包进度语义明确。
- 修正 Nonogram 失败重试：TRY AGAIN 会清空当前棋盘、错误次数和失败存档，并重新计时。

### 2026-08-09

- 使用自维护实现替换原有的 2048 副本。
- 新增 Sky Patrol，并加入自动发射、移动端移动和暂停操作。
- 新增 Classic Tetris，支持键盘和完整触控操作。
- 新增 Classic Snake，支持穿墙玩法。
- 新增 Breakout、Minesweeper、Alien Formation 和 Neon Maze。
- 新增人机 Gomoku，并从空目录重新构建规则引擎、界面、输入处理和测试套件。
- 新增 Pong、Sokoban、Asteroids、Crosswalk 和 Simon。
- 新增 Sudoku，支持唯一解生成、笔记、提示、计时和移动端操作。
- 新增 Lunar Lander 和 Connect Four，均支持完整键盘与移动端操作。
- 新增 Sky Hopper，支持自动弹跳、滚动平台和完整移动端操作。
- 新增 Helicopter Cave，支持单键飞行、程序化洞穴和递增速度。
- 新增 Endless Runner，支持高低跳、快速落地、公平障碍生成和移动端操作。
- 新增 Solitaire 和 Bubble Shooter，补充纸牌和触屏消除玩法。
