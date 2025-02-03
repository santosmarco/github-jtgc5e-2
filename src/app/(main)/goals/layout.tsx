import { api, HydrateClient } from "~/trpc/server";

export default async function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await Promise.all([
    api.auth.getUser.prefetch(),
    api.goals.getGoals.prefetch(),
  ]);

  return <HydrateClient>{children}</HydrateClient>;
}
