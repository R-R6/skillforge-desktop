# wechat-devtools

> 微信开发者工具 MCP - 使用 Node.js uniapp-wechat-mcp 通过官方 CLI 和 miniprogram-automator SDK 进行小程序构建、预览、截图、日志采集与自动化测试。适用于 uniapp 微信小程序，项目路径可自动发现 unpackage/dist/dev/mp-weixin。

支持平台: codex, cursor, claude, openclaw, hermes

## Prompt

# WeChat DevTools MCP Skill

本 skill 对应当前 Node.js 版 `uniapp-wechat-mcp`。运行时能力走微信开发者工具 CLI 和 `miniprogram-automator` SDK；项目路径由 workspace 自动发现或通过工具参数传入。

## 配置

MCP 客户端只需要配置一个环境变量：

```json
{
  "mcpServers": {
    "wechat-devtools": {
      "command": "npx",
      "args": ["-y", "uniapp-wechat-mcp"],
      "env": {
        "WECHAT_DEVTOOLS_CLI": "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
      }
    }
  }
}
```

Windows 的 `WECHAT_DEVTOOLS_CLI` 通常是微信开发者工具安装目录下的 `cli.bat`。

必须手动开启微信开发者工具服务端口：`设置` -> `安全设置` -> `服务端口` -> `开启`。

## 端口规则

- `wechat_ide(action="status")` 识别到的是微信开发者工具 CLI 服务端口，只用于 `open` / `compile` / `preview` 等 CLI 命令。
- 截图、页面跳转、元素点击、console 日志读取走 `miniprogram-automator` WebSocket 自动化端口，默认是 `9420`。
- 不要把 `status` 里识别出来的服务端口传给 `auto_port`。通常直接不传 `auto_port`，先调用 `wechat_automator(action="start")`，后续 `wechat_screenshot` / `wechat_navigate` / `wechat_inspector` 会复用正确端口。
- 如果误把服务端口传给 `auto_port`，MCP 会自动回落到默认自动化端口并在返回数据里给出 `warning`。

## 项目路径规则

- 优先不传 `project_path`，让 MCP 从当前 workspace 自动发现。
- 对 uniapp 项目，可传源码根目录；工具会自动使用 `unpackage/dist/dev/mp-weixin` 或 `unpackage/dist/build/mp-weixin`。
- 如果传的是原生微信小程序目录，该目录需要包含 `project.config.json` 和 `app.json`。
- 如果诊断中 AppID 为空，先检查是否传错了目录。

## 标准流程

新会话或新环境：

```text
wechat_ide(action="status")
wechat_ide(action="is_login")
wechat_ide(action="open")
wechat_automator(action="start")
wechat_file(action="project_info")
wechat_automator(action="page_data")
```

代码变更后：

```text
wechat_build(action="compile")
wechat_automator(action="page_data")
```

页面调试：

```text
wechat_file(action="list_pages")
wechat_navigate(page_path="pages/xxx/index", wait_ms=1000)
wechat_automator(action="page_data")
wechat_automator(action="element_info", selector=".target")
wechat_screenshot()
```

异常排查：

```text
wechat_automator(action="page_data")
wechat_inspector(action="console", duration=3, detail_level="full")
wechat_build(action="compile")
```

## 工具速查

| Tool | 用途 |
| --- | --- |
| `wechat_ide` | `status` / `open` / `login` / `is_login` / `close` / `quit` |
| `wechat_build` | `compile` / `preview` / `upload` / `build_npm` / `cache_clean` |
| `wechat_automator` | `start`、元素交互、页面 data、wx API、mock、evaluate |
| `wechat_inspector` | automator console / exception 日志采集，仅 `action="console"` |
| `wechat_screenshot` | automator SDK 截图 |
| `wechat_navigate` | 自动判断 tabBar 并 `switchTab`，否则 `reLaunch`，同时采集运行时日志 |
| `wechat_file` | 读取项目信息、页面列表、页面源码、单文件 |
| `agents` | 读取随 npm 包附带的 `.agents` skill 路径 |

详细参数见 `references/tool_reference.md`。只有需要精确参数、返回结构或失败处理时再读取该文件。

## 使用原则

- 整个会话通常只需要 `wechat_ide(open)` 和 `wechat_automator(start)` 一次。
- 没改代码时，不要反复 `open` 或 `compile`；直接 `wechat_navigate` / `evaluate` / `page_data`。
- 改了代码后只跑 `wechat_build(compile)`，它会尝试刷新 automator 连接。
- 截图和日志直接用 `wechat_screenshot` 和 `wechat_inspector(action="console")`。
- `upload` 是发布操作，除非用户明确要求并给出版本号，否则不要调用。
- `close` / `quit` 会影响用户 IDE，会话中通常不要主动调用。
- 页面验证以 `page_data.path` 和关键字段为准，截图只作为视觉辅助。

## 常见恢复

| 现象 | 处理 |
| --- | --- |
| automator 连接断开 | `wechat_automator(action="start")` 后再 `page_data` |
| 页面跳转后仍在登录页 | 检查登录态、路由守卫、目标路径是否有效 |
| `build_npm` 报 `__NO_NODE_MODULES__` | 当前小程序产物没有可构建 npm 包，通常不是 MCP 故障 |
| 元素找不到 | 先 `page_data` 确认页面，再 `read_page` 查真实 class/结构 |
| AppID 为 `undefined` 或空 | 确认解析到的是 `mp-weixin` 或包含 `project.config.json` 的小程序根目录 |
