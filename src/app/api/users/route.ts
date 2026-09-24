import { StaffRole } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { recordAuditEvent } from "@/lib/audit";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface UserRequest {
  fullName?: string;
  email?: string;
  phone?: string | null;
  role?: StaffRole;
  password?: string;
}

const assignableRoles = new Set<string>([StaffRole.OWNER, StaffRole.MUCOMA, StaffRole.FRONT_DESK]);

function temporaryPassword() {
  return `Umugano-${randomBytes(6).toString("hex")}`;
}

export async function GET() {
  if (!(await requireCapability("users.manage"))) return Response.json({ error: "Owner access is required" }, { status: 403 });
  const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true }, orderBy: [{ active: "desc" }, { fullName: "asc" }] });
  return Response.json({ users });
}

export async function POST(request: Request) {
  const actor = await requireCapability("users.manage");
  if (!actor) return Response.json({ error: "Owner access is required" }, { status: 403 });
  let body: UserRequest;
  try {
    body = (await request.json()) as UserRequest;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const fullName = body.fullName?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  if (!fullName || !email || !role || !assignableRoles.has(role)) return Response.json({ error: "Name, email, and role are required" }, { status: 400 });
  const password = body.password?.trim() || temporaryPassword();
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  try {
    const user = await prisma.user.create({ data: { fullName, email, phone: body.phone?.trim() || null, role, passwordHash: await bcrypt.hash(password, 12) }, select: { id: true, fullName: true, email: true, phone: true, role: true, active: true, createdAt: true } });
    await recordAuditEvent({ actorId: actor.id, action: "USER_CREATED", entityType: "User", entityId: user.id, metadata: { email: user.email, role: user.role, fullName: user.fullName } });
    return Response.json({ user, temporaryPassword: body.password ? undefined : password }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") return Response.json({ error: "That email is already registered" }, { status: 409 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create user" }, { status: 400 });
  }
}
