import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const accounts = [
  { email: "owner@umugano.rw", env: "OWNER_PASSWORD" },
  { email: "reception@umugano.rw", env: "FRONT_DESK_PASSWORD" },
  { email: "mucoma@umugano.rw", env: "MUCOMA_PASSWORD" },
] as const;

async function main() {
  for (const account of accounts) {
    const password = process.env[account.env];
    if (!password) throw new Error(`${account.env} is required`);
    const user = await prisma.user.findUnique({ where: { email: account.email } });
    if (!user) throw new Error(`User not found: ${account.email}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Updated password for ${account.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
