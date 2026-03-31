# 卫戍协议头像生成器（SealDice / LLBot / QQ）
<img width="1059" height="3118" alt="image" src="https://github.com/user-attachments/assets/f8889de4-5984-42b7-93c7-4f060ef9a516" />

用于 SealDice 的 QQ 头像生成扩展。

支持两种输入方式：
- `.卫戍头像 [图片]`：以消息中的图片生成头像
- `.卫戍头像`：以发送者的 QQ 头像生成头像

仓库主要包含两部分：
- `ws-avatar.js`：SealDice JS 扩展，负责命令处理、取图和回复
- `avatar-helper/`：本地 Node.js 服务，负责合成头像并上传到 Sealdice 资源库

`stronghold-protocol-avatar/` 用于保留原始原型、素材和样式参考。当前实际生成流程基于后端 `sharp`，不依赖浏览器截图。

## 3 分钟快速开始

按以下顺序操作：

1. 安装 helper 依赖

```powershell
cd avatar-helper
npm install
```

2. 新建 `avatar-helper/.env`

```env
PORT=8787
SEALDICE_BASE_URL=http://127.0.0.1:3211
SEALDICE_AUTHORIZATION=Bearer xxxxxxx
SEALDICE_TOKEN=xxxxxxx
SEALDICE_WEBUI_TOKEN=xxxxxxx
```

认证字段的获取方法见下文“Sealdice 认证获取”。

3. 启动 helper

```powershell
npm start
```

启动成功时应看到：

```text
helper listening on http://127.0.0.1:8787
```

4. 检查服务状态

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

返回中包含 `ok: true` 即可。

5. 将根目录的 `ws-avatar.js` 导入 SealDice JS 扩展

6. 在 QQ 中发送：

```text
.卫戍头像
```

或：

```text
.卫戍头像 [图片]
```

如果运行失败，优先检查：
- helper 是否在线
- `.env` 中的认证字段是否正确
- `ws-avatar.js` 是否已加载到 SealDice

## 使用前准备

开始前请确认：
- 已安装 SealDice
- SealDice 已接入 QQ
- 当前环境支持 LLBot / OneBot 等 QQ 消息收发
- 本机已安装 Node.js

建议 Node.js 版本：`20` 或更高。

## 启动 helper

进入目录：

```powershell
cd avatar-helper
```

安装依赖：

```powershell
npm install
```

配置 `.env` 后启动：

```powershell
npm start
```

正常输出示例：

```text
[helper] renderer: sharp
helper listening on http://127.0.0.1:8787
```

也可通过 `/health` 检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

## Sealdice 认证获取

helper 在生成图片后，需要将图片上传到 Sealdice 资源库，因此必须提供 WebUI 认证信息。

需要填写的字段为：
- `SEALDICE_AUTHORIZATION`
- `SEALDICE_TOKEN`
- `SEALDICE_WEBUI_TOKEN`

获取步骤：

1. 打开 Sealdice WebUI，一般为 `http://127.0.0.1:3211`
2. 正常登录
3. 按 `F12` 打开开发者工具
4. 切换到 `Network`
5. 刷新页面
6. 打开任意一个发往 `127.0.0.1:3211` 的请求

### `Authorization`

在 `Request Headers` 中找到：

```text
Authorization: Bearer xxxxxxx
```

将整段值填入：

```env
SEALDICE_AUTHORIZATION=Bearer xxxxxxx
```

注意保留 `Bearer` 前缀。

### `token`

在 `Request Headers` 中找到：

```text
token: xxxxxxx
```

填入：

```env
SEALDICE_TOKEN=xxxxxxx
```

### `webui_token`

方法一：查看请求头中的 `Cookie`

```text
Cookie: webui_token=xxxxxxx; 其他字段...
```

将 `webui_token=` 后的值填入：

```env
SEALDICE_WEBUI_TOKEN=xxxxxxx
```

方法二：查看浏览器 Cookie

```text
Application -> Cookies -> http://127.0.0.1:3211
```

找到 `webui_token` 并复制其值。

`.env` 示例：

```env
PORT=8787
SEALDICE_BASE_URL=http://127.0.0.1:3211
SEALDICE_AUTHORIZATION=Bearer xxxxxxx
SEALDICE_TOKEN=xxxxxxx
SEALDICE_WEBUI_TOKEN=xxxxxxx
```

常见错误：
- `SEALDICE_BASE_URL` 端口错误
- `Authorization` 缺少 `Bearer ` 前缀
- 复制内容包含额外空格
- 重新登录 WebUI 后旧 token 失效

## 在 SealDice 中导入插件

将根目录的 `ws-avatar.js` 导入 SealDice JS 扩展。

如果已加载旧版本，修改后需要重新加载或重启。

## 使用方法

### 以聊天图片生成

发送：

```text
.卫戍头像 [图片]
```

插件会读取消息中的图片 CQ 码并提交给 helper。

### 以 QQ 头像生成

发送：

```text
.卫戍头像
```

当消息中不包含图片时，插件会尝试从消息上下文中提取发送者 QQ 号，并使用对应 QQ 头像生成。

## 常见问题

### 仅发送 `.卫戍头像` 时为什么会失败

该路径依赖消息上下文中的 QQ 号。

如果当前环境无法提供发送者 QQ 号，则无法自动读取 QQ 头像。此时请改为附图使用。

### helper 已启动但生成失败

优先检查：
- `/health` 是否正常返回
- `.env` 中的三个认证字段是否仍然有效
- Sealdice WebUI 是否可正常登录
- `ws-avatar.js` 中配置的 helper 地址是否为当前机器的 `8787`

### 是否仍需运行前端项目

仅使用骰娘部分的话，不需要。

当前实际生成入口为 `avatar-helper/server.js`。前端目录仅用于保留原型、素材和样式参考。

## 常改文件

### `avatar-helper/server.js`

负责头像合成。常调参数包括：
- `OUTPUT_SIZE`：输出分辨率
- `GRID_LINE_HEIGHT`：扫描线厚度
- `GRID_GAP`：扫描线间距
- `BADGE_RATIO`：右上角角标大小

### `ws-avatar.js`

SealDice 插件脚本。

如果需要修改命令名、提示语、取图逻辑或 QQ 头像回退逻辑，修改该文件。

## 目录结构

```text
ws-avatar/
├─ ws-avatar.js
├─ avatar-helper/
│  ├─ server.js
│  ├─ package.json
│  └─ .env
└─ stronghold-protocol-avatar/
   ├─ public/
   └─ src/
```
