"use client";

export type MeetingSummaryProps = {
  summary: string;
};

export function MeetingSummary({ summary }: MeetingSummaryProps) {
  return <div className="text-sm text-muted-foreground">{summary}</div>;
}
