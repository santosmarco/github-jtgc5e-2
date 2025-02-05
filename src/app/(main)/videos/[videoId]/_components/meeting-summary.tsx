"use client";

import { FileText } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";

export type MeetingSummaryProps = {
  summary: string;
};

export function MeetingSummary({ summary }: MeetingSummaryProps) {
  return (
    <CollapsibleSection title="Meeting Summary" icon={FileText}>
      <div className="block px-2 pb-2 text-sm text-muted-foreground">
        {summary}
      </div>
    </CollapsibleSection>
  );
}
