"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage, SummaryResult } from "@/lib/types";
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  Mic,
  MicOff,
  RefreshCw,
  Square,
} from "lucide-react";

interface ChatInterfaceProps {
  onReport: (result: SummaryResult, history: ChatMessage[]) => void;
}

const INTRO_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `你好，我是 潜能挖掘师 · Talent Discovery Coach ✨

我会通过 8–15 个深度提问，帮你发现那些"你以为很普通、其实别人很难做到"的隐藏天赋。

我相信真正的"超能力"不是单一维度的极致，而是技能 × 兴趣 × 经验的独特交集——一件对你像呼吸一样自然、对别人却需要使劲才能做到的组合能力。

🎯 接下来怎么走：
1. 我先用 3 个轻松的小问题做"校准"
2. 再围绕你的回答深挖 5–12 个问题
3. 给你 5 个跨界候选方向，让你挑最心动的那个
4. 帮你把它落到具体场景里

准备好了告诉我"开始"，或者直接说说今天的状态、想从哪里聊起都可以 🌸`,
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex w-full animate-fade-in gap-2 sm:gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-white shadow-md shadow-pink-200">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "message-bubble max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-sm sm:max-w-[80%] sm:px-5 sm:text-base",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-pink-200"
            : "rounded-bl-md border border-pink-100/80 bg-white/95 text-pink-950"
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-xs font-semibold text-white shadow-md shadow-pink-200">
          你
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex animate-fade-in items-end gap-2 sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-white shadow-md shadow-pink-200">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-3 rounded-3xl rounded-bl-md border border-pink-100/80 bg-white/95 px-5 py-3 shadow-sm">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        {elapsed > 2 && (
          <span className="text-xs text-pink-500/80">
            {elapsed > 8 ? `等待中… ${elapsed}s（API 较慢，请稍候）` : `${elapsed}s`}
          </span>
        )}
      </div>
    </div>
  );
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function ChatInterface({ onReport }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [generatingReport, setGeneratingReport] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canRetry, setCanRetry] = React.useState(false);
  const [waitElapsed, setWaitElapsed] = React.useState(0);
  const [firstByteReceived, setFirstByteReceived] = React.useState(false);
  const [voiceSupported, setVoiceSupported] = React.useState(false);
  const [recording, setRecording] = React.useState(false);

  const scrollAreaRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const inputBeforeVoiceRef = React.useRef<string>("");

  React.useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    } else if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  React.useEffect(() => {
    if (!streaming || firstByteReceived) {
      setWaitElapsed(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setWaitElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [streaming, firstByteReceived]);

  const conversationOnly = React.useMemo(
    () => messages.filter((m) => m !== INTRO_MESSAGE),
    [messages]
  );

  async function runChatRequest(historyForApi: ChatMessage[]) {
    setError(null);
    setCanRetry(false);
    setFirstByteReceived(false);
    setStreaming(true);

    setMessages([...historyForApi, { role: "assistant", content: "" }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let pendingText = "";
    let renderedText = "";
    let typewriterTimer: number | null = null;

    const startTypewriter = () => {
      if (typewriterTimer !== null) return;
      typewriterTimer = window.setInterval(() => {
        if (renderedText.length >= pendingText.length) return;
        const remaining = pendingText.length - renderedText.length;
        const step = Math.max(1, Math.ceil(remaining / 18));
        renderedText = pendingText.slice(0, renderedText.length + step);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: renderedText };
          return copy;
        });
      }, 18) as unknown as number;
    };
    const stopTypewriter = () => {
      if (typewriterTimer !== null) {
        window.clearInterval(typewriterTimer);
        typewriterTimer = null;
      }
      if (renderedText !== pendingText) {
        renderedText = pendingText;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: renderedText };
          return copy;
        });
      }
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `请求失败 (${res.status})`);
      }

      startTypewriter();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            if (json.error) throw new Error(json.error);
            if (typeof json.delta === "string" && json.delta.length > 0) {
              if (!firstByteReceived) setFirstByteReceived(true);
              pendingText += json.delta;
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
      stopTypewriter();
    } catch (err) {
      stopTypewriter();
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      const msg = aborted
        ? "已停止生成"
        : err instanceof Error
        ? err.message
        : "对话失败";

      setError(aborted ? null : `${msg} — 你可以点"重新发送"再试一次，对话上下文已保留。`);
      setCanRetry(!aborted);

      // remove the empty assistant placeholder; keep the user message intact
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && (renderedText === "" || aborted && renderedText === "")) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      setFirstByteReceived(false);
      abortRef.current = null;
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || generatingReport) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    await runChatRequest(next);
  }

  async function retry() {
    if (streaming || generatingReport) return;
    // last message in `messages` should already be the user's message we kept
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") {
      setError("没有可重试的消息");
      return;
    }
    await runChatRequest([...messages]);
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function generateReport() {
    if (streaming || generatingReport) return;
    if (conversationOnly.length < 2) {
      setError("再多聊几轮我才能给你写出有信号的报告呀 🌸");
      return;
    }
    setError(null);
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationOnly }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `生成报告失败 (${res.status})`);
      }
      const result: SummaryResult = await res.json();
      onReport(result, conversationOnly);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成报告失败";
      setError(`${msg} — 可以稍后再点一次"生成报告"，对话不会丢失。`);
    } finally {
      setGeneratingReport(false);
    }
  }

  function toggleVoice() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("当前浏览器不支持语音输入，建议用 Chrome / Edge / Safari");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    try {
      const rec = new Ctor();
      const lang = (typeof navigator !== "undefined" && navigator.language) || "zh-CN";
      rec.lang = lang.startsWith("zh") ? "zh-CN" : lang;
      rec.continuous = true;
      rec.interimResults = true;
      inputBeforeVoiceRef.current = input ? input + " " : "";

      rec.onresult = (e: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = r[0]?.transcript ?? "";
          if (r.isFinal) finalText += t;
          else interimText += t;
        }
        if (finalText) {
          inputBeforeVoiceRef.current = inputBeforeVoiceRef.current + finalText;
          setInput(inputBeforeVoiceRef.current);
        } else if (interimText) {
          setInput(inputBeforeVoiceRef.current + interimText);
        }
      };
      rec.onerror = (e: any) => {
        setRecording(false);
        const code = e?.error || "unknown";
        if (code === "not-allowed") {
          setError("浏览器拒绝了麦克风权限，请在地址栏左侧重新允许。");
        } else if (code !== "aborted") {
          setError(`语音输入出错：${code}`);
        }
      };
      rec.onend = () => setRecording(false);
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
      setError(null);
    } catch (err) {
      setRecording(false);
      setError("无法启动语音输入");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  const inputPanel = (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-pink-900">你的回答</div>
          <div className="text-xs text-pink-500">
            Enter 发送 · Shift + Enter 换行
          </div>
        </div>
        {streaming && (
          <Button
            onClick={stop}
            size="sm"
            variant="outline"
            className="border-pink-200 text-pink-600 hover:bg-pink-50"
          >
            <Square className="h-3.5 w-3.5" />
            停止
          </Button>
        )}
      </div>

      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          recording
            ? "🎙️ 正在听你说…"
            : "把心里的想法、最近的故事、或一句『开始』 发给我…"
        }
        className="flex-1 min-h-[140px] text-base sm:text-lg leading-7 sm:leading-8 lg:min-h-[200px]"
        disabled={streaming || generatingReport}
      />

      <div className="flex items-stretch gap-2">
        {voiceSupported && (
          <Button
            onClick={toggleVoice}
            disabled={streaming || generatingReport}
            variant={recording ? "default" : "outline"}
            className={cn(
              "flex-1",
              recording
                ? "bg-rose-500 text-white hover:bg-rose-500/90 animate-pulse"
                : "border-pink-200 text-pink-700 hover:bg-pink-50"
            )}
          >
            {recording ? (
              <>
                <MicOff className="h-4 w-4" />
                停止语音
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                语音输入
              </>
            )}
          </Button>
        )}
        <Button
          onClick={send}
          disabled={!input.trim() || streaming || generatingReport}
          variant="gradient"
          className={cn(voiceSupported ? "flex-1" : "w-full")}
        >
          {streaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          发送
        </Button>
      </div>

      {canRetry && !streaming && (
        <Button
          onClick={retry}
          variant="outline"
          className="border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100"
        >
          <RefreshCw className="h-4 w-4" />
          重新发送上一条（不会丢失上下文）
        </Button>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs leading-relaxed text-rose-700">
          {error}
        </div>
      )}

      <Button
        onClick={generateReport}
        disabled={streaming || generatingReport || conversationOnly.length < 2}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {generatingReport ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在为你生成报告…
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            结束对话，生成专属潜能报告
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-white shadow-lg shadow-pink-200/60">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-pink-950 sm:text-xl">
            潜能挖掘师
          </h1>
          <p className="text-xs text-pink-700/70 sm:text-sm">
            Talent Discovery Coach · v4.1 · by CRQS
          </p>
        </div>
        <div className="hidden text-right text-xs text-pink-500 sm:block">
          已对话 {conversationOnly.filter((m) => m.role === "user").length} 轮
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-4 pb-2">
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {streaming &&
                  messages[messages.length - 1]?.role === "assistant" &&
                  messages[messages.length - 1]?.content === "" && (
                    <TypingIndicator elapsed={waitElapsed} />
                  )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {inputPanel}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
