import { notFound, redirect } from "next/navigation";

import { api } from "~/trpc/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: Awaited<ReturnType<typeof api.auth.getUser>> | null = null;
  try {
    user = await api.auth.getUser();
    if (!user.is_admin) {
      notFound();
    }
  } catch (error) {
    console.error("Failed to get user:", error);
    redirect("/login");
  }

  return (
    <div
      className="absolute -bottom-7 -top-12 left-0 right-0 overflow-hidden"
      style={{ overflow: "hidden", position: "fixed" }}
    >
      {children}
    </div>
  );
}
