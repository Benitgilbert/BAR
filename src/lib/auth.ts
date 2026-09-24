import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  type Capability,
  type StaffRoleName,
} from "@/lib/permissions";

const SESSION_COOKIE = "umugano_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function mapRole(role: string): StaffRoleName {
  if (role === "OWNER" || role === "ADMIN") return "OWNER";
  if (role === "MUCOMA") return "MUCOMA";
  return "FRONT_DESK";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(
  userId: string,
  request?: Request,
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000);
  const userAgent = request?.headers.get("user-agent")?.slice(0, 500) ?? null;
  const forwardedFor = request?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          grantsReceived: {
            where: {
              revokedAt: null,
              startsAt: { lte: new Date() },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
    if (session) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return null;
  }

  const role = mapRole(session.user.role);
  const capabilities = new Set<Capability>();
  if (role === "OWNER") {
    // The Owner receives every permission without needing a grant row.
    capabilities.add("dashboard.view");
    capabilities.add("pos.use");
    capabilities.add("orders.create");
    capabilities.add("orders.dispatch");
    capabilities.add("orders.settle");
    capabilities.add("rooms.manage");
    capabilities.add("products.manage");
    capabilities.add("stock.manage");
    capabilities.add("kitchen.view");
    capabilities.add("kitchen.update");
    capabilities.add("users.manage");
    capabilities.add("access.manage");
    capabilities.add("audit.view");
  } else {
    const defaults: Record<Exclude<StaffRoleName, "OWNER">, Capability[]> = {
      FRONT_DESK: [
        "dashboard.view",
        "pos.use",
        "orders.create",
        "orders.dispatch",
        "orders.settle",
        "rooms.manage",
        "products.manage",
        "stock.manage",
        "kitchen.view",
      ],
      MUCOMA: ["kitchen.view", "kitchen.update"],
    };
    for (const capability of defaults[role]) capabilities.add(capability);
  }
  for (const grant of session.user.grantsReceived) {
    capabilities.add(grant.capability as Capability);
  }

  return {
    ...session.user,
    role,
    capabilities,
  };
}

export async function requireCapability(capability: Capability) {
  const user = await getCurrentUser();
  if (!user || !user.capabilities.has(capability)) {
    return null;
  }
  return user;
}

export async function requirePageCapability(capability: Capability) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.capabilities.has(capability)) redirect("/");
  return user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}
