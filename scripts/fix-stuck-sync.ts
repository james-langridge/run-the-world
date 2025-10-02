import { prisma } from '../lib/db/prisma';

async function main() {
  const result = await prisma.user.updateMany({
    where: { syncStatus: 'SYNCING' },
    data: { syncStatus: 'FAILED' }
  });

  console.log(`Fixed ${result.count} stuck sync(s)`);

  await prisma.$disconnect();
}

main().catch(console.error);
