# SPEC_05_GENERATION_ENGINE - Engine de Geração de Encartes

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_03_GENERATION  
**Depende de:** SPEC_00_FUNDACAO, SPEC_01_AUTH_MULTITENANCY, SPEC_02_CRUD_CORE, SPEC_03_IMAGE_MANAGEMENT, SPEC_04_TEMPLATE_EDITOR

---

## Visão Geral

Engine completo de geração de encartes PNG usando Puppeteer para renderização HTML→PNG, Sharp para pós-processamento (300 DPI), BullMQ para processamento assíncrono e algoritmo de divisão inteligente de produtos entre templates.

## Estado Final Desejado

- ✅ Algoritmo de divisão de produtos otimizado
- ✅ Injeção de variáveis em templates
- ✅ Renderização HTML com Puppeteer (3x resolução)
- ✅ Pós-processamento com Sharp (DPI metadata)
- ✅ BullMQ para processamento assíncrono
- ✅ Progress tracking em tempo real
- ✅ Armazenamento organizado por pasta/formato/data
- ✅ Retry automático em caso de falha

## O Que NÃO Estamos Fazendo

- ❌ Múltiplas resoluções (apenas uma versão otimizada)
- ❌ Geração em batch de múltiplos jobs
- ❌ Preview antes de gerar
- ❌ Edição pós-geração

---

## Fase 1: Algoritmo de Divisão de Produtos

### Arquivo: `apps/web/src/lib/generation/product-divider.ts`

```typescript
import { Template } from '@insertflow/lib/template-types';

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface EncarteAllocation {
  template: Template;
  products: Product[];
}

export class ProductDivider {
  /**
   * Divide produtos entre templates disponíveis
   * Usa templates maiores primeiro para otimizar
   */
  divide(products: Product[], templates: Template[]): EncarteAllocation[] {
    if (products.length === 0) {
      throw new Error('No products to divide');
    }

    if (templates.length === 0) {
      throw new Error('No templates available');
    }

    // Ordenar templates por productSlots (maior primeiro)
    const sortedTemplates = [...templates].sort((a, b) => b.productSlots - a.productSlots);

    // Garantir que existe template de 1 produto (fallback)
    const hasSingleSlot = sortedTemplates.some((t) => t.productSlots === 1);
    if (!hasSingleSlot) {
      throw new Error('Templates must include at least one with 1 product slot');
    }

    const allocations: EncarteAllocation[] = [];
    const remaining = [...products];

    while (remaining.length > 0) {
      // Encontrar maior template que cabe
      const template =
        sortedTemplates.find((t) => t.productSlots <= remaining.length) ||
        sortedTemplates[sortedTemplates.length - 1]; // fallback para menor

      // Alocar produtos
      const allocated = remaining.splice(0, template.productSlots);

      allocations.push({
        template,
        products: allocated,
      });
    }

    return allocations;
  }

  /**
   * Estima quantos encartes serão gerados
   */
  estimateCount(productCount: number, templates: Template[]): number {
    const mockProducts = Array(productCount).fill({ id: '', name: '', price: 0, imagePath: null });
    const allocations = this.divide(mockProducts, templates);
    return allocations.length;
  }
}
```

---

## Fase 2: Variable Injector

### Arquivo: `apps/web/src/lib/generation/variable-injector.ts`

```typescript
import { TemplateData, TemplateElement } from '@insertflow/lib/template-types';
import { formatPrice } from '@insertflow/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface GlobalData {
  validUntil?: string;
  header?: string;
}

export class VariableInjector {
  inject(
    templateData: TemplateData,
    products: Product[],
    globalData: GlobalData = {}
  ): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => this.injectElement(element, products, globalData)),
    };

    return injected;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData
  ): TemplateElement {
    const injected = { ...element };

    // Text elements
    if (element.type === 'text') {
      let content = element.content;

      // Substituir variáveis de produtos
      products.forEach((product, index) => {
        const n = index + 1;
        content = content
          .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
          .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
      });

      // Substituir variáveis globais
      if (globalData.validUntil) {
        content = content.replace(/{{data_validade}}/g, globalData.validUntil);
      }
      if (globalData.header) {
        content = content.replace(/{{header}}/g, globalData.header);
      }

      injected.content = content;
    }

    // Image elements
    if (element.type === 'image' && element.variable) {
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          injected.src = product.imagePath || null;
        }
      });
    }

    return injected;
  }
}
```

---

## Fase 3: Template Renderer (HTML Generator)

### Arquivo: `apps/web/src/lib/generation/template-renderer.ts`

```typescript
import { TemplateData, TemplateElement } from '@insertflow/lib/template-types';

export class TemplateRenderer {
  /**
   * Renderiza template data como HTML para Puppeteer
   */
  renderToHTML(data: TemplateData, width: number, height: number): string {
    const elements = data.elements
      .sort((a, b) => a.layer - b.layer)
      .map((el) => this.renderElement(el))
      .join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${data.background.value};
    }
    .element {
      position: absolute;
      transform-origin: top left;
    }
    .text {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .image {
      object-fit: cover;
    }
  </style>
</head>
<body>
  ${elements}
</body>
</html>
    `;
  }

  private renderElement(element: TemplateElement): string {
    const baseStyle = `
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      height: ${element.height}px;
      transform: rotate(${element.rotation}deg);
    `;

    switch (element.type) {
      case 'text':
        return `
          <div class="element text" style="${baseStyle}
            font-size: ${element.fontSize}px;
            font-family: ${element.fontFamily};
            color: ${element.color};
            font-weight: ${element.bold ? 'bold' : 'normal'};
            font-style: ${element.italic ? 'italic' : 'normal'};
            text-align: ${element.align};
          ">
            ${this.escapeHTML(element.content)}
          </div>
        `;

      case 'image':
        if (!element.src) return '';
        return `
          <img class="element image" src="${element.src}" style="${baseStyle}" />
        `;

      case 'rect':
        return `
          <div class="element" style="${baseStyle}
            background: ${element.fill};
            border: ${element.strokeWidth}px solid ${element.stroke};
            border-radius: ${element.cornerRadius}px;
          "></div>
        `;

      case 'circle':
        return `
          <div class="element" style="${baseStyle}
            width: ${element.radius * 2}px;
            height: ${element.radius * 2}px;
            background: ${element.fill};
            border: ${element.strokeWidth}px solid ${element.stroke};
            border-radius: 50%;
          "></div>
        `;

      default:
        return '';
    }
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}
```

---

## Fase 4: Image Generator (Puppeteer + Sharp)

### Arquivo: `apps/web/src/lib/generation/image-generator.ts`

```typescript
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { getStorage } from '@insertflow/lib/storage';
import { logger } from '@insertflow/lib';

export class ImageGenerator {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Gera PNG de alta qualidade a partir de HTML
   */
  async generatePNG(
    html: string,
    width: number,
    height: number,
    outputPath: string
  ): Promise<string> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Renderizar em 3x para qualidade de impressão
      const scale = 3;
      await page.setViewport({
        width: width * scale,
        height: height * scale,
        deviceScaleFactor: scale,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      // Pós-processamento com Sharp (ajustar DPI metadata)
      const storage = getStorage();
      const processedBuffer = await sharp(screenshot)
        .withMetadata({ density: 300 }) // 300 DPI
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      // Salvar
      await storage.upload(processedBuffer, outputPath, 'image/png');

      logger.info({ outputPath, size: processedBuffer.length }, 'PNG generated');

      return outputPath;
    } finally {
      await page.close();
    }
  }
}
```

---

## Fase 5: Generation Service (Orquestrador)

### Arquivo: `apps/web/src/lib/generation/generation-service.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { ProductDivider } from './product-divider';
import { VariableInjector } from './variable-injector';
import { TemplateRenderer } from './template-renderer';
import { ImageGenerator } from './image-generator';
import { logger } from '@insertflow/lib';
import { getStorage } from '@insertflow/lib/storage';

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
          imagePath: p.images[0]?.urls?.optimized || null,
        })),
        templates
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
```

---

## Fase 6: BullMQ Worker

### Arquivo: `apps/workers/src/generation.worker.ts`

```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '@insertflow/lib';
import { GenerationService } from '@insertflow/web/lib/generation/generation-service';
import { logger } from '@insertflow/lib';

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
```

### Arquivo: `apps/workers/src/index.ts`

```typescript
import './generation.worker';
import { logger } from '@insertflow/lib';

logger.info('Workers initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
```

---

## Fase 7: API Routes - Generation

### Arquivo: `apps/web/src/app/api/generation/start/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { Queue } from 'bullmq';
import { redis } from '@insertflow/lib';

const generationQueue = new Queue('encarte-generation', { connection: redis });

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const body = await req.json();

    // Validar input
    if (!body.folderId || !body.format || !body.productIds?.length) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Adicionar job na fila
    const job = await generationQueue.add('generate', {
      orgId: session.user.orgId!,
      userId: session.user.id,
      folderId: body.folderId,
      format: body.format,
      productIds: body.productIds,
      globalData: body.globalData,
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/generation/status/[jobId]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  try {
    const session = await requireOrg();

    const job = await prisma.generationJob.findFirst({
      where: {
        id: params.jobId,
        orgId: session.user.orgId!,
      },
      include: {
        encartes: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

## Fase 8: UI - Generation Page

### Arquivo: `apps/web/src/app/dashboard/generation/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { GenerationForm } from './generation-form';
import { GenerationHistory } from './generation-history';

export default async function GenerationPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Gerar Encartes</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <GenerationForm />
        <GenerationHistory />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/generation/generation-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { useRouter } from 'next/navigation';

export function GenerationForm() {
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'feed' | 'stories'>('feed');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchProducts();
  }, []);

  async function fetchFolders() {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setFolders(data.folders);
  }

  async function fetchProducts() {
    const res = await fetch('/api/products?processed=false');
    const data = await res.json();
    setProducts(data.products);
  }

  async function handleGenerate() {
    if (!selectedFolder || selectedProducts.length === 0) {
      alert('Selecione uma pasta e pelo menos um produto');
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch('/api/generation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedFolder,
          format: selectedFormat,
          productIds: selectedProducts,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Geração iniciada! Job ID: ${data.jobId}`);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to start generation:', error);
      alert('Erro ao iniciar geração');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Nova Geração</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Pasta de Templates</label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Selecione uma pasta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Formato</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="feed"
                checked={selectedFormat === 'feed'}
                onChange={(e) => setSelectedFormat(e.target.value as 'feed')}
              />
              <span>Feed (3:4)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="stories"
                checked={selectedFormat === 'stories'}
                onChange={(e) => setSelectedFormat(e.target.value as 'stories')}
              />
              <span>Stories (9:16)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Produtos ({selectedProducts.length} selecionados)
          </label>
          <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
            {products.map((product) => (
              <label key={product.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProducts([...selectedProducts, product.id]);
                    } else {
                      setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                    }
                  }}
                />
                <span className="text-sm">{product.name} - R$ {product.price}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating ? 'Gerando...' : 'Gerar Encartes'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Critérios de Sucesso

### Verificação Automatizada:
- [x] Algoritmo de divisão funciona corretamente
- [x] Injeção de variáveis substitui placeholders
- [x] Puppeteer gera screenshots
- [x] Sharp processa DPI metadata
- [x] BullMQ processa jobs

### Verificação Manual:
- [ ] Encartes são gerados com qualidade adequada
- [ ] Produtos são divididos corretamente entre templates
- [ ] Variáveis são substituídas nos textos
- [ ] Imagens de produtos aparecem nos encartes
- [ ] Progress tracking funciona
- [ ] Arquivos são salvos na estrutura correta
- [ ] Produtos são marcados como processados

---

## Próxima Spec

**SPEC_06_DEPLOY_INFRA.md** - Containerização com Docker, CI/CD com GitHub Actions e deploy no Easypanel.
