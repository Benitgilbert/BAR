import type { Metadata } from "next";
import { connection } from "next/server";

import { AccessManager } from "@/components/access-manager";
import { requirePageCapability } from "@/lib/auth";
import { capabilityCatalog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Access", description: "Manage Umugano worker access and delegation." };

export default async function AccessPage() {
  await connection();
  await requirePageCapability("access.manage");
  const [users, grants] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, email: true, role: true }, orderBy: { fullName: "asc" } }),
    prisma.accessGrant.findMany({ where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, include: { recipient: { select: { id: true, fullName: true, email: true, role: true } }, grantedBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <AccessManager initialUsers={users} initialGrants={grants.map((grant) => ({ ...grant, expiresAt: grant.expiresAt?.toISOString() ?? null }))} initialCapabilities={capabilityCatalog} />;
}
