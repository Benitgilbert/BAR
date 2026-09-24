import type { Metadata } from "next";
import { connection } from "next/server";

import { TeamManager } from "@/components/team-manager";
import { requirePageCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Team", description: "Manage Umugano worker accounts." };

export default async function TeamPage() {
  await connection();
  await requirePageCapability("users.manage");
  const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, phone: true, role: true, active: true }, orderBy: [{ active: "desc" }, { fullName: "asc" }] });
  return <TeamManager initialUsers={users} />;
}
