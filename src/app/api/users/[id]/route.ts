import { StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface UserUpdate {
  fullName?: string;
  phone?: string | null;
  role?: StaffRole;
  active?: boolean;
  password?: string;
}

const assignableRoles = new Set<string>([StaffRole.OWNER, StaffRole.MUCOMA, StaffRole.FRONT_DESK]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireCapability("users.manage");
  if (!actor) return Response.json({ error: "Owner access is required" }, { status: 403 });
  const { id } = await params;
  let body: UserUpdate;
  try {
    body = (await request.json()) as UserUpdate;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "User not found" }, { status: 404 });
    if (current.role === StaffRole.OWNER && (body.active === false || (body.role && body.role !== StaffRole.OWNER))) return Response.json({ error: "The bootstrap Owner cannot be demoted or deactivated here" }, { status: 400 });
    if (body.role !== undefined && !assignableRoles.has(body.role)) return Response.json({ error: "Invalid role" }, { status: 400 });
    const data: { fullName?: string; phone?: string | null; role?: StaffRole; active?: boolean; passwordHash?: string } = {};
    if (body.fullName !== undefined) data.fullName = body.fullName.trim();
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.password) {
      if (body.password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, phone: true, role: true, active: true } });
    await recordAuditEvent({ actorId: actor.id, action: body.password ? "PASSWORD_RESET" : "USER_UPDATED", entityType: "User", entityId: user.id, metadata: { email: user.email, before: { role: current.role, active: current.active }, after: { role: user.role, active: user.active } } });
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update user" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireCapability("users.manage");
  if (!actor) return Response.json({ error: "Owner access is required" }, { status: 403 });
  const { id } = await params;
  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "User not found" }, { status: 404 });
    if (current.role === StaffRole.OWNER) return Response.json({ error: "The bootstrap Owner cannot be deactivated" }, { status: 400 });
    const user = await prisma.user.update({ where: { id }, data: { active: false }, select: { id: true, fullName: true, email: true, role: true, active: true } });
    await recordAuditEvent({ actorId: actor.id, action: "USER_DEACTIVATED", entityType: "User", entityId: user.id, metadata: { email: user.email, role: user.role } });
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to deactivate user" }, { status: 400 });
  }
}
