# 审核总部 · 给 Claude 的规则

- 改程序开 PR 以后、合并以前，先请审核部 AI 看过：Judge（程序正确性）、Hunter（找隐藏错误、被吞掉的错误）、Shield（安全、资料外泄）。必须修的修好、测试重跑过，再请老板决定合并。
- 名字审核网页（name/）的技术单，审完可以用「⋯ → AI 复核」复制指令，交给名字审核组的 AI 复核员（martin-toolkit:name-sheet-audit）再查一次。
- 改名字审核网页（name/）前后都跑 `node name/tests/run.js`，全过才交审核部、开 PR。
- 客服拿来的新文件出了问题（文件名、日期、格式）：先在 `name/tests/naming-cases.json` 加一条（或在 run.js 的假资料技术单加一种情况），确认测试会失败，再改程序直到全过。测试里只放假资料，不放真实学员姓名、订单号。
