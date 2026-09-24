import bcrypt from "bcryptjs";
import { PrismaClient, StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const requestedEmail = process.env.OWNER_EMAIL?.trim().toLowerCase() || undefined;
  const requestedName = process.env.OWNER_NAME?.trim() || undefined;
  const password = process.env.OWNER_PASSWORD;
  if (!password) throw new Error("OWNER_PASSWORD is required");

  const user = requestedEmail
    ? (await prisma.user.findUnique({ where: { email: requestedEmail } })) ??
      (await prisma.user.findFirst({ where: { role: StaffRole.OWNER }, orderBy: { createdAt: "asc" } }))
    : await prisma.user.findFirst({ where: { role: StaffRole.OWNER }, orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No Owner account found");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(requestedEmail ? { email: requestedEmail } : {}),
      ...(requestedName ? { fullName: requestedName } : {}),
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`Updated Owner account: ${requestedEmail ?? user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
