import { Calendar, Loader2 } from "lucide-react";

import { Skeleton } from "~/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="min-h-screen space-y-8 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Calendar</h1>
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Meeting Link Input */}
      <div className="mx-auto flex max-w-3xl gap-2 px-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Calendar View Skeleton */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Loading calendar...
          </span>
        </div>

        {/* Skeleton meeting items */}
        {["now", "tomorrow", "future"].map((timeframe) => (
          <div key={`skeleton-${timeframe}`} className="mb-8">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
