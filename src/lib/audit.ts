import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditClient = Pick<PrismaClient, "auditEvent">;

export async function recordAuditEvent(
  input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonObject;
    requestId?: string | null;
    ipAddress?: string | null;
  },
  client: AuditClient = prisma,
) {
  return client.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      requestId: input.requestId ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
