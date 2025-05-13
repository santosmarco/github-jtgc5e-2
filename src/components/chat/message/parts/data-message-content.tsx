"use client";

import { Navigation } from "lucide-react";

import { logger } from "~/lib/logging/client";

export type DataMessageContentProps = {
  content: string;
};

export function DataMessageContent({ content }: DataMessageContentProps) {
  try {
    const data = JSON.parse(content);

    if (data.type === "user_navigation") {
      return (
        <div className="flex flex-col text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1 leading-none">
            <Navigation className="h-3.5 w-3.5" />
            <span className="font-medium">Navigation:</span> {data.pathname}
          </div>

          {data.context && (
            <div className="mt-1 flex items-center">
              <div>{data.context}</div>
            </div>
          )}
        </div>
      );
    }

    // Handle other data message types as needed, or display raw JSON
    return (
      <div className="text-xs text-muted-foreground">
        {data.context || (
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  } catch (error) {
    logger.error("Error parsing data message content", { error, content });

    // If content is not valid JSON, display it as plain text
    return <div className="text-xs text-muted-foreground">{content}</div>;
  }
}
