import "~/styles/globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ProfileProvider } from "~/components/profile-provider";
import { PostHogProvider } from "~/components/providers/posthog";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Titan",
  description: "Discover insights from your recorded meetings",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
} satisfies Metadata;

export default function RootLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark bg-background text-foreground`}
    >
      <body>
        <NuqsAdapter>
          <TRPCReactProvider>
            <ProfileProvider>
              <TooltipProvider delayDuration={0}>
                <PostHogProvider>
                  {children}
                  <Toaster />
                  <Analytics />
                  <SpeedInsights />
                </PostHogProvider>
              </TooltipProvider>
            </ProfileProvider>
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
