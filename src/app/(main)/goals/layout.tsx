import { api, HydrateClient } from "~/trpc/server";

import { NavigationBar } from "./navigation-bar";

export default async function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await Promise.all([
    api.auth.getUser.prefetch(),
    api.goals.getGoals.prefetch(),
  ]);

  return (
    <HydrateClient>
      <div className="-mt-12">
        {/* <NavigationBar /> */}
        {children}
      </div>
    </HydrateClient>
  );
}
