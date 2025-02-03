"use client";

import { Calendar1Icon, FileText } from "lucide-react";
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

/*
export type ReportCardProps = React.ComponentProps<typeof Card> & {
  report: RouterOutputs["notion"]["listByClient"][number];
};


export const ReportCard = React.forwardRef<
  React.ElementRef<typeof Card>,
  ReportCardProps
>(({ report, className, ...props }, ref) => {
  const title =
    report.properties?.Name?.type === "title"
      ? report.properties.Name.title[0]?.plain_text
      : "Untitled";

  const date =
    report.properties?.Date?.type === "date"
      ? report.properties.Date.date?.start
      : undefined;

  const client =
    report.properties?.Client?.type === "select"
      ? report.properties.Client.select?.name
      : undefined;

  return (
    <Card
      ref={ref}
      className={cn(
        "group relative overflow-hidden transition-colors hover:border-primary/50",
        className,
      )}
      {...props}
    >
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle>
          {client && (
            <span className="mb-1 block text-sm text-muted-foreground">
              {client}
            </span>
          )}
          {title}
        </CardTitle>
        <FileText className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
      </CardHeader>
      <CardContent>
        {date && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar1Icon className="h-4 w-4" />
            {new Date(date).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
});
ReportCard.displayName = "ReportCard";
*/

export const ReportCard = () => <div>ReportCard</div>;
