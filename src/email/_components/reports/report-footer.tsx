import { Section, Text } from "@react-email/components";

import { cn } from "~/lib/utils";

export type ReportFooterProps = {
  className?: string;
};

export function ReportFooter({ className }: ReportFooterProps) {
  return (
    <Section
      className={cn(
        "border-t border-gray-200 bg-gray-100 px-6 py-6 sm:px-8 sm:py-8",
        className,
      )}
    >
      <Text className="mb-4 text-xs leading-relaxed text-gray-500">
        This report contains confidential insights based on your recent
        leadership activities. For your eyes only.
      </Text>
      <Text className="m-0 text-xs font-medium text-gray-700">
        © {new Date().getFullYear()} Titan Leadership Analytics
      </Text>
    </Section>
  );
}
