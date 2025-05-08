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

  // Process the mainTeaser to handle different highlight types
  const renderHighlightedText = (text: string) => {
    const regex =
      /<highlight:(strength|growth|moment)>(.*?)<\/highlight:\1>|([^<]+)/g;
    const parts: React.ReactNode[] = [];
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      const [, type, highlightedText, plainText] = match;

      if (plainText) {
        parts.push(plainText);
      } else if (type && highlightedText) {
        let className = "";

        if (type === "strength") {
          className = "font-semibold text-emerald-600";
        } else if (type === "growth") {
          className = "font-semibold text-amber-600";
        } else if (type === "moment") {
          className = "";
        }

        parts.push(
          <HighlightableText
            key={key++}
            highlightClassName={className}
            force={true}
          >
            {highlightedText}
          </HighlightableText>,
        );
      }
    }

    return parts;
  };

  return (
    <Section className={cn("mt-6", className)}>
      <Text className="m-0 text-sm leading-relaxed text-gray-500">
        {renderHighlightedText(mainTeaser)}
      </Text>

      {lastSentence && (
        <>
          <Hr className="my-6" />
          <Text className="mt-2 text-sm font-semibold leading-relaxed text-gray-600">
            {lastSentence.replace(
              /<highlight:(strength|growth|moment)>|<\/highlight:(strength|growth|moment)>|<highlight>|<\/highlight>/g,
              "",
            )}
          </Text>
          <Hr className="mt-6" />
        </>
      )}
    </Section>
  );
}
