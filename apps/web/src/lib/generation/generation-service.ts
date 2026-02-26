import { prisma } from '@/lib/prisma';
import { ProductDivider } from './product-divider';
import { VariableInjector } from './variable-injector';
import { TemplateRenderer } from './template-renderer';
import { ImageGenerator } from './image-generator';
import { logger, getStorage } from '@insertflow/lib';

interface GenerateEncarteInput {
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

export class GenerationService {
  private divider = new ProductDivider();
  private injector = new VariableInjector();
  private renderer = new TemplateRenderer();
  private imageGenerator = new ImageGenerator();

  async generate(input: GenerateEncarteInput, onProgress?: (progress: number) => void) {
    logger.info({ input }, 'Starting generation');

    // 1. Criar job no banco
    const job = await prisma.generationJob.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        folderId: input.folderId,
        format: input.format,
        status: 'processing',
        progress: 0,
        metadata: { productIds: input.productIds },
      },
    });

    try {
      // 2. Buscar produtos
      const products = await prisma.product.findMany({
        where: {
          id: { in: input.productIds },
          orgId: input.orgId,
        },
        include: { images: true },
      });

      if (products.length === 0) {
        throw new Error('No products found');
      }

      // 3. Buscar templates da pasta + formato
      const templates = await prisma.template.findMany({
        where: {
          folderId: input.folderId,
          format: input.format,
          orgId: input.orgId,
        },
      });

      if (templates.length === 0) {
        throw new Error('No templates found for this folder and format');
      }

      // 4. Dividir produtos
      const allocations = this.divider.divide(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          imagePath: (p.images[0]?.urls as any)?.optimized || null,
        })),
        templates as any
      );

      logger.info({ allocations: allocations.length }, 'Products divided');

      // 5. Gerar cada encarte
      const storage = getStorage();
      const folder = await prisma.folder.findUnique({ where: { id: input.folderId } });
      const dateJobId = `${new Date().toISOString().split('T')[0]}-${job.id}`;
      const basePath = `org-${input.orgId}/templates/${folder?.name}/${input.format}/generated/${dateJobId}`;

      const generatedEncartes = [];

      for (let i = 0; i < allocations.length; i++) {
        const allocation = allocations[i];
        const progress = Math.round(((i + 1) / allocations.length) * 100);

        logger.info({ index: i, progress }, 'Generating encarte');

        // Injetar variáveis
        const injectedData = this.injector.inject(
          allocation.template.data as any,
          allocation.products,
          input.globalData
        );

        // Renderizar HTML
        const html = this.renderer.renderToHTML(
          injectedData,
          allocation.template.width,
          allocation.template.height
        );

        // Gerar PNG
        const outputPath = `${basePath}/encarte-${i + 1}.png`;
        await this.imageGenerator.generatePNG(
          html,
          allocation.template.width,
          allocation.template.height,
          outputPath
        );

        // Salvar no banco
        const encarte = await prisma.generatedEncarte.create({
          data: {
            jobId: job.id,
            templateId: allocation.template.id,
            filePath: outputPath,
            fileUrl: storage.getUrl(outputPath),
            products: allocation.products.map((p) => ({ id: p.id, name: p.name, price: p.price })),
          },
        });

        generatedEncartes.push(encarte);

        // Atualizar progresso
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { progress },
        });

        if (onProgress) onProgress(progress);
      }

      // 6. Marcar produtos como processados
      await prisma.product.updateMany({
        where: { id: { in: input.productIds } },
        data: { processed: true },
      });

      // 7. Finalizar job
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
      });

      logger.info({ jobId: job.id, encartes: generatedEncartes.length }, 'Generation completed');

      return {
        jobId: job.id,
        encartes: generatedEncartes,
      };
    } catch (error: any) {
      logger.error({ error, jobId: job.id }, 'Generation failed');

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      throw error;
    } finally {
      await this.imageGenerator.close();
    }
  }
}
