import OpenAI from 'openai';
import { redis, logger, normalize } from '@insertflow/lib';
import { prisma } from './prisma';

interface Product {
  id: string;
  name: string;
  normalizedName: string;
}

export class AIMatchService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async matchImageToProduct(
    imageName: string,
    orgId: string
  ): Promise<{ productId: string | null; method: 'exact' | 'ai' | 'none' }> {
    // 1. Get all products from org
    const products = await prisma.product.findMany({
      where: { orgId },
      select: { id: true, name: true, normalizedName: true },
    });

    if (products.length === 0) {
      return { productId: null, method: 'none' };
    }

    // 2. Try exact match first (fast)
    const exactMatch = this.exactMatch(imageName, products);
    if (exactMatch) {
      logger.info({ imageName, productId: exactMatch.id }, 'Exact match found');
      return { productId: exactMatch.id, method: 'exact' };
    }

    // 3. Check cache
    const cacheKey = `match:${orgId}:${normalize(imageName)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info({ imageName, cached: true }, 'Match from cache');
      const productId = cached === 'null' ? null : cached;
      return { productId, method: 'ai' };
    }

    // 4. AI Match
    logger.info({ imageName, productsCount: products.length }, 'Calling AI match');
    const aiMatch = await this.aiMatch(imageName, products);

    // 5. Cache result (30 days)
    const cacheValue = aiMatch?.id || 'null';
    await redis.setex(cacheKey, 30 * 24 * 60 * 60, cacheValue);

    return {
      productId: aiMatch?.id || null,
      method: aiMatch ? 'ai' : 'none',
    };
  }

  private exactMatch(imageName: string, products: Product[]): Product | null {
    const normalized = normalize(imageName);
    return products.find((p) => p.normalizedName === normalized) || null;
  }

  private async aiMatch(imageName: string, products: Product[]): Promise<Product | null> {
    const prompt = this.buildPrompt(imageName, products);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10,
      });

      const content = response.choices[0].message.content?.trim();
      const productNumber = parseInt(content || '0');

      if (productNumber > 0 && productNumber <= products.length) {
        return products[productNumber - 1];
      }

      return null;
    } catch (error) {
      logger.error({ error, imageName }, 'AI match failed');
      return null;
    }
  }

  private buildPrompt(imageName: string, products: Product[]): string {
    return `Você é um sistema de correspondência de produtos em um supermercado.

IMAGEM: "${imageName}"

PRODUTOS DISPONÍVEIS:
${products.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}

TAREFA:
Identifique qual produto corresponde à imagem. Considere:
- Variações de unidade (2L, 2 Litros, Dois Litros)
- Abreviações (Refri = Refrigerante)
- Typos comuns
- Contexto (tamanho, tipo)

RESPOSTA:
Retorne APENAS o número do produto correspondente (1-${products.length}).
Se nenhum produto corresponder com certeza, retorne "0".

NÚMERO:`;
  }
}
