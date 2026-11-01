---
name: command-center
description: Add or change floors, rooms, departments, employees, AI employees, tasks, projects or messages in the AI Company Command Center (/command/, source in command-src/). Use when the user asks to add a department, hire/add an AI employee or staff member, add a room or floor, change who sits where, add demo tasks, or rebuild the command center. Triggers on 指挥中心, 加部门, 加 AI 员工, 加员工, 加楼层, 加房间, command center, add department, add AI agent.
---

# AI 公司指挥中心：改资料

指挥中心是 `command-src/` 里的 Vite + React + TypeScript + Tailwind + React Three Fiber 项目，打包到网站的 `command/`。**界面不用改**，大部分需求都只改 `command-src/src/data/*.json`，再重新打包。

## 资料在哪里

| 文件 | 内容 |
|---|---|
| `src/data/floors.json` | 7 层楼（`level` B1=-1 … R=5），每层的房间 `rooms` |
| `src/data/departments.json` | 部门：在哪层 `floor`、哪个房间 `room`、颜色、简介 |
| `src/data/people.json` | 示范员工和示范 AI 员工 |
| `src/data/tasks.json` / `projects.json` / `messages.json` / `insights.json` | 任务、项目、公司对话、AI 建议 / 警报 / 通知 |
| `hq/company.js`（网站根目录） | **真实名单**：部门写了 `team` 的（客服部三个组、财务、人事、法务、营销、数据），员工从这里来，不要抄进 people.json |

型别定义在 `src/types.ts`。所有给人看的文字都是 `{ "zh": "…", "en": "…" }`，两种都要写。

## 规则

1. **示范资料一律加 `"demo": true`**，界面会标「示范」。真实资料（客服名单、审核纪录）不要标 demo。不要编造真实人名当成真实员工。
2. 楼层平面是 36 × 22 公尺，左上角 (0,0)。中间 `z 9.5–12.5` 是走廊，`x 15–21, z 0–9.5` 是电梯核心，房间不能压到。北边房间 `z 0–9.5`，南边 `z 12.5–22`。
3. 房间 `kind` 决定 3D 里摆什么家具：`office`（工位，用 `seats` 设工位数）、`exec`、`meeting`、`board`、`lounge`、`waiting`、`pavilion`、`coffee`、`garden`、`solar`、`server`、`compute`、`network`、`monitor`、`maintenance`、`power`、`reception`、`security`、`showroom`、`training`、`core`。新家具类型要改 `src/scene/layout.ts` 的 `furnish()`。
4. 员工会自动坐到自己部门房间的工位上（`layout.ts` 产生的 `seats`）；人比工位多，多的人站在房间里。加人时顺便确认 `seats` 够。
5. id 用小写英文、不重复。员工 id 习惯写 `部门id-两位数字`。
6. 颜色只用数易品牌色和它的深浅（金、古铜、鼠尾草绿、陶土、石色、沙色），**不要蓝色**；界面颜色改 `src/index.css` 的 token，不要在元件里写死。
7. 状态只能是 `working` `available` `thinking` `waiting` `completed` `error`。

## 常见做法

**加一位 AI 员工**（例：给订单管理组加一位）——在 `people.json` 加：

```json
{ "id": "orders-60", "name": { "zh": "Ledgerly", "en": "Ledgerly" }, "type": "ai", "dept": "orders",
  "title": { "zh": "AI 退款助理", "en": "AI Refund Assistant" }, "status": "working", "perf": 90,
  "task": { "zh": "检查 8 张退款申请", "en": "Checking 8 refund requests" },
  "history": [{ "ago": 5, "text": { "zh": "开始：检查退款申请", "en": "Started: checking refunds" } }], "demo": true }
```

**加一个部门**：先在 `floors.json` 那层找空位加一个 `office` 房间（或把现有房间改成这个部门的），再在 `departments.json` 加部门（`room` 指向那个房间、`floor` 对上），最后在 `people.json` 加成员。

**要用真实名单的部门**：在 `departments.json` 写 `"team": "hq部门id"` 或 `"team": "cs.组id"`，员工从 `hq/company.js` 读，`src/lib/company.ts` 会合进来；名字的英文拼音、职称英文在 `company.ts` 的 `NAME_EN`、`ROLE_EN` 补。

**真实审核纪录**：名字审核、技术单审核用 `HQBus.emit()` 记事件，`company.ts` 的 `realStatus` / `describeEvent` 把事件变成 2F 员工的状态、任务、执行纪录。新工具要接进来，看 `hq-new-tool` skill。

**功能清单**（一打开看到的「我们有 N 个功能」）：`src/lib/features.ts` 从 `hq/company.js` 读审核工具（`kind: 'site'`）、资料（`library`）、Claude 助手（有 `skill` 的员工），加新工具通常只要改 `hq/company.js`。

**权限**：哪个账号能进哪层在 `src/lib/store.tsx` 的 `canEnter`（老板全部、国内客服只有 2F）。页面能不能进在 `hq/auth.js` 的 `ACCESS`。

## 改完一定要做

```bash
cd command-src && npm ci   # 第一次才要
npm run check              # 检查资料：重复 id、房间重叠、压到走廊、部门房间不存在……
npm run build              # 检查 + 型别检查 + 打包到 ../command/
```

`npm run check` 有 ✗ 就先修好。打包后用本地服务器看一下（在网站根目录 `python3 -m http.server 8765`，开 `http://localhost:8765/command/`，要先在首页登入）。把 `command-src/` 的改动和打包出来的 `command/` 一起 commit。
