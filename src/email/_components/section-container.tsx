import { Container, Text } from "@react-email/components";
import type { ReactNode } from "react";

type SectionContainerProps = {
  title?: string;
  emoji?: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
};

export function SectionContainer({
  title,
  emoji,
  children,
  className = "rounded-lg bg-gray-50 px-4",
  titleClassName = "text-sm leading-6 text-gray-900",
}: SectionContainerProps) {
  return (
    <Container className={className}>
      {title && (
        <Text className={titleClassName}>
          {emoji && `${emoji} `}
          {title}
        </Text>
      )}
      {children}
    </Container>
  );
}
