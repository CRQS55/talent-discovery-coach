import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: ChatMessage[];
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

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const filtered = incoming.filter((m) => m && m.role !== "system");
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...filtered,
  ];

  const upstreamUrl = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;

  const upstreamCtrl = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamCtrl.abort(), 90_000);

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
        stream: true,
        temperature: 0.7,
      }),
      signal: upstreamCtrl.signal,
    });
  } catch (err) {
    clearTimeout(upstreamTimeout);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: aborted
          ? "上游模型 90 秒未响应，请稍后重试"
          : "无法连接上游模型",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 504, headers: { "Content-Type": "application/json" } }
    );
  }
  clearTimeout(upstreamTimeout);

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Upstream error (${upstream.status})`,
        detail: errText,
      }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      const sendDelta = (delta: string) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ delta })}\n\n`
          )
        );
      };
      const sendDone = () => {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              sendDone();
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta: string =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                "";
              if (delta) sendDelta(delta);
            } catch {
              // ignore malformed chunk
            }
          }
        }
        sendDone();
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
