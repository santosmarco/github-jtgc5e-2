import { redirect } from "next/navigation";

import { AppSidebar } from "~/components/app-sidebar";
import OnboardingFlow from "~/components/onboarding-flow";
import { OnboardingFlowStage2 } from "~/components/onboarding-flow-stage-2";
import { ProfileWarning } from "~/components/profile-warning";
import { FeedbackButton } from "~/components/ui/feedback-button";
import { ZoomIntegrationBanner } from "~/components/zoom-banner";
import { logger } from "~/lib/logging/server";
import { api } from "~/trpc/server";

export default async function MainLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  let user: Awaited<ReturnType<typeof api.auth.getUser>> | null = null;
  try {
    user = await api.auth.getUser();
  } catch (error) {
    logger.error("Failed to get user:", { error });
    redirect("/login");
  }

  await Promise.all([
    api.videos.list.prefetch({
      limit: 12,
      options: {
        tags: [user.id],
      },
    }),
    api.moments.listForInsights.prefetch({
      userId: user.id,
      videoId: undefined,
      topic: undefined,
      limit: 100,
      includeFullDetails: false,
    }),
  ]);

  const meetings = await api.meetings
    .getForProfile({ profileId: user.id, limit: 11 })
    .catch(() => []);

  return (
    <>
      <ProfileWarning />
      <AppSidebar user={user} />
      <div className="pt-6 lg:pl-72 lg:pt-0">
        <ZoomIntegrationBanner />
        <main className="p-4 py-12 lg:p-12">
          {!user.did_complete_onboarding && <OnboardingFlow user={user} />}
          {(meetings.length >= 10 || user.force_post_ten_meeting_onboarding) &&
            user.did_complete_onboarding &&
            !user.did_complete_post_ten_meeting_onboarding && (
              <OnboardingFlowStage2 user={user} />
            )}
          {children}
        </main>
      </div>
      <FeedbackButton />
    </>
  );
}
