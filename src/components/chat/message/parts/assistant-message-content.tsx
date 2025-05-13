"use client";

import type { UIMessage } from "ai";

import { Markdown } from "~/components/markdown/markdown";

import { ToolInvocationDisplay } from "../tool-display/tool-invocation-display";

export type AssistantMessageContentProps = {
  id: string;
  parts: UIMessage["parts"];
};

export function AssistantMessageContent({
  id,
  parts,
}: AssistantMessageContentProps) {
  const relevantParts = parts?.filter(
    (part) => part.type === "tool-invocation" || part.type === "text",
  );

  if (!relevantParts?.length) return null;

  return (
    <div className="w-full space-y-2 text-foreground">
      {relevantParts.map((part, index) => {
        if (part.type === "text") {
          const key = `${id}-text-${part.text.substring(0, 20)}-${index}`;
          return (
            <div className="w-full" key={key}>
              <Markdown id={`${id}-md-text-${index}`} content={part.text} />
            </div>
          );
        }

        if (part.type === "tool-invocation" && part.toolInvocation) {
          const key = part.toolInvocation.toolCallId || `${id}-tool-${index}`;
          return (
            <div className="w-full" key={key}>
              <ToolInvocationDisplay toolInvocation={part.toolInvocation} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
