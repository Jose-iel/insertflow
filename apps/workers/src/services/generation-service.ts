import { prisma } from '@insertflow/database';
import { logger, getStorage, formatPrice, TemplateData, TemplateElement, Template } from '@insertflow/lib';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

// ============================================
// Product Divider
// ============================================

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

interface DivisionResult {
  allocations: EncarteAllocation[];
  unprocessedProducts: Product[];
}

class ProductDivider {
  divide(products: Product[], templates: Template[]): DivisionResult {
    if (products.length === 0) {
      return { allocations: [], unprocessedProducts: [] };
    }

    if (templates.length === 0) {
      return { allocations: [], unprocessedProducts: products };
    }

    // Ordenar templates por número de slots (maior primeiro)
    const sortedTemplates = [...templates].sort((a, b) => b.productSlots - a.productSlots);
    
    // Pegar o template com menor número de slots
    const smallestSlots = sortedTemplates[sortedTemplates.length - 1].productSlots;

    const allocations: EncarteAllocation[] = [];
    const remaining = [...products];

    while (remaining.length >= smallestSlots) {
      // Encontrar o melhor template que cabe exatamente nos produtos restantes
      const template = sortedTemplates.find((t) => t.productSlots <= remaining.length);
      
      if (!template) break;

      // Alocar produtos
      const allocated = remaining.splice(0, template.productSlots);

      allocations.push({
        template,
        products: allocated,
      });
    }

    // Produtos que sobraram (menos que o menor template)
    return {
      allocations,
      unprocessedProducts: remaining,
    };
  }
}

// ============================================
// Variable Injector
// ============================================

interface GlobalData {
  validUntil?: string;
  header?: string;
}

interface CustomValues {
  [varName: string]: string;
}

interface HighlightMapping {
  highlightProductIds: string[];
  normalProductIds: string[];
}

class VariableInjector {
  inject(
    templateData: TemplateData,
    products: Product[],
    globalData: GlobalData = {},
    customValues: CustomValues = {},
    highlightMapping?: HighlightMapping
  ): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => 
        this.injectElement(element, products, globalData, customValues, highlightMapping)
      ),
    };

    return injected;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData,
    customValues: CustomValues,
    highlightMapping?: HighlightMapping
  ): TemplateElement {
    const injected = { ...element };

    if (element.type === 'text') {
      let content = element.content;

      products.forEach((product, index) => {
        const n = index + 1;
        content = content
          .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
          .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
      });

      if (globalData.validUntil) {
        content = content.replace(/{{data_validade}}/g, globalData.validUntil);
      }
      if (globalData.header) {
        content = content.replace(/{{header}}/g, globalData.header);
      }

      // Substituir variáveis customizadas
      Object.entries(customValues).forEach(([varName, value]) => {
        const regex = new RegExp(`{{${varName}}}`, 'g');
        content = content.replace(regex, value || '');
      });

      (injected as any).content = content;
    }

    if (element.type === 'image') {
      logger.info({ 
        elementId: element.id, 
        variable: element.variable,
        originalSrc: element.src 
      }, 'Processing image element');
      
      if (element.variable) {
        // Variáveis padrão de produtos
        products.forEach((product, index) => {
          const n = index + 1;
          if (element.variable === `{{imagem_produto_${n}}}`) {
            logger.info({ 
              variable: element.variable, 
              productName: product.name,
              imagePath: product.imagePath 
            }, 'Injecting product image');
            (injected as any).src = product.imagePath || null;
          }
        });

        // Variáveis customizadas de imagem
        const match = element.variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
        if (match) {
          const varName = match[1];
          if (customValues[varName]) {
            (injected as any).src = customValues[varName];
          }
        }
      }
    }

    return injected;
  }
}

// ============================================
// Template Renderer
// ============================================

class TemplateRenderer {
  renderToHTML(data: TemplateData, width: number, height: number): string {
    const elements = data.elements
      .sort((a, b) => a.layer - b.layer)
      .map((el) => this.renderElement(el))
      .join('\n');

    // Tratar diferentes tipos de background
    let backgroundStyle = '';
    if (data.background.type === 'image') {
      backgroundStyle = `background-image: url('${data.background.value}'); background-size: cover; background-position: center;`;
    } else if (data.background.type === 'gradient') {
      backgroundStyle = `background: ${data.background.value};`;
    } else {
      backgroundStyle = `background-color: ${data.background.value};`;
    }

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
      ${backgroundStyle}
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
            font-weight: ${element.fontWeight};
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

// ============================================
// Image Generator
// ============================================

class ImageGenerator {
  private browser: import('puppeteer').Browser | null = null;

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

  async generatePNG(html: string, width: number, height: number, outputPath: string): Promise<string> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Usar deviceScaleFactor para alta resolução sem multiplicar viewport
      const scale = 2; // 2x é suficiente para boa qualidade
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: scale,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      const storage = getStorage();
      // Comprimir PNG para reduzir tamanho
      const processedBuffer = await sharp(screenshot)
        .png({ compressionLevel: 6 })
        .toBuffer();

      await storage.upload(processedBuffer, outputPath, 'image/png');

      logger.info({ outputPath, size: processedBuffer.length }, 'PNG generated');

      return outputPath;
    } finally {
      await page.close();
    }
  }
}

// ============================================
// Generation Service
// ============================================

interface GenerateEncarteInput {
  jobId: string;
  orgId: string;
  userId: string;
  folderId: string;
  format: 'feed' | 'stories';
  productIds: string[];
  globalData?: {
    validUntil?: string;
    header?: string;
  };
  allocations?: Array<{
    templateId: string;
    productIds: string[];
    customValues?: Record<string, string>;
    highlightProductIds?: string[];
  }>;
}

export class GenerationService {
  private divider = new ProductDivider();
  private injector = new VariableInjector();
  private renderer = new TemplateRenderer();
  private imageGenerator = new ImageGenerator();

  async generate(input: GenerateEncarteInput, onProgress?: (progress: number) => void) {
    logger.info({ input }, 'Starting generation');

    const jobId = input.jobId;

    // Atualizar status para processing
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'processing', progress: 0 },
    });

    try {
      const products = await prisma.product.findMany({
        where: {
          id: { in: input.productIds },
          orgId: input.orgId,
        },
        include: { images: true },
      });

      logger.info({ productsFound: products.length }, 'Products loaded');

      if (products.length === 0) {
        throw new Error('No products found');
      }

      const templates = await prisma.template.findMany({
        where: {
          folderId: input.folderId,
          format: input.format,
          orgId: input.orgId,
        },
      });

      logger.info({ templatesFound: templates.length }, 'Templates loaded');

      if (templates.length === 0) {
        throw new Error('No templates found for this folder and format');
      }

      // Converter URLs relativas para absolutas para o Puppeteer poder carregar
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      const productsWithImages = products.map((p) => {
        let imagePath = (p.images[0]?.urls as any)?.optimized || null;
        if (imagePath && imagePath.startsWith('/')) {
          imagePath = `${baseUrl}${imagePath}`;
        }
        return {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          imagePath,
        };
      });

      let allocations;
      let unprocessedProducts: Product[] = [];

      if (input.allocations && input.allocations.length > 0) {
        // Usar allocations fornecidas pelo frontend
        allocations = input.allocations.map((alloc: any) => {
          const template = templates.find((t: any) => t.id === alloc.templateId);
          const allocProducts = productsWithImages.filter((p: any) => alloc.productIds.includes(p.id));
          
          return {
            template,
            products: allocProducts,
            customValues: alloc.customValues || {},
            highlightMapping: {
              highlightProductIds: alloc.highlightProductIds || [],
              normalProductIds: allocProducts
                .filter((p: any) => !alloc.highlightProductIds?.includes(p.id))
                .map((p: any) => p.id),
            },
          };
        });
      } else {
        // Fallback: divisão automática
        const divisionResult = this.divider.divide(productsWithImages, templates as any);
        allocations = divisionResult.allocations.map(alloc => ({
          ...alloc,
          customValues: {},
          highlightMapping: undefined,
        }));
        unprocessedProducts = divisionResult.unprocessedProducts;
      }

      logger.info({ 
        allocations: allocations.length, 
        unprocessedCount: unprocessedProducts.length 
      }, 'Products divided');

      if (allocations.length === 0) {
        throw new Error(`Nenhum template compatível encontrado. O menor template tem ${templates.sort((a, b) => a.productSlots - b.productSlots)[0]?.productSlots || 0} slots, mas você selecionou ${products.length} produto(s).`);
      }

      const storage = getStorage();
      const folder = await prisma.folder.findUnique({ where: { id: input.folderId } });
      const dateJobId = `${new Date().toISOString().split('T')[0]}-${jobId}`;
      const basePath = `org-${input.orgId}/templates/${folder?.name}/${input.format}/generated/${dateJobId}`;

      const generatedEncartes = [];

      for (let i = 0; i < allocations.length; i++) {
        const allocation = allocations[i];
        
        if (!allocation.template) {
          logger.error({ index: i }, 'Template not found for allocation');
          continue;
        }
        
        const progress = Math.round(((i + 1) / allocations.length) * 100);

        logger.info({ 
          index: i, 
          progress,
          products: allocation.products.map(p => ({ name: p.name, imagePath: p.imagePath })),
        }, 'Generating encarte');

        const injectedData = this.injector.inject(
          allocation.template.data as any,
          allocation.products,
          input.globalData,
          allocation.customValues,
          allocation.highlightMapping
        );

        // Converter URL do background se for relativa
        if (injectedData.background.type === 'image' && injectedData.background.value.startsWith('/')) {
          injectedData.background.value = `${baseUrl}${injectedData.background.value}`;
        }

        logger.info({ 
          backgroundType: injectedData.background.type,
          backgroundValue: injectedData.background.value,
        }, 'Template background');

        const html = this.renderer.renderToHTML(
          injectedData,
          allocation.template.width,
          allocation.template.height
        );

        const outputPath = `${basePath}/encarte-${i + 1}.png`;
        await this.imageGenerator.generatePNG(
          html,
          allocation.template.width,
          allocation.template.height,
          outputPath
        );

        const encarte = await prisma.generatedEncarte.create({
          data: {
            jobId: jobId,
            templateId: allocation.template.id,
            filePath: outputPath,
            fileUrl: storage.getUrl(outputPath),
            products: allocation.products.map((p: Product) => ({ id: p.id, name: p.name, price: p.price })),
          },
        });

        generatedEncartes.push(encarte);

        await prisma.generationJob.update({
          where: { id: jobId },
          data: { progress },
        });

        if (onProgress) onProgress(progress);
      }

      // IDs dos produtos que foram processados (alocados em encartes)
      const processedProductIds = allocations.flatMap(a => a.products.map(p => p.id));

      // Atualizar job com status e informações sobre produtos não processados
      const status = unprocessedProducts.length > 0 ? 'completed_partial' : 'completed';
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status,
          progress: 100,
          completedAt: new Date(),
          metadata: {
            productIds: input.productIds,
            processedCount: processedProductIds.length,
            unprocessedProducts: unprocessedProducts.map(p => ({ id: p.id, name: p.name })),
          },
        },
      });

      if (unprocessedProducts.length > 0) {
        logger.warn({ 
          unprocessedProducts: unprocessedProducts.map(p => p.name) 
        }, 'Some products could not be processed - no matching template');
      }

      logger.info({ 
        jobId, 
        encartes: generatedEncartes.length,
        processedCount: processedProductIds.length,
        unprocessedCount: unprocessedProducts.length,
      }, 'Generation completed');

      return {
        jobId,
        encartes: generatedEncartes,
        unprocessedProducts: unprocessedProducts.map(p => ({ id: p.id, name: p.name })),
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      logger.error({ errorMessage, stack: error?.stack, jobId }, 'Generation failed');

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: errorMessage,
        },
      });

      throw error;
    } finally {
      await this.imageGenerator.close();
    }
  }
}
