import { Hr, Section, Text } from "@react-email/components";

import { cn } from "~/lib/utils";

import { HighlightableText } from "./highlightable-text";

export type ReportTeaserSectionProps = {
  teaser: string;
  className?: string;
};

export function ReportTeaserSection({
  teaser,
  className,
}: ReportTeaserSectionProps) {
  // Split the teaser into sentences
  const sentences = teaser.split(/(?<=\.|\!|\?) /);
  const lastSentence = sentences.pop() || "";
  const mainTeaser = sentences.join(" ");

  return (
    <Section className={cn("mt-6", className)}>
      <Text className="m-0 text-sm leading-relaxed text-gray-500">
        <HighlightableText highlightClassName="font-semibold text-indigo-600">
          {mainTeaser}
        </HighlightableText>
      </Text>

      {lastSentence && (
        <>
          <Hr className="my-6" />
          <Text className="mt-2 text-gray-600">
            {lastSentence.replace(/<highlight>|<\/highlight>/g, "")}
          </Text>
          <Hr className="my-6" />
        </>
      )}
    </Section>
  );
}
