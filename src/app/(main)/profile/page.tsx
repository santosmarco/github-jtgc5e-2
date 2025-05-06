import { ProfilePageClient } from "~/components/profile/page.client";
import { api } from "~/trpc/server";

export default async function ProfilePage() {
  const user = await api.auth.getUser();

  return <ProfilePageClient user={user} />;
}
