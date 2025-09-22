import { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import "./App.less";
function App() {
  const [prompt, setPrompt] = useState<string>("浅谈前端工程化");
  const [fullCode, setFullCode] = useState<string>("");
  const [streamingCode, setStreamingCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("javascript");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );

  // 自定义代码组件，用于在ReactMarkdown中高亮代码
  const CodeBlock = (props: any) => {
    const { inline, className, children, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");
    return inline ? (
      <code className={className} {...rest}>
        {children}
      </code>
    ) : (
      <SyntaxHighlighter
        style={dracula}
        language={match ? match[1] : "javascript"}
        PreTag="div"
        showLineNumbers={true}
        {...rest}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
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
            // 直接存储原始内容，由ReactMarkdown处理格式化
            setFullCode(accumulatedCode);
            setStreamingCode(accumulatedCode);
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
    <div className="app-container">
      <div className="app-content">
        {/* 头部 */}
        <div className="app-header">
          <h1>AI 前端代码助手</h1>
          <div className="app-subtitle">流式响应 + 智能代码生成 + 下载功能</div>
        </div>

        {/* 输入区域 */}
        <div className="input-section">
          <div className="input-container">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="请输入需求描述（如：写一个 React TodoList 组件）"
              className={loading ? "loading" : ""}
            />
          </div>
          <div className="button-group">
            <button
              onClick={fetchAICodeStream}
              disabled={loading || !prompt.trim()}
              className="generate-btn"
            >
              {loading ? (
                <>
                  <span>🔄</span> 生成中...
                </>
              ) : (
                <>
                  <span>✨</span> 生成代码
                </>
              )}
            </button>
            {loading && (
              <button onClick={cancelStream} className="cancel-btn">
                <span>⏹️</span> 取消
              </button>
            )}
            {fullCode && (
              <button onClick={downloadCode} className="download-btn">
                <span>💾</span> 下载代码
              </button>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-section">
            <div className="error-message">❌ {error}</div>
          </div>
        )}

        {/* 流式代码展示 */}
        {(streamingCode || fullCode) && (
          <div className="code-section">
            <h3>🎯 生成结果</h3>
            <div className="code-container">
              <div className="code-content">
                <ReactMarkdown
                  components={{
                    code: CodeBlock,
                  }}
                >
                  {streamingCode || fullCode}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
