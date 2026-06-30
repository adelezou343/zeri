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

- `next.config.ts` 使用 Next.js 默认配置，适合 Vercel 部署。
- 项目依赖已记录在 `package-lock.json` 中。
- 静态资源位于 `public/` 目录。
