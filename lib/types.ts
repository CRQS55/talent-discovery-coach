export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChartDatum {
  dimension: string;
  score: number;
}

export interface SummaryResult {
  summary: string;
  chartData: ChartDatum[];
}
