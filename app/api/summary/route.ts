import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, SUMMARY_INSTRUCTION } from "@/lib/system-prompt";
import type { ChatMessage, SummaryResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SummaryRequestBody {
  messages: ChatMessage[];
}

function tryExtractJson(text: string): SummaryResult | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1]?.trim(), text.trim()].filter(
    (s): s is string => Boolean(s)
  );

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed.summary === "string" && Array.isArray(parsed.chartData)) {
        return parsed as SummaryResult;
      }
    } catch {
      // try next
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (parsed && typeof parsed.summary === "string" && Array.isArray(parsed.chartData)) {
        return parsed as SummaryResult;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.API_KEY;
  const apiBaseUrl = process.env.API_BASE_URL;
  const modelName = process.env.MODEL_NAME;

  if (!apiKey || !apiBaseUrl || !modelName) {
    return new Response(
      JSON.stringify({
        error:
          "Server is missing API_KEY / API_BASE_URL / MODEL_NAME environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: SummaryRequestBody;
  try {
    body = (await req.json()) as SummaryRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const dialogueOnly = incoming.filter((m) => m && m.role !== "system");

  if (dialogueOnly.length === 0) {
    return new Response(
      JSON.stringify({ error: "No conversation history provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...dialogueOnly,
    { role: "user", content: SUMMARY_INSTRUCTION },
  ];

  const upstreamUrl = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;

  const upstreamCtrl = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamCtrl.abort(), 120_000);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: false,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
      signal: upstreamCtrl.signal,
    });
  } catch (err) {
    clearTimeout(upstreamTimeout);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: aborted
          ? "上游模型 120 秒未响应，请稍后重试"
          : "无法连接上游模型",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 504, headers: { "Content-Type": "application/json" } }
    );
  }
  clearTimeout(upstreamTimeout);

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Upstream error (${upstream.status})`,
        detail: errText,
      }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await upstream.json().catch(() => null);
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  const parsed = tryExtractJson(content);
  if (!parsed) {
    return new Response(
      JSON.stringify({
        error: "Model did not return parseable JSON",
        raw: content,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const cleanData = (parsed.chartData ?? [])
    .filter(
      (d) =>
        d &&
        typeof d.dimension === "string" &&
        typeof d.score === "number" &&
        d.score >= 0 &&
        d.score <= 100
    )
    .slice(0, 8);

  const result: SummaryResult = {
    summary: String(parsed.summary || "").trim(),
    chartData: cleanData.length > 0 ? cleanData : (parsed.chartData ?? []),
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
