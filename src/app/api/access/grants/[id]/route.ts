import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireCapability("access.manage");
  if (!actor) return Response.json({ error: "Owner access is required" }, { status: 403 });
  const { id } = await params;

  try {
    const grant = await prisma.accessGrant.update({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAuditEvent({ actorId: actor.id, action: "ACCESS_REVOKED", entityType: "AccessGrant", entityId: grant.id, metadata: { recipientId: grant.recipientId, capability: grant.capability } });
    return Response.json({ grant });
  } catch {
    return Response.json({ error: "Active grant not found" }, { status: 404 });
  }
}
