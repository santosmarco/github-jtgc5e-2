import { Column, Hr, Row, Text } from "@react-email/components";

import { cn } from "~/lib/utils";

export type ReportMetaProps = {
  title?: string | null;
  startDate?: string;
  endDate?: string;
  className?: string;
};

export function ReportMeta({
  title,
  startDate = "Recent",
  endDate = "Now",
  className,
}: ReportMetaProps) {
  // Provide a default title if none is provided
  const displayTitle = title || "Strategic Communication";

  return (
    <Row
      className={cn("mt-8 space-y-5 px-0 align-top sm:space-y-0", className)}
    >
      <Column className="w-1/2 align-top">
        <Text className="m-0 text-sm font-medium text-gray-900 sm:text-base">
          {displayTitle}
        </Text>
        <Hr className="my-2 border-gray-200 text-left" />
        <Text className="m-0 mt-1 text-sm text-gray-500">
          {startDate} - {endDate}
        </Text>
      </Column>
    </Row>
  );
}
