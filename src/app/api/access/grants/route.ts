import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Capability } from "@/lib/permissions";

const capabilities: Capability[] = [
  "dashboard.view",
  "pos.use",
  "orders.create",
  "orders.dispatch",
  "orders.settle",
  "rooms.manage",
  "products.manage",
  "stock.manage",
  "kitchen.view",
  "kitchen.update",
  "users.manage",
  "access.manage",
  "audit.view",
];

interface GrantRequest {
  recipientId?: string;
  capability?: string;
  expiresAt?: string | null;
  reason?: string | null;
}

export async function GET() {
  if (!(await requireCapability("access.manage"))) {
    return Response.json({ error: "Owner access is required" }, { status: 403 });
  }

  const [users, grants] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, email: true, role: true }, orderBy: { fullName: "asc" } }),
    prisma.accessGrant.findMany({
      where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { recipient: { select: { fullName: true, email: true, role: true } }, grantedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return Response.json({ users, grants, capabilities });
}

export async function POST(request: Request) {
  const actor = await requireCapability("access.manage");
  if (!actor) return Response.json({ error: "Owner access is required" }, { status: 403 });

  let body: GrantRequest;
  try {
    body = (await request.json()) as GrantRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.recipientId || !body.capability || !capabilities.includes(body.capability as Capability)) {
    return Response.json({ error: "Recipient and a valid capability are required" }, { status: 400 });
  }
  const recipient = await prisma.user.findFirst({ where: { id: body.recipientId, active: true } });
  if (!recipient) return Response.json({ error: "User not found" }, { status: 404 });
  if (recipient.role === "OWNER") return Response.json({ error: "Owner already has full access" }, { status: 400 });

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return Response.json({ error: "Expiry is invalid" }, { status: 400 });

  const grant = await prisma.accessGrant.create({
    data: { recipientId: recipient.id, capability: body.capability, grantedById: actor.id, expiresAt, reason: body.reason?.trim() || null },
    include: { recipient: { select: { fullName: true, email: true, role: true } } },
  });
  await recordAuditEvent({ actorId: actor.id, action: "ACCESS_GRANTED", entityType: "AccessGrant", entityId: grant.id, metadata: { recipientId: recipient.id, capability: body.capability, expiresAt: expiresAt?.toISOString() ?? null, reason: body.reason ?? null } });
  return Response.json({ grant }, { status: 201 });
}
