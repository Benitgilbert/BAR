import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await requireCapability("audit.view"))) {
    return Response.json({ error: "Owner audit access is required" }, { status: 403 });
  }
  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim();
  const events = await prisma.auditEvent.findMany({
    where: action ? { action: { contains: action, mode: "insensitive" } } : undefined,
    include: { actor: { select: { fullName: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({ events });
}
