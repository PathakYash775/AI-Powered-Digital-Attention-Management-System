import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://attention_app:attention_dev_secret_change_me@127.0.0.1:5432/attention_dev?schema=public',
    },
  },
});

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, createdAt: true },
  });
  const goals = await prisma.goal.count();
  const focus = await prisma.focusSession.count();
  const activities = await prisma.activityLog.count();
  const devices = await prisma.device.count();
  const categories = await prisma.domainCategory.count();

  console.log('=== POSTGRESQL DATABASE VERIFICATION ===');
  console.log('Connected to PostgreSQL: 127.0.0.1:5432');
  console.log('Database Name: attention_dev');
  console.log('Total Registered Users in DB:', users.length);
  console.log('User Records:', users);
  console.log('Goal Records in DB:', goals);
  console.log('Focus Session Records in DB:', focus);
  console.log('Activity Telemetry Rows in DB:', activities);
  console.log('Devices Registered in DB:', devices);
  console.log('Pre-seeded Category Rules in DB:', categories);
}

main()
  .catch((e) => {
    console.error('Database connection error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
