import { prisma } from '@insertflow/database';
import { logger, getStorage, formatPrice, TemplateData, TemplateElement, Template } from '@insertflow/lib';
import sharp from 'sharp';
import { KonvaRenderer } from './konva-renderer';

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
    // Reordenar produtos: normais primeiro, depois destaques
    let reorderedProducts = products;
    let updatedMapping = highlightMapping;
    
    if (highlightMapping && templateData.groups) {
      const normalProducts = products.filter(p => 
        highlightMapping.normalProductIds.includes(p.id)
      );
      const highlightProducts = products.filter(p => 
        highlightMapping.highlightProductIds.includes(p.id)
      );
      
      // Descobrir em quais posições (índices de variáveis) os grupos em destaque estão
      const highlightGroups = templateData.groups.filter(g => g.isHighlight);
      const highlightPositions: number[] = [];
      
      highlightGroups.forEach(group => {
        // Pegar primeiro elemento do grupo para descobrir qual variável usa
        const firstElementId = group.elementIds[0];
        const element = templateData.elements.find(e => e.id === firstElementId);
        if (element && (element as any).variable) {
          const match = (element as any).variable.match(/produto_(\d+)/);
          if (match) {
            highlightPositions.push(parseInt(match[1]) - 1); // converter para índice 0-based
          }
        }
      });
      
      highlightPositions.sort((a, b) => a - b);
      
      logger.info({
        highlightPositions,
        normalProductsCount: normalProducts.length,
        highlightProductsCount: highlightProducts.length
      }, 'Reordering products for injection');
      
      // Criar array reordenado
      reorderedProducts = [];
      let normalIndex = 0;
      let highlightIndex = 0;
      
      for (let i = 0; i < products.length; i++) {
        if (highlightPositions.includes(i)) {
          // Posição de destaque
          if (highlightIndex < highlightProducts.length) {
            reorderedProducts.push(highlightProducts[highlightIndex]);
            highlightIndex++;
          }
        } else {
          // Posição normal
          if (normalIndex < normalProducts.length) {
            reorderedProducts.push(normalProducts[normalIndex]);
            normalIndex++;
          }
        }
      }
      
      logger.info({
        originalOrder: products.map(p => p.name),
        reorderedOrder: reorderedProducts.map(p => p.name)
      }, 'Products reordered');
    }
    
    // Criar mapeamento de elementos para produtos baseado em grupos
    // Agora usando produtos reordenados
    const elementToProductIndex = this.createElementToProductMapping(
      templateData,
      reorderedProducts,
      updatedMapping
    );

    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => 
        this.injectElement(element, reorderedProducts, globalData, customValues, elementToProductIndex, updatedMapping)
      ),
    };

    return injected;
  }

  private createElementToProductMapping(
    templateData: TemplateData,
    products: Product[],
    highlightMapping?: HighlightMapping
  ): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    if (!templateData.groups || !highlightMapping) {
      return mapping;
    }

    const highlightGroups = templateData.groups.filter(g => g.isHighlight);
    const normalGroups = templateData.groups.filter(g => !g.isHighlight);
    
    const highlightProducts = products.filter(p => 
      highlightMapping.highlightProductIds.includes(p.id)
    );
    const normalProducts = products.filter(p => 
      highlightMapping.normalProductIds.includes(p.id)
    );

    logger.info({
      highlightGroupsCount: highlightGroups.length,
      normalGroupsCount: normalGroups.length,
      highlightProductsCount: highlightProducts.length,
      normalProductsCount: normalProducts.length,
      allProductsOrder: products.map((p, i) => ({ index: i, id: p.id, name: p.name })),
      highlightProductIds: highlightMapping.highlightProductIds,
      highlightProducts: highlightProducts.map((p, i) => ({ index: i, id: p.id, name: p.name })),
      normalProducts: normalProducts.map((p, i) => ({ index: i, id: p.id, name: p.name }))
    }, 'Group and product distribution');

    // Mapear elementos de grupos em destaque para produtos em destaque
    highlightGroups.forEach((group, groupIndex) => {
      const product = highlightProducts[groupIndex];
      if (product) {
        const productIndex = products.findIndex(p => p.id === product.id);
        logger.info({
          groupIndex,
          groupName: group.name,
          groupElementIds: group.elementIds,
          productId: product.id,
          productName: product.name,
          productIndexInOriginalArray: productIndex
        }, 'Mapping highlight group to product');
        
        group.elementIds.forEach(elementId => {
          mapping[elementId] = productIndex;
        });
      }
    });

    // Mapear elementos de grupos normais para produtos normais
    normalGroups.forEach((group, groupIndex) => {
      const product = normalProducts[groupIndex];
      if (product) {
        const productIndex = products.findIndex(p => p.id === product.id);
        logger.info({
          groupIndex,
          groupName: group.name,
          groupElementIds: group.elementIds,
          productId: product.id,
          productName: product.name,
          productIndexInOriginalArray: productIndex
        }, 'Mapping normal group to product');
        
        group.elementIds.forEach(elementId => {
          mapping[elementId] = productIndex;
        });
      }
    });

    logger.info({
      elementToProductIndex: mapping,
      hasMapping: Object.keys(mapping).length > 0
    }, 'Element to product mapping created');

    return mapping;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData,
    customValues: CustomValues,
    elementToProductIndex: Record<string, number>,
    highlightMapping?: HighlightMapping
  ): TemplateElement {
    const injected = { ...element };

    if (element.type === 'text') {
      logger.info({
        elementId: element.id,
        hasVariable: !!(element as any).variable,
        variable: (element as any).variable,
        hasPreviewText: !!(element as any).previewText,
        previewText: (element as any).previewText,
        content: element.content
      }, 'Processing text element');

      let content: string;

      // Se há variável configurada e não está vazia, processar substituição
      if ((element as any).variable && (element as any).variable.trim() !== '') {
        logger.info({ variable: (element as any).variable }, 'Text has variable, will substitute');
        content = (element as any).variable;

        // Verificar se este elemento tem mapeamento específico
        const mappedIndex = elementToProductIndex[element.id];
        
        if (mappedIndex !== undefined) {
          // Elemento mapeado: usar APENAS o produto mapeado
          const mappedProduct = products[mappedIndex];
          if (mappedProduct) {
            logger.info({
              elementId: element.id,
              mappedIndex,
              productName: mappedProduct.name,
              variable: content
            }, 'Using mapped product for element');
            
            // Substituir TODAS as variáveis de produtos com o produto mapeado
            content = content
              .replace(/\{\{nome_produto_\d+\}\}/g, mappedProduct.name)
              .replace(/\{\{preco_produto_\d+\}\}/g, formatPrice(mappedProduct.price));
          }
        } else {
          // Elemento sem mapeamento: usar todos os produtos em ordem original
          // A ordem já está correta no array products
          products.forEach((product, index) => {
            const n = index + 1;
            content = content
              .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
              .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
          });
        }

        // Substituir variáveis globais
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
      } else {
        // Sem variável configurada - usar previewText diretamente
        content = (element as any).previewText || element.content;
        logger.info({ content }, 'Text has no variable, using previewText or content');
      }

      (injected as any).content = content;
      logger.info({ finalContent: content }, 'Text element final content after injection');
    }

    if (element.type === 'image') {
      logger.info({ 
        elementId: element.id, 
        variable: (element as any).variable,
        originalSrc: (element as any).src 
      }, 'Processing image element');
      
      if ((element as any).variable) {
        // Verificar se elemento tem mapeamento específico
        const mappedIndex = elementToProductIndex[element.id];
        if (mappedIndex !== undefined) {
          const product = products[mappedIndex];
          if (product) {
            logger.info({
              elementId: element.id,
              variable: (element as any).variable,
              mappedIndex,
              productName: product.name,
              imagePath: product.imagePath
            }, 'Injecting mapped product image');
            (injected as any).src = product.imagePath || null;
          }
        } else {
          // Variáveis padrão de produtos - usar todos os produtos em ordem original
          products.forEach((product, index) => {
            const n = index + 1;
            if ((element as any).variable === `{{imagem_produto_${n}}}`) {
              logger.info({ 
                variable: (element as any).variable, 
                productName: product.name,
                imagePath: product.imagePath 
              }, 'Injecting product image');
              (injected as any).src = product.imagePath || null;
            }
          });
        }

        // Variáveis customizadas de imagem
        const match = (element as any).variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
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

        // Usar KonvaRenderer para gerar imagem diretamente
        const konvaRenderer = new KonvaRenderer();
        const imageBuffer = await konvaRenderer.renderToImage(
          injectedData,
          allocation.template.width,
          allocation.template.height
        );

        logger.info({ 
          bufferSize: imageBuffer.length,
          textElementsCount: injectedData.elements.filter(e => e.type === 'text').length,
          imageElementsCount: injectedData.elements.filter(e => e.type === 'image').length,
        }, 'Image generated with Konva');

        // Comprimir PNG e fazer upload
        const storage = getStorage();
        const outputPath = `${basePath}/encarte-${i + 1}.png`;
        const processedBuffer = await sharp(imageBuffer)
          .png({ compressionLevel: 6 })
          .toBuffer();
        
        await storage.upload(processedBuffer, outputPath, 'image/png');
        
        logger.info({ outputPath, size: processedBuffer.length }, 'PNG uploaded');

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
    }
  }
}
