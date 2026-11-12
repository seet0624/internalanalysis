---
name: hq-new-tool
description: Add a new review tool / feature page to the 审核总部 site and wire it into login, the 3D HQ office and the Command Center. Use when the user wants a new 审核 function (e.g. 合同审核, 地址审核), a new page in the site, or wants an existing tool to report events so staff and AI employees react to it. Triggers on 加新功能, 新的审核, 新工具, new review tool, new page, report to HQ.
---

# 审核总部：加一个新工具

整个网站是静态文件（GitHub Pages / 阿里云 OSS），国内要能打开：**不能用 Google 字体、外网 CDN**，组件放 `vendor/`。

## 步骤

1. **新文件夹** `xxx/index.html`。开头载入：
   ```html
   <script src="../hq/auth.js"></script>
   <script src="../hq/bus.js"></script>
   ```
   左上角放 `<a href="../">审核总部</a>`。Excel 用 `../vendor/exceljs.min.js`、zip 用 `../vendor/jszip.min.js`。
2. **权限**：`hq/auth.js` 的 `ACCESS` —— 国内客服（`cs`）要用就把 `'xxx/'` 加进 `cs` 的清单；老板是 `'*'`。
3. **存东西**：`localStorage` 的 key 加这个工具自己的前缀（现在有 `mzys_` 名字审核、`tsr-` 技术单、`hq-` 总部、`cmd-` 指挥中心）。
4. **处理完文件就报告**（真实数字，不要编）：
   ```js
   window.HQBus && HQBus.emit({ tool: 'xxx', kind: 'processed', files: 3, items: 40, problem: 5 });
   ```
5. **3D 审核总部**（`hq/company.js`）：
   - 客服部的「新功能工位」改成 `kind: 'site'`、`href: 'xxx/'`，填员工（名字、`role`、`duty`、`trait`）。
   - `workflows['xxx.processed']` 写交接步骤：`{ from: '组id/序号', to: '组id/序号' | 'boss' | 'place:files', say: '…{problem}…', reply: '…', when: 'problem>0' }`，`{数字名}` 会换成事件里的数字。
6. **指挥中心**（`command-src/`）：
   - `src/data/departments.json` 加部门，`"team": "cs.组id"` 让员工用真实名单；房间放 2F（看 `command-center` skill 的平面规则）。
   - `src/lib/company.ts`：`TOOL_OF_TEAM` 加 `'cs.组id': 'xxx'`，`describeEvent` 加这个工具的中英文描述，`realTasks` / `realMessages` 把事件分给对的部门。
   - `npm run build`。
7. **README.md** 的「功能」表和「文件」表补上新工具。

## 验证

本地开服务器（网站根目录 `python3 -m http.server 8765`），用 Playwright 或浏览器：

- 没登入开 `xxx/` 会被带回首页登入，登入后回到 `xxx/`；国内账号 `dongfangcs` 能不能进符合预期
- 处理一份测试文件后 `HQBus.list()` 最后一笔是这个工具的事件、数字正确
- 回首页 3D 总部：员工照 workflow 走去交接、「公司对话」有对话
- 用老板账号开 `command/`：2F 对应的 AI 员工状态变「工作中 / 已完成」，任务、执行纪录有这一笔，上方出现即时通知（客服账号进不了 `command/`）
- 主控台没有错误
