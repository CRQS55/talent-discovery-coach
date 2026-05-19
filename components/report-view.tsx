"use client";

import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
} from "lucide-react";
import type { ChatMessage, SummaryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReportViewProps {
  result: SummaryResult;
  history: ChatMessage[];
  onRestart: () => void;
}

function formatTranscript(history: ChatMessage[], result: SummaryResult) {
  const lines: string[] = [];
  lines.push("# 潜能挖掘师 · 完整对话记录");
  lines.push("");
  lines.push(`生成时间：${new Date().toLocaleString("zh-CN")}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  for (const m of history) {
    if (m.role === "user") {
      lines.push("**🙋 你：**");
    } else if (m.role === "assistant") {
      lines.push("**🌸 潜能挖掘师：**");
    } else {
      continue;
    }
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## 潜能报告总结");
  lines.push("");
  lines.push(result.summary);
  lines.push("");
  lines.push("## 雷达图分数");
  lines.push("");
  for (const d of result.chartData) {
    lines.push(`- ${d.dimension}: ${d.score}/100`);
  }
  return lines.join("\n");
}

function downloadTranscript(history: ChatMessage[], result: SummaryResult) {
  const text = formatTranscript(history, result);
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  a.download = `潜能报告_${ts}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportView({ result, history, onRestart }: ReportViewProps) {
  const [showTranscript, setShowTranscript] = React.useState(false);

  const chartData = (result.chartData || []).map((d) => ({
    dimension: d.dimension,
    score: Math.max(0, Math.min(100, Math.round(d.score))),
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-white shadow-lg shadow-pink-200/60">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-pink-950 sm:text-xl">
              你的潜能报告
            </h1>
            <p className="text-xs text-pink-700/70 sm:text-sm">
              来自 8–15 题深度对话的痕迹归纳
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 bg-clip-text text-lg text-transparent sm:text-xl">
              你的能力雷达图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} outerRadius="78%">
                  <defs>
                    <linearGradient id="pinkGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ff8fb3" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#ffc1d6" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#fbcfe8" strokeDasharray="3 4" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{
                      fill: "#9d174d",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#be185d", fontSize: 10 }}
                    stroke="#fbcfe8"
                  />
                  <Radar
                    name="得分"
                    dataKey="score"
                    stroke="#ec4899"
                    strokeWidth={2}
                    fill="url(#pinkGradient)"
                    fillOpacity={0.85}
                    isAnimationActive
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #fbcfe8",
                      background: "rgba(255,255,255,0.96)",
                      boxShadow: "0 4px 16px rgba(244, 114, 182, 0.18)",
                    }}
                    formatter={(value) => [`${value} / 100`, "得分"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {chartData.map((d) => (
                <div
                  key={d.dimension}
                  className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-2"
                >
                  <div className="text-xs text-pink-700/80">{d.dimension}</div>
                  <div className="mt-0.5 text-base font-semibold text-pink-700">
                    {d.score}
                    <span className="ml-0.5 text-xs font-normal text-pink-400">
                      /100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 bg-clip-text text-lg text-transparent sm:text-xl">
              你的隐藏天赋画像
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="message-bubble whitespace-pre-wrap text-sm leading-7 text-pink-950 sm:text-[15px] sm:leading-8">
              {result.summary}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="cursor-pointer select-none" onClick={() => setShowTranscript((v) => !v)}>
            <div className="flex items-center justify-between">
              <CardTitle className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 bg-clip-text text-lg text-transparent sm:text-xl">
                完整对话过程（{history.filter((m) => m.role === "user").length} 轮）
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100/70 text-pink-600 transition-colors hover:bg-pink-200/70">
                {showTranscript ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
          {showTranscript && (
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => downloadTranscript(history, result)}
                  variant="outline"
                  size="sm"
                  className="border-pink-200 text-pink-700 hover:bg-pink-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  下载完整记录 (.md)
                </Button>
              </div>
              <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-pink-100 bg-pink-50/30 p-3 sm:p-4">
                {history.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-white">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "message-bubble max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-6 shadow-sm",
                          isUser
                            ? "rounded-br-md bg-gradient-to-br from-pink-400 to-rose-400 text-white"
                            : "rounded-bl-md border border-pink-100 bg-white/95 text-pink-950"
                        )}
                      >
                        {m.content}
                      </div>
                      {isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-[11px] font-semibold text-white">
                          你
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

        <Button
          onClick={onRestart}
          variant="gradient"
          size="lg"
          className="w-full"
        >
          <RotateCcw className="h-4 w-4" />
          重新开始
        </Button>

        <Card className="overflow-hidden border-pink-200/80 bg-gradient-to-br from-pink-50/80 via-rose-50/70 to-pink-50/80">
          <CardContent className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="rounded-2xl border border-pink-200 bg-white p-2 shadow-md shadow-pink-200/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wechat-pay.png"
                alt="微信收款码"
                width={180}
                height={180}
                className="h-44 w-44 rounded-xl object-contain sm:h-48 sm:w-48"
              />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <p className="text-base font-semibold leading-8 text-pink-900 sm:text-lg sm:leading-9">
                <Heart className="mr-1 inline h-4 w-4 fill-pink-500 text-pink-500 align-[-2px]" />
                如果这个工具帮你看见了一点点过去没注意到的自己，欢迎扫码请我喝杯奶茶 ☕
              </p>
              <p className="text-sm leading-7 text-pink-700 sm:text-[15px] sm:leading-8">
                有 <span className="font-semibold">AI / Agent / 全栈应用</span>{" "}
                相关需求，欢迎来聊：
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/80 px-4 py-1.5 text-pink-700 shadow-sm">
                <span className="text-xs">微信</span>
                <span className="select-all font-mono text-sm font-semibold tracking-wide">
                  crqs18280775016
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="pb-4 text-center text-xs text-pink-400">
          潜能挖掘师 · Talent Discovery Coach · by CRQS
        </p>
      </div>
    </div>
  );
}
