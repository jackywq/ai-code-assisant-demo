import { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeResult {
  language: string;
  code: string;
}

function App() {
  const [prompt, setPrompt] = useState<string>("写一个 Vue3 组合式 API 的节流 Hook");
  const [fullCode, setFullCode] = useState<string>("");
  const [streamingCode, setStreamingCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("javascript");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // 处理AI返回的代码块标记（提取语言和纯代码）
  const processCode = (rawCode: string): CodeResult => {
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)\s*```/;
    const match = rawCode.match(codeBlockRegex);
    if (match) {
      return {
        language: match[1] || "javascript",
        code: match[2],
      };
    }
    return { language: "javascript", code: rawCode };
  };

  // 流式请求AI接口（使用 fetch）
  const fetchAICodeStream = async (): Promise<void> => {
    // 重置状态
    setLoading(true);
    setError("");
    setFullCode("");
    setStreamingCode("");
    setLanguage("javascript");

    // 创建AbortController用于取消请求
    controllerRef.current = new AbortController();

    try {
      const response = await fetch("http://localhost:3001/api/ai/code/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      let accumulatedCode = "";
      const decoder = new TextDecoder("utf-8");

      // 读取流数据
      const readStream = async (): Promise<void> => {
        try {
          const { done, value } = await reader.read();

          if (done) {
            // 流结束处理
            const { language: lang, code } = processCode(accumulatedCode);
            setLanguage(lang);
            setFullCode(code);
            setStreamingCode(code);
            return;
          }

          // 解码并处理数据
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") {
                reader.cancel();
                return;
              }

              try {
                console.log("dataStr:", dataStr);
                const data = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content;

                if (content) {
                  accumulatedCode += content;
                  setStreamingCode(accumulatedCode);
                }
              } catch (e) {
                console.warn("解析流数据失败:", e);
              }
            }
          }

          // 继续读取下一个数据块
          await readStream();
        } catch (err) {
          console.error("流数据处理错误:", err);
          if (!controllerRef.current?.signal.aborted) {
            setError("流处理错误，请重试");
          }
        }
      };

      // 开始读取流
      await readStream();
    } catch (err) {
      if (!controllerRef.current?.signal.aborted) {
        setError((err as Error).message || "请求失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // 取消流式请求
  const cancelStream = (): void => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    if (readerRef.current) {
      readerRef.current.cancel(); // 取消读取器
    }
    setLoading(false);
  };

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, []);

  // 下载代码为文件
  const downloadCode = (): void => {
    if (!fullCode) {
      setError("没有可下载的代码");
      return;
    }
    // 根据语言类型设置文件扩展名
    const ext = language === "javascript" ? "js" : language;
    const blob = new Blob([fullCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-generated-code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        AI 前端代码助手（流式响应 + 下载功能）
      </h1>

      {/* 输入区域 */}
      <div style={{ marginBottom: "20px" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="请输入需求描述（如：写一个 React TodoList 组件）"
          style={{
            width: "100%",
            height: "120px",
            padding: "12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            resize: "vertical",
          }}
        />
        <div style={{ marginTop: "10px" }}>
          <button
            onClick={fetchAICodeStream}
            disabled={loading || !prompt.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#1890ff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              marginRight: "10px",
            }}
          >
            {loading ? "生成中..." : "生成代码"}
          </button>
          {loading && (
            <button
              onClick={cancelStream}
              style={{
                padding: "10px 20px",
                backgroundColor: "#ff4d4f",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              取消
            </button>
          )}
          {fullCode && (
            <button
              onClick={downloadCode}
              style={{
                padding: "10px 20px",
                backgroundColor: "#67c23a",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              下载代码
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ff4d4f",
            borderRadius: "4px",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* 流式代码展示 */}
      {(streamingCode || fullCode) && (
        <div style={{ marginTop: "20px" }}>
          <h3>生成结果：</h3>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <SyntaxHighlighter
              style={dracula}
              language={language}
              PreTag="div"
              showLineNumbers={true}
            >
              {streamingCode || fullCode}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;