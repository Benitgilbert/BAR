import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.OWNER_EMAIL ?? "owner@umugano.rw").toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!password) throw new Error("OWNER_PASSWORD is required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Owner not found: ${email}`);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Updated password for ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
