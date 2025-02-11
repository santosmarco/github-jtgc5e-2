"use client";

import { motion } from "framer-motion";
import { ArrowRight, Puzzle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { SiApple, SiGoogle, SiSlack, SiZoom } from "react-icons/si";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/client";
import { api, type RouterOutputs } from "~/trpc/react";

export type IntegrationsPageClientProps = {
  user: RouterOutputs["auth"]["getUser"];
};

export type Integration = {
  name: string;
  description: string;
  provider: Parameters<
    ReturnType<typeof createClient>["auth"]["linkIdentity"]
  >[0]["provider"];
  icon: React.ElementType;
  comingSoon?: boolean;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const integrations = [
  {
    name: "Google Calendar",
    description: "Sync your meetings and schedule recordings automatically.",
    provider: "google",
    icon: SiGoogle,
  },
  {
    name: "Zoom",
    description: "Automatically analyze and process your Zoom recordings.",
    provider: "zoom",
    icon: SiZoom,
    comingSoon: true,
  },
  {
    name: "Slack",
    description: "Share moments and insights directly to your Slack channels.",
    provider: "slack",
    icon: SiSlack,
    comingSoon: true,
  },
  {
    name: "Apple Calendar",
    description:
      "Seamlessly integrate meeting insights with your Apple Calendar.",
    provider: "apple",
    icon: SiApple,
    comingSoon: true,
  },
] satisfies Integration[];

export function IntegrationsPageClient() {
  const userQuery = api.auth.getUser.useQuery();
  const supabase = createClient();
  const router = useRouter();
  const [connectedTo, setConnectedTo] = useQueryState(
    "connectedTo",
    parseAsStringLiteral(integrations.map((i) => i.provider)),
  );
  const [connectingProviders, setConnectingProviders] = useState<
    Integration["provider"][]
  >([]);
  const [disconnectingProviders, setDisconnectingProviders] = useState<
    Integration["provider"][]
  >([]);

  const handleConnect = useCallback(
    async (provider: Integration["provider"]) => {
      setConnectingProviders((prev) => [...prev, provider]);

      const nonce = uuidv4();
      const state = encodeURIComponent(
        JSON.stringify({
          provider,
          nonce,
          timestamp: Date.now(),
          next: "/integrations",
        }),
      );

      void supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getBaseUrl()}auth/callback?state=${state}`,
          ...(provider === "google" && {
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
            scopes:
              "https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.calendars.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.readonly",
          }),
          ...(provider === "zoom" && {
            queryParams: {
              response_type: "code",
              access_type: "offline",
            },
            scopes: "meeting:read meeting:write recording:read recording:write",
          }),
        },
      });
    },
    [supabase],
  );

  const handleDisconnect = useCallback(
    async (provider: Integration["provider"]) => {
      setDisconnectingProviders((prev) => [...prev, provider]);

      const integrationIdentity = userQuery.data?.identities?.find(
        (i) => i.provider === provider,
      );

      if (!integrationIdentity) {
        toast.error("Not connected", {
          description: "You are not connected to this integration.",
        });
        setDisconnectingProviders((prev) => prev.filter((p) => p !== provider));
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(integrationIdentity);

      if (error) {
        toast.error("Failed to disconnect", { description: error.message });
        setDisconnectingProviders((prev) => prev.filter((p) => p !== provider));
        return;
      }

      await userQuery.refetch();

      toast.info("Disconnected", {
        description: "You are no longer connected to this integration.",
      });

      setDisconnectingProviders((prev) => prev.filter((p) => p !== provider));
    },
    [supabase, userQuery],
  );

  useEffect(() => {
    if (connectedTo) {
      toast.success(`Connected to ${connectedTo}`, {
        description: "You can now use this integration.",
      });

      void setConnectedTo(null);
    }
  }, [connectedTo, setConnectedTo]);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl space-y-12"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Puzzle className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="mb-4 text-4xl font-bold">Integrations</h1>
          <p className="text-lg text-muted-foreground">
            Connect Titan with your favorite tools and supercharge your
            workflow.
          </p>
        </motion.div>

        {/* Available Integrations */}
        <motion.div
          variants={containerVariants}
          className="grid gap-6 md:grid-cols-2"
        >
          {integrations.map((integration) => {
            const isConnected = userQuery.data?.identities?.some(
              (i) => i.provider === integration.provider,
            );
            const isLoading =
              userQuery.isLoading ||
              connectingProviders.includes(integration.provider) ||
              disconnectingProviders.includes(integration.provider);
            const providerList = userQuery.data?.identities?.map(
              (i) => i.provider,
            );

            return (
              <motion.div
                key={integration.provider}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <Card className="relative overflow-hidden border-2 border-border p-6 transition-colors duration-300 hover:border-primary/50">
                  <div className="absolute -right-12 -top-12 h-24 w-24 rotate-45 bg-gradient-to-br from-primary/10 to-transparent" />
                  <div className="mb-4 flex items-center gap-3">
                    <integration.icon className="h-5 w-5" />
                    <h3 className="text-xl font-semibold">
                      {integration.name}
                    </h3>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  <Button
                    variant={
                      isConnected
                        ? "destructive"
                        : integration.comingSoon
                          ? "outline"
                          : "default"
                    }
                    onClick={() =>
                      isConnected
                        ? handleDisconnect(integration.provider)
                        : handleConnect(integration.provider)
                    }
                    className="group/btn relative overflow-hidden"
                    disabled={
                      integration.comingSoon ??
                      (isLoading ||
                        (providerList?.length === 1 &&
                          integration.provider === providerList[0]))
                    }
                  >
                    <span className="relative z-10">
                      {integration.comingSoon
                        ? "Coming Soon"
                        : connectingProviders.includes(integration.provider)
                          ? "Connecting..."
                          : disconnectingProviders.includes(
                                integration.provider,
                              )
                            ? "Disconnecting..."
                            : isConnected
                              ? "Disconnect"
                              : isLoading
                                ? "Loading..."
                                : "Connect"}
                    </span>
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "0%" }}
                      className="absolute inset-0 z-0 bg-primary opacity-0 transition-opacity duration-300 group-hover/btn:opacity-10"
                    />
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Section */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <Link href="mailto:support@withtitan.com">
            <Button size="lg" className="group relative">
              Request an Integration
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 2, opacity: 0.1 }}
                className="absolute inset-0 z-0 rounded-full bg-primary"
              />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function getBaseUrl() {
  let url =
    env.NEXT_PUBLIC_SITE_URL ??
    env.NEXT_PUBLIC_VERCEL_URL ??
    window.location.origin;
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;
  return url;
}
