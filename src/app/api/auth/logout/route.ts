import { recordAuditEvent } from "@/lib/audit";
import { destroyCurrentSession, getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    await recordAuditEvent({
      actorId: user.id,
      action: "USER_LOGOUT",
      entityType: "User",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
  }
  await destroyCurrentSession();
  return Response.json({ ok: true });
}
