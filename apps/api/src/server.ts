import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const port = env.PORT;
const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on http://localhost:${port}`);
  console.log(`\n=============================================================`);
  console.log(`🚀 Attention Platform Backend Server is ACTIVE on port ${port}!`);
  console.log(``);
  console.log(`👉 Swagger UI Docs (Ctrl + Click to open):`);
  console.log(`   http://127.0.0.1:${port}/docs`);
  console.log(``);
  console.log(`👉 API Base URL:`);
  console.log(`   http://127.0.0.1:${port}/api/v1`);
  console.log(`=============================================================\n`);
});

// Also bind companion port 3000 so extensions configured for port 3000 connect seamlessly
let companionServer: ReturnType<typeof app.listen> | null = null;
if (port !== 3000) {
  try {
    companionServer = app.listen(3000, '0.0.0.0', () => {
      console.log(`🔌 Extension compatibility bridge listening on http://127.0.0.1:3000`);
    });
    companionServer.on('error', (err: { message: string }) => {
      logger.warn(`Port 3000 companion bridge not bound: ${err.message}`);
    });
  } catch (err) {
    logger.warn('Could not start companion listener on port 3000');
  }
}

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Gracefully shutting down...`);

  if (companionServer) {
    companionServer.close();
  }
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error closing database connection.');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
