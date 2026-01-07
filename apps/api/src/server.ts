import app from './app';
import { config } from './config';
import prisma from './db/prisma';
import logger from './lib/logger';

/**
 * Starts the API server
 * Validates environment, tests DB connection, and starts listening
 */
async function start() {
  try {
    logger.info({
      msg: 'Starting API server...',
      environment: config.nodeEnv,
      port: config.port,
    });

    // Test database connection
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info({
        msg: 'API server started successfully',
        port: config.port,
        environment: config.nodeEnv,
        nodeVersion: process.version,
      });

      console.log('');
      console.log('🚀 API Server Ready');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   URL: http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Health: http://localhost:${config.port}/health`);
      console.log(`   Ready: http://localhost:${config.port}/ready`);
      console.log(`   API Docs: http://localhost:${config.port}/api-docs`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });

    // Set timeout for long-running requests
    server.setTimeout(30000); // 30 seconds

    // Setup graceful shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown...`);
  console.log(`\n⏳ ${signal} received, shutting down gracefully...`);

  try {
    // Close database connections
    await prisma.$disconnect();
    logger.info('Database connections closed');
    console.log('✅ Database connections closed');

    // Exit successfully
    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Error during shutdown', error });
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ msg: 'Uncaught exception', error });
  console.error('❌ Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ msg: 'Unhandled promise rejection', reason, promise });
  console.error('❌ Unhandled rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Start server
start();
