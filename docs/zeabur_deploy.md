# 🚀 Zeabur 部署指南 (混合架构版)

本项目采用 **Next.js (前端)** + **Python (后端)** 的混合架构 (Hybrid Monorepo)。
借助 `zeabur.toml` 配置文件，您可以非常轻松地将两个服务部署在同一个 Zeabur 项目中。

## 📦 第一步：推送到 GitHub

确保您最新的代码（包含 `zeabur.toml` 和 `python-core` 目录）已经提交并推送到 GitHub 仓库。

```bash
git add .
git commit -m "chore: add zeabur deployment config"
git push
```

## ☁️ 第二步：在 Zeabur 创建项目

1. 登录 [Zeabur Dashboard](https://dash.zeabur.com).
2. 点击 **"Create Project"** (创建项目)，选择区域（建议选择香港或新加坡以获得更好的 Gemini API 连接速度）。
3. 点击 **"Deploy New Service"** -> **"Git"**。
4. 选择您的 `mojin-ai` GitHub 仓库。

## ⚙️ 第三步：自动识别与配置

Zeabur 会读取根目录下的 `zeabur.toml`，自动为您识别出两个服务：

* **mojin-web**: Next.js 前端服务
* **mojin-quant**: Python 量化核心服务

点击部署后，Zeabur 会同时构建这两个服务。

## 🔗 第四步：配置环境变量与网络 (关键!)

### 1. 配置 Python 后端 (mojin-quant)

点击 `mojin-quant` 服务 -> **Variables** (环境变量)，添加以下变量：

* `GEMINI_API_KEY`: 您的 Gemini API Key
* `GEMINI_BASE_URL`: (可选) 如 `https://generativelanguage.googleapis.com/v1beta`
* `GEMINI_MODEL`: `gemini-2.0-flash` (或其他模型)
* **Networking**: 打开 Networking 选项卡，确保开启 "Private Networking" (私有网络)，并记住它的服务名称，通常默认就是 `mojin-quant`。

### 2. 配置 Next.js 前端 (mojin-web)

点击 `mojin-web` 服务 -> **Variables** (环境变量)，添加：

* `DATABASE_URL`: `file:./dev.db` (如果暂时用 SQLite) 或您的 PostgreSQL 连接串。
* `QUANT_API_URL`: **<http://mojin-quant:8000>**
  * ⚠️ **注意**: 这里不仅是 Key，**Value 非常重要**！
  * 在 Zeabur 内部网络中，服务之间直接通过服务名访问。如果您的后端服务名是 `mojin-quant`，端口暴露为 8000，则地址必须填 `http://mojin-quant:8000`。
  * **不要**填外网域名（内网通信更快更安全）。

## 🌐 第五步：绑定域名

1. 点击 `mojin-web` 服务 -> **Domains**。
2. 生成一个 `*.zeabur.app` 的域名（例如 `mojin-ai.zeabur.app`）。
3. 访问该域名，您的应用应当已经完美运行！

---

## 常见问题排查

* **Q: 前端提示 "Connection Refused" 或连不上量化核心？**
  * A: 检查 `mojin-web` 的 `QUANT_API_URL` 变量。确保拼写正确，且 `mojin-quant` 服务已成功启动（显示 Running 绿灯）。
* **Q: Python 构建失败？**
  * A: 查看 Build Logs。通常是依赖安装问题。本项目已优化 Dockerfile，利用阿里云镜像源加速，一般不会有问题。
