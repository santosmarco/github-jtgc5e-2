import { Section, Text } from "@react-email/components";

import { cn } from "~/lib/utils";

import { Button } from "./button";

type CTAButtonSectionProps = {
  href: string;
  buttonText: string;
  description?: string;
  buttonClassName?: string;
  className?: string;
};

export function CTAButtonSection({
  href,
  buttonText,
  description,
  buttonClassName,
  className,
}: CTAButtonSectionProps) {
  return (
    <Section className={cn("text-center", className)}>
      <Button href={href} className={buttonClassName}>
        {buttonText}
      </Button>

      {description && (
        <Text className="mt-4 text-sm text-gray-500">{description}</Text>
      )}
    </Section>
  );
}
