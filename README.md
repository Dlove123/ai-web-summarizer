# AI Web Summarizer - 零成本启动项目

> 浏览器插件：一键摘要任何网页内容

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/yourname/ai-summarizer.git
cd ai-summarizer

# 2. 安装依赖
npm install

# 3. 开发模式
npm run dev

# 4. 构建生产版本
npm run build
```

## 项目结构

```
ai-summarizer/
├── extension/          # Chrome插件源码
│   ├── manifest.json   # 插件配置
│   ├── popup.html      # 弹出窗口
│   ├── popup.js        # 弹窗逻辑
│   ├── content.js      # 内容脚本（页面交互）
│   ├── background.js   # 后台服务
│   └── styles.css      # 样式
├── worker/             # Cloudflare Worker
│   ├── src/
│   │   └── index.js    # API代理
│   └── wrangler.toml   # Worker配置
├── landing/            # 落地页
│   └── index.html
└── .github/
    └── workflows/      # CI/CD
        └── deploy.yml
```

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JS (无框架依赖)
- Cloudflare Workers (免费后端)
- DeepSeek API (免费AI能力)

## 许可证

MIT
