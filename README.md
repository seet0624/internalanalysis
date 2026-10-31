# 审核总部

国内同事用的审核网站。首页是一间 3D 公司：老板办公室、审核部门、Claude 部门、设施（连接器），点员工就能开始工作。审核工具在浏览器里处理，文件不会上传到任何服务器。不需要登录。

## 功能

| 网址 | 功能 | 说明 |
|---|---|---|
| `/` | 首页 | 3D 公司 + 组织架构。名单在 `hq/company.js` |
| `name/` | 名字审核 | 名正言顺名册：核对新名（撞字、撞音、不雅谐音），转繁体，下载结果；国内的技术单另外可以下载给督导的文件 |
| `tech/` | 技术单审核 | 按规则标红、分文件、改页脚，下载给专家。详见 [`tech/README.md`](tech/README.md) |

每个功能左上角的「审核总部」可以回到首页。

## 公司名单（`hq/company.js`）

首页的 3D 公司和「组织架构」都按这份名单画，改名单就好，不用动 3D 程序：

- **部门** `departments`：`kind` 是 `site`（网站里的工具，点员工进入 `href`）、`claude`（Claude 里的 skill，点员工复制 `/插件:skill` 指令）或 `planned`（筹备中的空办公室）
- **员工** `agents`：名字、岗位、负责什么；Claude 部门的员工要写 `skill`
- **设施** `connectors`：连接器，`kind` 决定摆设（`mail` 收发室、`files` 档案室、`meeting` 会议室、`design` 设计室）

部门按顺序三间一排往下排；老板办公室在最上面中间，设施分在两边。

## 国内访问

- 不用 Google 字体，改用电脑自带的中文字体（苹方、微软雅黑、宋体 / 细明体）
- ExcelJS 4.4.0、JSZip 3.10.1、Three.js 0.170.0 放在 `vendor/`，跟网站一起放，不依赖外网 CDN；Excel / zip 本地文件没载入时才退回 cdnjs / jsdelivr
- 显示不了 3D 的电脑，首页下面的「组织架构」一样可以用
- 整个网站是静态文件，放到任何能放网页的地方都能用

## 上线

放在阿里云 OSS 香港区，绑自己的域名，不用 ICP 备案。第一次设置照 [`deploy/上线步骤.md`](deploy/上线步骤.md) 做；设好以后，每次合并到 `main` 网站自动更新（`.github/workflows/deploy-oss.yml`）。

只看会上传哪些文件：`DRY_RUN=1 node deploy/upload-oss.mjs`

## 文件

```
index.html          首页：3D 公司、详细资料、组织架构
hq/company.js       公司名单（部门、员工、设施）
hq/office.js        3D 公司（按名单盖办公室、摆员工）
name/index.html     名字审核
tech/index.html     技术单审核台（界面）
tech/review-engine.js  技术单审核规则引擎
vendor/             ExcelJS、JSZip、three/（Three.js）
deploy/             上传到阿里云 OSS 的程序和上线步骤（不会放上网站）
```

## 加新功能

1. 新建一个文件夹，例如 `contract/index.html`
2. 要读写 Excel 就用 `../vendor/exceljs.min.js`、`../vendor/jszip.min.js`
3. 页面左上角放一个 `<a href="../">审核总部</a>` 回首页
4. 在 `hq/company.js` 的 `departments` 里加一个 `kind: 'site'` 的部门（可以直接把「下一个部门」改掉）
5. 要在浏览器里存东西（`localStorage`），名字前面加上这个功能自己的前缀，避免和别的功能撞名。现在用的：名字审核 `mzys_`，技术单 `tsr-`

## 来源

- 名字审核原本在 `seet0624/nameanalysis` 仓库，2026-10-30 搬进来，以后在这里改
- 技术单审核台原本就在这个仓库的根目录，搬到 `tech/`
