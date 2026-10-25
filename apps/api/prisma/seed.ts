import { PrismaClient, Category, CategoryKind } from '@prisma/client';
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

const APP_CATEGORIES: Array<{ pattern: string; category: Category }> = [
  // productive
  { pattern: 'code', category: Category.productive },
  { pattern: 'cursor', category: Category.productive },
  { pattern: 'windowsterminal', category: Category.productive },
  { pattern: 'notepad', category: Category.productive },
  { pattern: 'winword', category: Category.productive },
  { pattern: 'excel', category: Category.productive },
  { pattern: 'powerpnt', category: Category.productive },
  { pattern: 'figma', category: Category.productive },

  // communication
  { pattern: 'whatsapp', category: Category.communication },
  { pattern: 'slack', category: Category.communication },
  { pattern: 'teams', category: Category.communication },
  { pattern: 'ms-teams', category: Category.communication },
  { pattern: 'discord', category: Category.communication },
  { pattern: 'outlook', category: Category.communication },

  // entertainment
  { pattern: 'spotify', category: Category.entertainment },
  { pattern: 'vlc', category: Category.entertainment },
  { pattern: 'steam', category: Category.entertainment },
];

export async function seedCategories() {
  for (const item of DOMAIN_CATEGORIES) {
    await prisma.domainCategory.upsert({
      where: {
        kind_pattern: {
          kind: CategoryKind.domain,
          pattern: item.pattern,
        },
      },
      update: { category: item.category },
      create: {
        kind: CategoryKind.domain,
        pattern: item.pattern,
        category: item.category,
      },
    });
  }

  for (const item of APP_CATEGORIES) {
    await prisma.domainCategory.upsert({
      where: {
        kind_pattern: {
          kind: CategoryKind.app,
          pattern: item.pattern,
        },
      },
      update: { category: item.category },
      create: {
        kind: CategoryKind.app,
        pattern: item.pattern,
        category: item.category,
      },
    });
  }
}

async function main() {
  await seedCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
