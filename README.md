# AI Code Helper

一个全栈AI代码助手项目，包含React前端和Node.js后端服务器。

## 项目结构

```
ai-code/
├── ai-code-helper-client/     # React前端应用
│   ├── src/                   # 源代码目录
│   ├── public/               # 静态资源
│   ├── package.json          # 前端依赖配置
│   └── vite.config.js        # Vite配置
├── ai-code-helper-server/     # Node.js后端服务器
│   ├── server.js             # 服务器主文件
│   ├── package.json          # 后端依赖配置
│   └── .env                  # 环境变量配置
└── README.md                 # 项目说明文档
```

## 功能特性

- 🤖 AI代码辅助功能
- ⚡ 基于Vite的快速开发体验
- 🔄 实时代码提示和建议
- 🌐 RESTful API接口
- 🎨 现代化的用户界面

## 技术栈

### 前端
- React 18
- Vite (构建工具)
- ESLint (代码检查)

### 后端
- Node.js
- Express.js (Web框架)
- CORS (跨域支持)
- dotenv (环境变量管理)

## 快速开始

### 前置要求
- Node.js 16+ 
- npm 或 yarn

### 安装依赖

1. 安装前端依赖：
```bash
cd ai-code-helper-client
npm install
```

2. 安装后端依赖：
```bash
cd ../ai-code-helper-server
npm install
```

### 运行开发服务器

1. 启动后端服务器：
```bash
cd ai-code-helper-server
npm run server
```

2. 启动前端开发服务器：
```bash
cd ../ai-code-helper-client
npm run start
```

3. 打开浏览器访问：http://localhost:5173

## 环境配置

后端服务器需要配置环境变量，复制 `.env.example` 并修改为实际值：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

## 构建生产版本

### 构建前端
```bash
cd ai-code-helper-client
npm run build
```

### 启动生产服务器
```bash
cd ai-code-helper-server
npm start
```

## 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 遵循JavaScript最佳实践
- 保持代码注释清晰

### 提交规范
- 使用有意义的提交信息
- 遵循Conventional Commits规范
- 定期提交代码

## 许可证

MIT License - 详见 LICENSE 文件

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 支持

如有问题，请提交Issue或联系开发团队。