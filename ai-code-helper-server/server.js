require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// 动态导入 node-fetch（兼容 CommonJS）
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// 中间件：解决跨域、解析 JSON 请求
app.use(
  cors({
    origin: "http://localhost:5173", // 明确前端域名（更安全）
    credentials: true,
  })
);
app.use(express.json());

/**
 * 1. 普通响应接口（非流式）
 * 适用于不需要逐字显示的场景
 */
app.post("/api/ai/code", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请输入需求描述" });
    }

    const aiResponse = await fetch(process.env.AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v3.1", // 确保模型支持非流式响应
        messages: [
          //   {
          //     role: "system",
          //     content:
          //       "你是资深前端工程师，仅返回可运行的代码，不添加多余解释。代码需包含注释，遵循 ES6+ 规范。",
          //   },
          { role: "user", content: prompt },
        ],
        stream: false, // 普通响应：关闭流式传输
        max_tokens: 2000,
      }),
    });

    // 非流式响应可以直接解析为 JSON
    const aiData = await aiResponse.json();
    if (aiData.error) {
      throw new Error(aiData.error.message);
    }

    const code = aiData.choices[0].message.content;
    res.json({ success: true, code });
  } catch (error) {
    console.error("普通接口错误：", error);
    res.status(500).json({
      success: false,
      error: error.message || "AI 服务暂时不可用",
    });
  }
});

/**
 * 2. 流式响应接口
 * 适用于需要逐字显示的场景（配合前端流式处理）
 */
app.post("/api/ai/code/stream", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请输入需求描述" });
    }

    // 关键：设置 SSE 响应头（告诉前端这是流数据）
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const aiResponse = await fetch(process.env.AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v3.1", // 确保模型支持流式响应
        messages: [
          //   {
          //     role: "system",
          //     content:
          //       "你是资深前端工程师，仅返回可运行的代码，不添加多余解释。代码需包含注释，遵循 ES6+ 规范。",
          //   },
          { role: "user", content: prompt },
        ],
        stream: true, // 开启流式传输
        max_tokens: 2000,
      }),
    });

    // 关键：通过管道直接转发流数据（无需手动调用 getReader）
    // 监听 AI 响应流的 'data' 事件，实时转发给前端
    aiResponse.body.on("data", (chunk) => {
      // 将二进制数据转为字符串，按 SSE 格式转发
      const data = chunk.toString("utf-8");
      res.write(`${data}\n\n`);
    });

    // 监听流结束事件
    aiResponse.body.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    // 监听流错误事件
    aiResponse.body.on("error", (err) => {
      console.error("AI 流错误：", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    // 客户端断开连接时，终止 AI 流
    req.on("close", () => {
      console.log("客户端断开连接");
      aiResponse.body.destroy(); // 销毁 AI 响应流
      res.end();
    });
  } catch (error) {
    console.error("接口错误：", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
