import { Text } from "@react-email/components";

import { cn } from "~/lib/utils";

export type ReportSectionHeadingProps = {
  title: string;
  color?: "default" | "indigo" | "emerald" | "amber";
  className?: string;
};

export function ReportSectionHeading({
  title,
  color = "default",
  className,
}: ReportSectionHeadingProps) {
  const colorClasses = {
    default: "text-gray-500",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };

  return (
    <Text
      className={cn(
        "mb-6 text-xs font-bold uppercase tracking-wider",
        colorClasses[color],
        className,
      )}
    >
      {title}
    </Text>
  );
}
