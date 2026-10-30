# 审核系统

国内同事用的审核网站。打开首页选功能，所有处理都在浏览器里完成，文件不会上传到任何服务器。不需要登录。

## 功能

| 网址 | 功能 | 说明 |
|---|---|---|
| `/` | 首页 | 列出所有审核功能 |
| `name/` | 名字审核 | 名正言顺名册：核对新名（撞字、撞音、不雅谐音），转繁体，下载结果 |
| `tech/` | 技术单审核 | 按规则标红、分文件、改页脚，下载给专家。详见 [`tech/README.md`](tech/README.md) |

每个功能左上角的「审核系统」可以回到首页。

## 国内访问

- 不用 Google 字体，改用电脑自带的中文字体（苹方、微软雅黑、宋体 / 细明体）
- ExcelJS 4.4.0、JSZip 3.10.1 放在 `vendor/`，跟网站一起放，不依赖外网 CDN；本地文件没载入时才退回 cdnjs / jsdelivr
- 整个网站是静态文件，放到任何能放网页的地方都能用

## 上线

放在阿里云 OSS 香港区，绑自己的域名，不用 ICP 备案。第一次设置照 [`deploy/上线步骤.md`](deploy/上线步骤.md) 做；设好以后，每次合并到 `main` 网站自动更新（`.github/workflows/deploy-oss.yml`）。

只看会上传哪些文件：`DRY_RUN=1 node deploy/upload-oss.mjs`

## 文件

```
index.html          首页（功能清单在里面的 MODULES）
name/index.html     名字审核
tech/index.html     技术单审核台（界面）
tech/review-engine.js  技术单审核规则引擎
vendor/             ExcelJS、JSZip
deploy/             上传到阿里云 OSS 的程序和上线步骤（不会放上网站）
```

## 加新功能

1. 新建一个文件夹，例如 `contract/index.html`
2. 要读写 Excel 就用 `../vendor/exceljs.min.js`、`../vendor/jszip.min.js`
3. 页面左上角放一个 `<a href="../">审核系统</a>` 回首页
4. 在首页 `index.html` 的 `MODULES` 里加一项（网址、一个字的图标、标题、说明）
5. 要在浏览器里存东西（`localStorage`），名字前面加上这个功能自己的前缀，避免和别的功能撞名。现在用的：名字审核 `mzys_`，技术单 `tsr-`

## 来源

- 名字审核原本在 `seet0624/nameanalysis` 仓库，2026-10-30 搬进来，以后在这里改
- 技术单审核台原本就在这个仓库的根目录，搬到 `tech/`
