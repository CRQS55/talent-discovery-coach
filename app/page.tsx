"use client";

import * as React from "react";
import { ChatInterface } from "@/components/chat-interface";
import { ReportView } from "@/components/report-view";
import type { ChatMessage, SummaryResult } from "@/lib/types";

export default function HomePage() {
  const [view, setView] = React.useState<"chat" | "report">("chat");
  const [report, setReport] = React.useState<SummaryResult | null>(null);
  const [history, setHistory] = React.useState<ChatMessage[]>([]);

  const handleReport = (result: SummaryResult, hist: ChatMessage[]) => {
    setReport(result);
    setHistory(hist);
    setView("report");
  };

  const handleRestart = () => {
    setReport(null);
    setHistory([]);
    setView("chat");
  };

  if (view === "report" && report) {
    return (
      <ReportView
        result={report}
        history={history}
        onRestart={handleRestart}
      />
    );
  }
  return <ChatInterface onReport={handleReport} />;
}
