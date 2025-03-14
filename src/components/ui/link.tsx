import NextLink from "next/link";
import * as React from "react";

import { cn } from "~/lib/utils";

export const Link = React.forwardRef<
  React.ElementRef<typeof NextLink>,
  React.ComponentPropsWithoutRef<typeof NextLink>
>(function Link({ className, children, ...props }, ref) {
  // Check if the child is a button or has a block-level style
  const isButtonOrBlock =
    typeof className === "string" &&
    (className.includes("w-full") || className.includes("block"));

  return (
    <NextLink
      ref={ref}
      className={cn(
        isButtonOrBlock
          ? className
          : "underline underline-offset-4 transition-all hover:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </NextLink>
  );
});
