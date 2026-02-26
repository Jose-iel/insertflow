import { Worker, Job } from 'bullmq';
import { redis, logger } from '@insertflow/lib';
import { GenerationService } from './services/generation-service';

interface GenerationJobData {
  orgId: string;
  userId: string;
  folderId: string;
  format: 'feed' | 'stories';
  productIds: string[];
  globalData?: {
    validUntil?: string;
    header?: string;
  };
}

const generationService = new GenerationService();

const worker = new Worker<GenerationJobData>(
  'encarte-generation',
  async (job: Job<GenerationJobData>) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing generation job');

    try {
      const result = await generationService.generate(job.data, (progress) => {
        job.updateProgress(progress);
      });

      return result;
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Generation job failed');
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2, // Processar 2 jobs em paralelo
    limiter: {
      max: 10, // Máximo 10 jobs por minuto
      duration: 60000,
    },
  }
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Generation job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Generation job failed');
});

logger.info('Generation worker started');
