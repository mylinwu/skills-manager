# Contributing to Skills Manager

感谢你愿意参与 Skills Manager。

## 开发环境

需要准备：

- Node.js 22+
- `pnpm` 10.x
- Rust stable
- 当前操作系统所需的 Tauri 运行与构建依赖
- 可用的 `Skills CLI`

安装依赖并启动：

```bash
pnpm install
pnpm tauri:dev
```

## 提交前检查

提交 Pull Request 前，请至少执行：

```bash
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

如果修改了版本、打包或 Release 相关内容，也请执行：

```bash
pnpm release:validate
```

## Pull Request 预期

- 说明改动目的和主要行为变化
- 说明是否影响安装、分发、打包或版本管理流程
- 界面有变化时，补充更新后的截图
- 尽量保持改动聚焦，避免把不相关重构混在一起

## 提交建议

- `feat:` 新功能
- `fix:` 缺陷修复
- `docs:` 文档更新
- `refactor:` 重构
- `ci:` 持续集成与工作流调整
- `chore:` 其他维护性修改

## 截图更新规范

- README 使用的截图统一放在 `public/screenshot/`
- 文件名保持语义化，优先沿用现有命名风格
- 尽量展示完整窗口，而不是局部裁切
- 公共仓库场景下，注意不要泄露敏感路径、账号或令牌
