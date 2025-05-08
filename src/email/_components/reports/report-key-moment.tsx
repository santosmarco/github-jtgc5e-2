import { Column, Row, Text } from "@react-email/components";

import { HighlightableText } from "./highlightable-text";

export type ReportKeyMomentProps = {
  id: string;
  title: string;
  summary: string;
  people: string[];
  highlightTitle?: boolean;
  highlightSummary?: boolean;
  summaryMaxLength?: number;
};

export function ReportKeyMoment({
  id,
  title,
  summary,
  people,
  highlightTitle = true,
  highlightSummary = false,
  summaryMaxLength = 120,
}: ReportKeyMomentProps) {
  const nameRegex =
    people.length > 0
      ? new RegExp(
          `\\b(${people.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
          "gi",
        )
      : null;

  // Check if names are already mentioned in the title
  const nameAlreadyInTitle =
    people.length > 0 &&
    people.some((name) => title.toLowerCase().includes(name.toLowerCase()));

  // Add highlight tags around people names in title and summary
  const processedTitleText = nameRegex
    ? title.replace(nameRegex, "<highlight>$1</highlight>")
    : title;

  const processedSummaryText = nameRegex
    ? summary.replace(nameRegex, "<highlight>$1</highlight>")
    : summary;

  // Process title with or without highlights
  const processedTitle = highlightTitle ? (
    <HighlightableText>{processedTitleText}</HighlightableText>
  ) : (
    processedTitleText.replace(/<highlight>|<\/highlight>/g, "")
  );

  // Process summary and truncate if needed
  const summaryWithoutTags = processedSummaryText.replace(
    /<highlight>|<\/highlight>/g,
    "",
  );
  const shouldTruncate = summaryWithoutTags.length > summaryMaxLength;

  // Truncate at the last complete word within the limit
  let truncatedSummary = processedSummaryText;
  if (shouldTruncate) {
    // Find the last space before the max length
    const lastSpaceIndex = processedSummaryText.lastIndexOf(
      " ",
      summaryMaxLength,
    );
    // If there's a space, truncate there, otherwise use the full max length
    const truncateIndex =
      lastSpaceIndex > 0 ? lastSpaceIndex : summaryMaxLength;
    truncatedSummary = `${processedSummaryText.slice(0, truncateIndex)}...`;
  }

  const processedSummary = highlightSummary ? (
    <HighlightableText>{truncatedSummary}</HighlightableText>
  ) : shouldTruncate ? (
    // For non-highlighted summary, also truncate at word boundaries
    `${summaryWithoutTags.slice(0, summaryWithoutTags.lastIndexOf(" ", summaryMaxLength) || summaryMaxLength)}...`
  ) : (
    summaryWithoutTags
  );

  // Only add "with Person" if names aren't already in the title
  const withPerson =
    people.length > 0 && !nameAlreadyInTitle
      ? ` with ${people.join(" & ")}`
      : "";

  return (
    <Row
      key={id}
      className="mb-4 bg-gray-50 p-4"
      style={{ borderLeft: "4px solid #6366f1" }}
    >
      <Column>
        <Text className="m-0 text-base font-semibold text-gray-900">
          {processedTitle}
          {withPerson && (
            <span className="font-semibold text-indigo-600">{withPerson}</span>
          )}
        </Text>
        <Text className="m-0 mt-2 text-sm leading-relaxed text-gray-600">
          {processedSummary}
        </Text>
      </Column>
    </Row>
  );
}
