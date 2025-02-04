"use client";

import { BarChart3Icon, CalendarDaysIcon, GoalIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { GenerateReportButton } from "~/components/goals/generate-report-button";
import { api } from "~/trpc/react";
import { useProfile } from "~/hooks/use-profile";

export function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();

  const { data: user } = api.auth.getUser.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: goals } = api.goals.getGoals.useQuery(
    { user_id: profile?.id ?? user?.id },
    {
      refetchOnWindowFocus: false,
      enabled: Boolean(user?.id),
    },
  );

  return (
    <div className="sticky top-0 z-10 -mx-12 border-b bg-background/10 backdrop-blur-md">
      <div className="-ml-2 flex items-center justify-between px-6 py-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs
            value={
              pathname.startsWith("/goals/reports")
                ? pathname.match(
                    /^\/goals\/reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
                  )
                  ? undefined
                  : "reports"
                : "goals"
            }
            className="inline-flex gap-1 rounded-lg bg-transparent p-1"
          >
            <TabsList className="-ml-3 bg-transparent">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50">
                      <CalendarDaysIcon className="h-4 w-4 stroke-[2.5px]" />
                      Summary
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TabsTrigger
                value="goals"
                className="inline-flex items-center gap-2 rounded-md bg-transparent px-3 py-1.5 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                onClick={() => router.push("/goals")}
              >
                <GoalIcon className="h-4 w-4 stroke-[2.5px]" />
                Goals
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                onClick={() => router.push("/goals/reports")}
              >
                <BarChart3Icon className="h-4 w-4 stroke-[2.5px]" />
                Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {goals && (pathname === "/goals" || pathname === "/goals/reports") && (
          <GenerateReportButton goals={goals} />
        )}
      </div>
    </div>
  );
}
