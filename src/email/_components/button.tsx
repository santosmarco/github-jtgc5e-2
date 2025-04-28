import { Button as EmailButton, Section } from "@react-email/components";
import type React from "react";

export function Button({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="my-8 text-center">
      <EmailButton
        href={href}
        className="rounded bg-black px-5 py-3 text-xs font-semibold text-white no-underline hover:bg-gray-900"
      >
        {children}
      </EmailButton>
    </Section>
  );
}
