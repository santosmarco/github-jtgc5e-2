import { calendarRouter } from "~/server/api/routers/calendar";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { authRouter } from "./routers/auth";
import { chatsRouter } from "./routers/chats";
import { clientsRouter } from "./routers/clients";
import { coachingFrameworksRouter } from "./routers/coaching-frameworks";
import { feedbacksRouter } from "./routers/feedbacks";
import { meetingsRouter } from "./routers/meetings";
import { momentsRouter } from "./routers/moments";
import { onboardingRouter } from "./routers/onboarding";
import { settingsRouter } from "./routers/settings";
import { transcriptsRouter } from "./routers/transcripts";
import { userInvitesRouter } from "./routers/user-invites";
import { videosRouter } from "./routers/videos";

export const appRouter = createTRPCRouter({
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
  calendar: calendarRouter,
  transcripts: transcriptsRouter,
  feedbacks: feedbacksRouter,
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
