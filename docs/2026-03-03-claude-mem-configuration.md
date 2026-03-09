# Claude-Mem 配置指南：解决 CC 中转切换导致记忆系统失效的问题

## 背景

[claude-mem](https://github.com/thedotmack/claude-mem) 是 Claude Code 的记忆插件，通过 hooks 系统在每次工具调用后自动提取「观察」（observations），形成跨会话的长期记忆。

它的 observation agent 需要调用 LLM API 来分析工具输出并生成结构化记忆。**这个 API 调用与 Claude Code 本身使用的 API 是独立的。**

## 问题描述

### 症状

- claude-mem worker 运行正常（`curl http://localhost:37777/health` 返回 OK）
- 但数据库中 observations 始终为 0
- 日志中没有 observation 被处理的记录

### 根本原因

许多用户使用第三方中转服务（如 api.horsecoding.cc 等）访问 Claude API，并且会频繁切换不同的中转地址和 API key。

**Claude Code** 的 API 配置在 `~/.claude/settings.json` 的 `env` 字段中：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://your-proxy.example.com"
  }
}
```

**claude-mem** 的 API 配置在 `~/.claude-mem/.env` 和 `~/.claude-mem/settings.json` 中，默认使用 `claude` provider：

```json
{
  "CLAUDE_MEM_PROVIDER": "claude",
  "CLAUDE_MEM_CLAUDE_AUTH_METHOD": "api-key"
}
```

当 provider 为 `claude` 时，claude-mem 从 `~/.claude-mem/.env` 读取 `ANTHROPIC_API_KEY`，并使用**默认的 Anthropic API 端点**（api.anthropic.com）。

**问题链路：**

```
用户切换 CC 中转 → CC 本身正常工作
                  → claude-mem 的 .env 中 key/baseURL 没有同步更新
                  → observation agent 调用 API 失败
                  → 记忆不生成
                  → claude-mem 形同虚设
```

即使手动同步了配置，下次切换中转时又会失效。

## 解决方案：使用独立的免费 Provider

将 claude-mem 的 LLM provider 切换为 **OpenRouter**（或 Gemini），使用免费模型。这样 claude-mem 的 API 调用完全独立于 Claude Code，切换中转不影响记忆系统。

### 支持的 Provider

| Provider | 设置值 | 免费方案 |
|----------|--------|---------|
| Claude (Anthropic) | `claude` | 无免费方案，且依赖中转配置 |
| OpenRouter | `openrouter` | 有免费模型（如 `xiaomi/mimo-v2-flash:free`） |
| Gemini | `gemini` | 有免费额度（`gemini-2.5-flash-lite`） |

> **注意**：claude-mem 不支持 MiniMax 等其他 provider。如需使用 MiniMax，可通过 OpenRouter 间接调用。

### 配置步骤

#### 1. 获取 OpenRouter API Key

前往 [openrouter.ai](https://openrouter.ai) 注册账号，在 Keys 页面生成一个 API key。免费模型不消耗余额。

#### 2. 修改 claude-mem 配置

编辑 `~/.claude-mem/settings.json`，修改以下字段：

```json
{
  "CLAUDE_MEM_PROVIDER": "openrouter",
  "CLAUDE_MEM_OPENROUTER_API_KEY": "sk-or-v1-xxxxxxxxxxxxxxxx",
  "CLAUDE_MEM_OPENROUTER_MODEL": "xiaomi/mimo-v2-flash:free"
}
```

其他字段保持默认即可。

#### 3. 重启 Worker

```bash
# 查看当前 worker PID
cat ~/.claude-mem/worker.pid

# 停止 worker（替换为实际 PID）
kill <pid>

# 方法 A：重新启动 Claude Code 会话，worker 会自动启动
# 方法 B：手动启动
CLAUDE_PLUGIN_ROOT="$HOME/.claude/plugins/cache/thedotmack/claude-mem/$(ls $HOME/.claude/plugins/cache/thedotmack/claude-mem/)" \
  node "$CLAUDE_PLUGIN_ROOT/scripts/bun-runner.js" "$CLAUDE_PLUGIN_ROOT/scripts/worker-service.cjs" start
```

#### 4. 验证配置

```bash
# 检查 worker 健康状态
curl http://localhost:37777/health

# 确认 provider 已切换
curl -s http://localhost:37777/api/settings | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Provider:', d.get('CLAUDE_MEM_PROVIDER'))
print('Model:', d.get('CLAUDE_MEM_OPENROUTER_MODEL'))
print('Key:', 'configured' if d.get('CLAUDE_MEM_OPENROUTER_API_KEY') else 'missing')
"
```

预期输出：

```
Provider: openrouter
Model: xiaomi/mimo-v2-flash:free
Key: configured
```

## 架构对比

### 修复前

```
Claude Code ──(中转A)──→ Claude API     ← 用户频繁切换
claude-mem ──(中转A)──→ Claude API      ← 没有同步更新，失败！
```

### 修复后

```
Claude Code ──(中转A/B/C)──→ Claude API  ← 随意切换
claude-mem ──(OpenRouter)──→ Free Model   ← 独立稳定，不受影响
```

## 诊断命令速查

| 检查项 | 命令 |
|--------|------|
| Worker 状态 | `curl http://localhost:37777/health` |
| 当前配置 | `curl http://localhost:37777/api/settings` |
| 数据库完整性 | `sqlite3 ~/.claude-mem/claude-mem.db "PRAGMA integrity_check;"` |
| 观察数量 | `sqlite3 ~/.claude-mem/claude-mem.db "SELECT COUNT(*) FROM observations;"` |
| 会话摘要数量 | `sqlite3 ~/.claude-mem/claude-mem.db "SELECT COUNT(*) FROM session_summaries;"` |
| 待处理消息 | `sqlite3 ~/.claude-mem/claude-mem.db "SELECT COUNT(*) FROM pending_messages;"` |
| Worker 日志 | `tail -50 ~/.claude-mem/logs/claude-mem-$(date +%Y-%m-%d).log` |
| 端口占用 | `lsof -i :37777` |

## 已知的其他问题

### PostToolUse Hooks 不触发

如果日志中完全没有 `→ PostToolUse:` 记录，说明 Claude Code 的插件 hooks 没有正确触发。可能原因：

- Claude Code 版本与插件版本不兼容
- 插件需要重新安装

修复：在 Claude Code 中执行 `/install-plugin thedotmack/claude-mem` 重新安装。

### ChromaDB SOCKS 代理错误

日志中出现 `'socksio' package is not installed` 错误：

```bash
pip install httpx[socks]
```

或者在 settings 中禁用 ChromaDB：

```json
{
  "CLAUDE_MEM_CHROMA_ENABLED": "false"
}
```

### session-init 无 sessionId

日志中出现 `session-init: No sessionId provided, skipping (Codex CLI or unknown platform)`：

这通常是平台检测问题，重启 Claude Code 会话即可解决。

## 配置文件参考

| 文件 | 用途 |
|------|------|
| `~/.claude-mem/settings.json` | claude-mem 主配置（provider、模型、功能开关） |
| `~/.claude-mem/.env` | API key（仅 claude provider 使用） |
| `~/.claude-mem/claude-mem.db` | SQLite 数据库（观察、会话、摘要） |
| `~/.claude-mem/worker.pid` | Worker 进程信息 |
| `~/.claude-mem/logs/` | 日志目录 |
| `~/.claude/plugins/installed_plugins.json` | 插件注册信息 |
| `~/.claude/plugins/cache/thedotmack/claude-mem/*/hooks/hooks.json` | 插件 hooks 定义 |
