import './generation.worker';
import { logger, redis } from '@insertflow/lib';

logger.info('Workers initialized');

// Test Redis connection
redis.ping().then(() => {
  logger.info('Redis connection OK');
}).catch((err) => {
  logger.error({ error: err }, 'Redis connection FAILED');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
