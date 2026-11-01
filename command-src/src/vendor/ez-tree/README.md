# ez-tree（内嵌版）

来源：[@dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) 1.1.0，MIT 授权（见 LICENSE），作者 Daniel Greenheck。
程序化产生真实的树（树枝 + 树皮贴图 + 树叶贴图、会随风摆动）。

改动：树叶摆动的 shader 加上 `instanceMatrix`（才能用 InstancedMesh 种很多棵）；`textures.js` 只载入橡树 / 桦树树皮和 4 种树叶，贴图缩小到 256–512px（原版全部 1K 贴图约 4MB）。
`assets/grass.jpg` 来自同一个仓库的示范草地贴图。树皮贴图原始来源见原仓库 `assets/bark/README.md`（Poly Haven CC0、TextureCan）。
