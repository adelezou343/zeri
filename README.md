# 万年红·客户日课

基于 Next.js 的单页择日工具。

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 构建检查

```bash
npm run typecheck
npm run build
```

## Vercel 部署

1. 登录 Vercel。
2. 选择 `Add New Project`。
3. 从 GitHub 导入 `adelezou343/zeri`。
4. Framework Preset 选择 `Next.js`。
5. Build Command 使用默认值：

```bash
npm run build
```

6. Install Command 使用默认值：

```bash
npm install
```

7. Output Directory 保持默认，不需要填写。
8. 当前项目没有环境变量依赖，不需要在 Vercel 配置 Environment Variables。
9. 点击 Deploy。

## 部署说明

- `next.config.ts` 使用静态导出配置；普通构建不启用子路径，GitHub Pages 构建通过 `GITHUB_PAGES=true` 启用 `/zeri` 子路径。
- 项目依赖已记录在 `package-lock.json` 中。
- 静态资源位于 `public/` 目录。

## GitHub Pages 部署

项目支持静态导出到 GitHub Pages，目标地址：

```text
https://adelezou343.github.io/zeri/
```

本仓库已经包含 GitHub Actions 工作流：

```text
.github/workflows/pages.yml
```

每次推送到 `main` 分支后，GitHub Actions 会自动：

1. 安装依赖。
2. 运行类型检查。
3. 使用 `GITHUB_PAGES=true npm run build` 静态导出站点。
4. 将 `out/` 目录部署到 GitHub Pages。

首次启用 GitHub Pages：

1. 打开 GitHub 仓库 `adelezou343/zeri`。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 中，将 `Source` 选择为 `GitHub Actions`。
5. 回到 `Actions` 页面，等待 `Deploy GitHub Pages` 工作流完成。

本地检查 GitHub Pages 静态导出：

```bash
GITHUB_PAGES=true npm run build
```

构建产物位于：

```text
out/
```
