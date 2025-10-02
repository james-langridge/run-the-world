import { prisma } from '../lib/db/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      athleteId: true,
      syncStatus: true,
      syncStartedAt: true,
      lastSyncAt: true,
      syncProgress: true
    }
  });

  console.log('Current sync status:');
  console.table(users);

  await prisma.$disconnect();
}

main().catch(console.error);
