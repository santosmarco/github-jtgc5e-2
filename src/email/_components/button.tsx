import { Button as EmailButton, Section } from "@react-email/components";
import type React from "react";

import { cn } from "~/lib/utils";

export function Button({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Section className="my-8 text-center">
      <EmailButton
        href={href}
        className={cn(
          "rounded bg-black px-5 py-3 text-xs font-semibold text-white no-underline hover:bg-gray-900",
          className,
        )}
      >
        {children}
      </EmailButton>
    </Section>
  );
}
