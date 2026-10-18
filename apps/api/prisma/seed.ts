import { PrismaClient, Category } from '@prisma/client';
import process from 'node:process';

const prisma = new PrismaClient();

const DOMAIN_CATEGORIES: Array<{ pattern: string; category: Category }> = [
  // entertainment
  { pattern: 'youtube.com', category: Category.entertainment },
  { pattern: 'netflix.com', category: Category.entertainment },

  // social
  { pattern: 'instagram.com', category: Category.social },
  { pattern: 'facebook.com', category: Category.social },
  { pattern: 'x.com', category: Category.social },
  { pattern: 'twitter.com', category: Category.social },
  { pattern: 'reddit.com', category: Category.social },
  { pattern: 'linkedin.com', category: Category.social },

  // communication
  { pattern: 'web.whatsapp.com', category: Category.communication },
  { pattern: 'slack.com', category: Category.communication },
  { pattern: 'discord.com', category: Category.communication },
  { pattern: 'teams.microsoft.com', category: Category.communication },
  { pattern: 'mail.google.com', category: Category.communication },

  // productive
  { pattern: 'github.com', category: Category.productive },
  { pattern: 'chatgpt.com', category: Category.productive },
  { pattern: 'claude.ai', category: Category.productive },
  { pattern: 'notion.so', category: Category.productive },
  { pattern: 'linear.app', category: Category.productive },
  { pattern: 'localhost', category: Category.productive },
];

export async function seedDomainCategories() {
  for (const item of DOMAIN_CATEGORIES) {
    await prisma.domainCategory.upsert({
      where: { pattern: item.pattern },
      update: { category: item.category },
      create: { pattern: item.pattern, category: item.category },
    });
  }
}

async function main() {
  await seedDomainCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
