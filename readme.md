
分享功能

1. "一键复制完整内容" — 把文案 + 链接一起复制，用户直接粘贴到微信就是一条完整消息：
🏆 我赢了【推箱子】！快来挑战我吧！
⏱️01:23  Moves: 42
👉 https://puzzlepk.com/games/sokoban
2. 快捷分享平台按钮 — X (Twitter)、Telegram 有网页分享 API，一键跳转并预填好文案。微信没有 Web API，只能靠复制+扫码。
3. 分享图片（较复杂） — 用 Canvas 生成一张成绩卡图片，用户可以长按保存后发到朋友圈。这个效果最好但工作量大，可以放后续迭代。


1. 新纪录强化分享 - 新纪录时弹出金色高亮分享卡
2. 升级分享 - 升级时在 XP 区块下方出现"分享升级"按钮
3. 连胜分享 - 新建 StreakService，连赢 ≥3 局自动显示橙色连胜横幅
4. 挑战直链 - 分享 URL 附加 ?challenge=username，GameLobbyPanel 检测后显示挑战横幅
5. PK 等待室邀请卡 - 原来小图标改成全宽蓝色邀请卡块
6. 个人成就卡片 - Profile 页加"分享主页"按钮，生成 Canvas 卡片


git push 后, cloudflar 编译后 ,浏览器访问一直出现Redirecting to /zh/lobby 在循环，浏览器一直在转