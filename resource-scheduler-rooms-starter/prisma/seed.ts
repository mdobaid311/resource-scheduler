import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.room.createMany({
    data: [
      { name: "Atlas", seats: 8 },
      { name: "Borealis", seats: 4 },
    ],
  });
}

main().finally(() => prisma.$disconnect());
