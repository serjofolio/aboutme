# HYF-OS · 黄奕锋的个人网站

🌐 **在线访问：https://aboutme.hyff.cc.cd**

一个黑金骇客风格的个人介绍网站：开场启动动画、字符雨背景、多页面切换转场，以及一个接入真实大模型的「AI 分身」。

## 页面

| 页面 | 内容 |
|---|---|
| 家 | 居中名片、系统状态面板、实时日志、入口 Dock |
| 关于 | 照片转 ASCII 字符画（鼠标悬停解码真实照片）、成长路径、Agent 方法论 |
| 技能 | 可交互的技能星图（力导向布局，悬停查看关联） |
| 经历 | git log 风格的分支图时间线 |
| 项目 | TikTok 跨境电商运营台、全能运营智能体（含 Agent 模拟运行） |
| 机器人 | 点云 / 位姿可视化、双臂逆运动学交互示意、Unitree G1 现场照片 |
| 生活 | 羽毛球场（点击扣杀）、偶像 |
| 资料库 | 学习资料推荐 + 项目踩坑笔记 |
| 分身 | AI 分身问答：接入自己配置的大模型，未接入时回退到本地知识库 |
| 终端 | 可交互命令行：`neofetch`、`cd robot`、`theme green`、`hack` … |

另有：浏览器实时合成的背景音乐（右下角「空间：聆听」）、三种配色、键盘快捷键（`1`–`9`/`0` 跳页，`M` 菜单）。

## 技术

- 前端：原生 HTML / CSS / JavaScript，无框架、无构建步骤；Canvas 动画，Web Audio 合成音乐
- 后端：`server.js`，零依赖 Node.js（18+），负责静态文件、AI 分身流式问答、模型接入后台
- 模型接入：仿 CC Switch 的配置后台 `admin.html`，支持 OpenAI 兼容与 Anthropic 协议（DeepSeek、智谱 GLM、Kimi、通义、豆包、OpenAI、Claude 等）

## 本地运行

```bash
node server.js          # 打开 http://localhost:5200
```

Windows 直接双击 `start.bat`。模型在 `http://localhost:5200/admin.html` 配置（首次打开需设置后台密码）。

网站内容（个人资料、AI 分身知识库、资料库、踩坑笔记）集中在 `assets/profile.js`。

## 安全设计

- API Key 只保存在服务器的 `data/twin.json`（已被 `.gitignore` 排除，不在本仓库中），接口永远不会返回给浏览器
- 线上设置 `TWIN_ADMIN_LOCAL=1`：模型后台只允许服务器本机访问
- `ALLOWED_HOSTS` 只接受指定域名访问；服务只监听 `127.0.0.1`，通过 Cloudflare Tunnel 对外
- 访客提问限流：每个 IP 10 分钟 20 次；后台登录失败 10 次锁定 15 分钟

## 部署

服务器上以 systemd 服务运行，经 Cloudflare Tunnel 暴露到 `aboutme.hyff.cc.cd`：

```ini
Environment=HOST=127.0.0.1
Environment=PORT=5200
Environment=DATA_DIR=/var/lib/aboutme
Environment=ALLOWED_HOSTS=aboutme.hyff.cc.cd
Environment=TWIN_ADMIN_LOCAL=1
ExecStart=/usr/bin/env node server.js
```
