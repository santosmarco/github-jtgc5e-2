"use client";

import _ from "lodash";
import { cn } from "~/lib/utils";

import { MomentCard } from "~/components/moment-card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { handleMomentCategorySort } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

export type VideoMomentsProps = {
  moments: NonNullable<RouterOutputs["moments"]["listForInsights"]>["moments"];
  selectedCategory?: string;
  onCategoryChange: (category: string) => void;
  onSkipToMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  className?: string;
  variant?: "default" | "qa";
};

export function VideoMoments({
  moments,
  selectedCategory,
  onCategoryChange,
  onSkipToMoment,
  className,
  variant = "default",
}: VideoMomentsProps) {
  const categories = _.uniq(moments.map((moment) => moment.activity))
    .sort(handleMomentCategorySort)
    .concat(["Analysis"])
    .map((category) => ({
      label: category,
      value: category,
      disabled: category === "Analysis",
      comingSoon: category === "Analysis",
    }));
  const momentsByCategory = _.mapValues(
    _.groupBy(moments, (moment) => moment.activity),
    (moments) => moments,
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {variant === "qa" ? "QA Moments" : "Key Moments"}
        </h2>
      </div>

      <Tabs
        defaultValue={selectedCategory ?? categories[0]?.value}
        onValueChange={onCategoryChange}
      >
        <ScrollArea>
          <TabsList className="inline-flex h-11 items-center justify-start gap-2 bg-transparent p-1">
            {categories.map((category) => (
              <TabsTrigger
                key={category.value}
                value={category.value}
                className={cn(
                  "relative inline-flex items-center whitespace-nowrap rounded-full hover:text-muted-foreground/70 data-[state=active]:bg-foreground data-[state=active]:text-background",
                  variant === "qa" &&
                    "data-[state=active]:bg-accent-foreground",
                )}
                disabled={category.disabled}
              >
                {!category.disabled && (
                  <span
                    className={cn(
                      "absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold leading-none text-foreground",
                      variant === "qa" && "bg-accent-foreground",
                    )}
                  >
                    {momentsByCategory[category.value]?.length}
                  </span>
                )}
                {category.label}
                {category.comingSoon && (
                  <Badge size="sm" color="primary" className="ml-2 opacity-80">
                    Soon
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        {Object.entries(momentsByCategory).map(([category, moments]) => (
          <TabsContent key={category} value={category}>
            <ScrollArea className="scrollbar-hide py-0 lg:border-t lg:border-border lg:py-4 lg:pt-0">
              {moments.map((moment, index) => (
                <MomentCard
                  key={moment.index}
                  moment={moment}
                  index={index}
                  onSkipToMoment={onSkipToMoment}
                  className={cn(
                    "lg:mt-4 [&:not(:first-child)]:mt-4",
                    variant === "qa" &&
                      "border-accent-foreground/20 hover:border-accent-foreground/40",
                  )}
                />
              ))}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
