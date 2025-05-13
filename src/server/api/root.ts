import { calendarRouter } from "~/server/api/routers/calendar";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { actionItemsRouter } from "./routers/action-items";
import { aiRouter } from "./routers/ai";
import { authRouter } from "./routers/auth";
import { chatsRouter } from "./routers/chats";
import { clientsRouter } from "./routers/clients";
import { coachingFrameworksRouter } from "./routers/coaching-frameworks";
import { entitiesRouter } from "./routers/entities";
import { feedbacksRouter } from "./routers/feedbacks";
import { goalsRouter } from "./routers/goals";
import { meetingTopicsRouter } from "./routers/meeting-topics";
import { meetingsRouter } from "./routers/meetings";
import { momentsRouter } from "./routers/moments";
import { onboardingRouter } from "./routers/onboarding";
import { profileRouter } from "./routers/profile";
import { reportsRouter } from "./routers/reports";
import { sessionAnnotationsRouter } from "./routers/session-annotations";
import { sessionsRouter } from "./routers/sessions";
import { settingsRouter } from "./routers/settings";
import { skillsRouter } from "./routers/skills";
import { transcriptsRouter } from "./routers/transcripts";
import { userInvitesRouter } from "./routers/user-invites";
import { vectorSearchRouter } from "./routers/vectorSearch";
import { videosRouter } from "./routers/videos";

export const appRouter = createTRPCRouter({
  ai: aiRouter,
  auth: authRouter,
  chats: chatsRouter,
  moments: momentsRouter,
  videos: videosRouter,
  coachingFrameworks: coachingFrameworksRouter,
  clients: clientsRouter,
  userInvites: userInvitesRouter,
  settings: settingsRouter,
  onboarding: onboardingRouter,
  meetings: meetingsRouter,
  goals: goalsRouter,
  calendar: calendarRouter,
  transcripts: transcriptsRouter,
  feedbacks: feedbacksRouter,
  profile: profileRouter,
  reports: reportsRouter,
  actionItems: actionItemsRouter,
  meetingTopics: meetingTopicsRouter,
  skills: skillsRouter,
  sessions: sessionsRouter,
  sessionAnnotations: sessionAnnotationsRouter,
  entities: entitiesRouter,
  vectorSearch: vectorSearchRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
