# TEMP_PRD_06 - Integração com IA (Match Inteligente de Imagens)

## 1. Resumo do Pedido

Implementar match inteligente de imagens usando IA (GPT-4o-mini) para resolver falhas do match por string. Sistema deve entender variações de nomes e fazer correspondência semântica entre nomes de arquivos e produtos cadastrados.

---

## 2. Contexto Atual da Codebase

**Projeto novo:** Sem implementação de IA ainda.

**Problema Atual (TEMP_PRD_04):**
- Match por normalização de string (lowercase, remove acentos, caracteres especiais)
- Falha com variações: "Coca Cola 2L" vs "Coca-Cola 2 Litros" vs "Refrigerante Coca 2L"
- Erros de typo não são tratados
- Não entende sinônimos ou abreviações

**Decisão:** IA é crucial para resolver essas falhas (confirmado pelo usuário).

---

## 3. Regras de Negócio

### 3.1 Match Inteligente com IA

**Objetivo:**
Encontrar o produto correto mesmo com variações de nomenclatura, typos ou abreviações.

**Fluxo:**

```
1. Upload de imagem: "coca-cola-2l.png"

2. Normalização básica (fallback rápido):
   - Remove extensão, lowercase, remove caracteres especiais
   - Busca match exato no banco
   - Se encontrar → retorna (sem usar IA)

3. Se não encontrar match exato:
   - Chama IA (GPT-4o-mini)
   - Envia: nome da imagem + lista de produtos disponíveis
   - IA retorna: produto correspondente ou null

4. Resultado:
   - Match encontrado → associa imagem ao produto
   - Não encontrado → marca como "sem match" + sugestões
```

**Vantagens sobre string matching:**
- ✅ Entende variações: "2L" = "2 Litros" = "Dois Litros"
- ✅ Tolera typos: "Coka Cola" → "Coca Cola"
- ✅ Reconhece abreviações: "Refri Coca" → "Refrigerante Coca Cola"
- ✅ Contexto semântico: "Guaraná Antártica Lata" vs "Guaraná Antártica 2L"

### 3.2 Casos de Uso

**Caso 1: Variações de Unidade**
```
Imagem: "coca-2l.png"
Produtos:
  - "Coca Cola 2 Litros" ✅ match
  - "Coca Cola Lata 350ml" ❌
  - "Pepsi 2L" ❌
```

**Caso 2: Typos**
```
Imagem: "coka-cola.png"  (typo)
Produtos:
  - "Coca Cola 2L" ✅ match (IA corrige)
  - "Pepsi 2L" ❌
```

**Caso 3: Abreviações**
```
Imagem: "refri-coca-2l.png"
Produtos:
  - "Refrigerante Coca Cola 2 Litros" ✅ match
  - "Suco Coca Cola" ❌
```

**Caso 4: Múltiplos Candidatos**
```
Imagem: "coca.png"
Produtos:
  - "Coca Cola 2L"
  - "Coca Cola Lata"
  - "Coca Cola Zero 2L"
  
IA retorna: null (ambíguo)
Sistema: pede usuário escolher manualmente
```

### 3.3 Estratégia de Fallback

**Níveis de Match (em ordem):**

1. **Match Exato (sem IA)** - mais rápido
   - Normalização de string
   - Custo: $0
   - Latência: <10ms

2. **Match com IA** - quando exato falha
   - GPT-4o-mini
   - Custo: ~$0.0001 por match
   - Latência: 200-500ms

3. **Sugestões Múltiplas** - quando IA não tem certeza
   - IA retorna top 3 candidatos
   - Usuário escolhe manualmente

4. **Sem Match** - quando nenhum produto corresponde
   - Marca imagem como "não matched"
   - Permite associação manual posterior

### 3.4 Prompt Engineering

**Prompt Otimizado:**

```typescript
const prompt = `Você é um sistema de correspondência de produtos em um supermercado.

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
Se houver múltiplos candidatos, retorne os números separados por vírgula (ex: "1,3,5").

NÚMERO:`;
```

**Exemplo de Resposta:**
```
Input: "coca-2l.png"
Produtos: ["Coca Cola 2 Litros", "Pepsi 2L", "Coca Cola Lata"]
Output: "1"
```

### 3.5 Otimizações de Custo

**Cache de Matches:**
```typescript
// Cache em Redis
const cacheKey = `match:${orgId}:${normalizedImageName}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Chamar IA
const match = await aiMatch(imageName, products);

// Cache por 30 dias
await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(match));
```

**Batch Processing:**
- Processar múltiplas imagens em um único request
- Reduz latência e custo

**Modelo Econômico:**
- GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- Prompt típico: ~200 tokens input, ~10 tokens output
- Custo por match: ~$0.0001
- 1000 matches/mês: ~$0.10

---

## 4. Histórico Relevante

**Sistema atual (normalização de string):**
- Falhas frequentes com variações
- Usuário precisa associar manualmente
- Perda de tempo e erros

**Decisão:** IA é crucial para resolver (confirmado pelo usuário).

---

## 5. Padrões de Testes do Projeto

**Testes Críticos:**
- Unit: prompt generation
- Integration: OpenAI API calls
- E2E: match accuracy (dataset de teste)
- Performance: latência e custo

**Dataset de Teste:**
```typescript
const testCases = [
  { image: "coca-2l.png", expected: "Coca Cola 2 Litros" },
  { image: "coka-cola.png", expected: "Coca Cola 2L" },  // typo
  { image: "refri-coca.png", expected: "Refrigerante Coca Cola" },
  { image: "guarana-lata.png", expected: "Guaraná Antártica Lata 350ml" }
];

// Accuracy target: >95%
```

---

## 6. Referências Externas

### 6.1 OpenAI API

**Modelo Recomendado: GPT-4o-mini**

**Características:**
- Mais barato que GPT-4
- Rápido (200-500ms)
- Suficiente para match de texto
- $0.15/1M input tokens

**Alternativas:**
- GPT-3.5-turbo: mais barato, menos preciso
- GPT-4o: mais caro, overkill para este caso
- Embeddings: mais complexo, não necessário

**Documentação:**
- https://platform.openai.com/docs/models/gpt-4o-mini
- https://platform.openai.com/docs/guides/text-generation

### 6.2 Bibliotecas Node.js

**OpenAI SDK:**
```bash
npm install openai
```

**Exemplo:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0,  // determinístico
  max_tokens: 10   // resposta curta
});

const productNumber = parseInt(response.choices[0].message.content);
```

### 6.3 Rate Limiting

**OpenAI Limits:**
- Tier 1 (free): 500 RPM, 200k TPM
- Tier 2 ($5 spent): 5k RPM, 2M TPM

**Implementação:**
```typescript
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute'
});

await limiter.removeTokens(1);
const match = await aiMatch(...);
```

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Proposta

```
/apps/api/
├── services/
│   └── ai/
│       ├── AIMatchService.ts          # Lógica principal
│       ├── PromptBuilder.ts           # Constrói prompts
│       └── OpenAIClient.ts            # Wrapper OpenAI
├── lib/
│   └── cache/
│       └── MatchCache.ts              # Cache Redis
└── routes/
    └── images.ts                      # Endpoint de upload

/packages/lib/
└── ai/
    ├── types.ts                       # TypeScript types
    └── utils.ts                       # Helpers
```

### 7.2 Implementação Completa

```typescript
// services/ai/AIMatchService.ts
import OpenAI from 'openai';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export class AIMatchService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async matchImageToProduct(
    imageName: string,
    products: Product[],
    orgId: string
  ): Promise<Product | null> {
    // 1. Normalização básica (fallback rápido)
    const exactMatch = this.exactMatch(imageName, products);
    if (exactMatch) {
      logger.info({ imageName, productId: exactMatch.id }, 'Exact match found');
      return exactMatch;
    }
    
    // 2. Check cache
    const cacheKey = `match:${orgId}:${this.normalize(imageName)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info({ imageName, cached: true }, 'Match from cache');
      return JSON.parse(cached);
    }
    
    // 3. AI Match
    logger.info({ imageName, productsCount: products.length }, 'Calling AI match');
    const match = await this.aiMatch(imageName, products);
    
    // 4. Cache result
    if (match) {
      await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(match));
    }
    
    return match;
  }
  
  private exactMatch(imageName: string, products: Product[]): Product | null {
    const normalized = this.normalize(imageName);
    return products.find(p => this.normalize(p.name) === normalized) || null;
  }
  
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\.[^.]+$/, '')  // remove extensão
      .replace(/[^a-z0-9]/g, '');
  }
  
  private async aiMatch(
    imageName: string,
    products: Product[]
  ): Promise<Product | null> {
    const prompt = this.buildPrompt(imageName, products);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10
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
```

### 7.3 Integração no Upload

```typescript
// routes/images.ts
import { AIMatchService } from '@/services/ai/AIMatchService';

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll('images');
  const orgId = req.user.orgId;
  
  const aiMatch = new AIMatchService();
  const products = await prisma.product.findMany({ where: { orgId } });
  
  const results = [];
  
  for (const file of files) {
    // Upload e otimização (Sharp)
    const { paths, metadata } = await uploadAndOptimize(file);
    
    // AI Match
    const matchedProduct = await aiMatch.matchImageToProduct(
      file.name,
      products,
      orgId
    );
    
    // Salvar no banco
    const image = await prisma.image.create({
      data: {
        orgId,
        productId: matchedProduct?.id,
        originalName: file.name,
        normalizedName: normalize(file.name),
        matched: !!matchedProduct,
        ...metadata,
        paths,
        urls: generateUrls(paths)
      }
    });
    
    results.push({
      image,
      matchedProduct,
      confidence: matchedProduct ? 'high' : 'none'
    });
  }
  
  return Response.json({ results });
}
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisões Técnicas

**1. Modelo de IA:**
- **Recomendação:** GPT-4o-mini
- Custo/benefício ideal
- Latência aceitável (200-500ms)

**2. Estratégia de Cache:**
- **Recomendação:** Redis com TTL 30 dias
- Reduz custo em 80-90%
- Invalida cache se produtos mudarem

**3. Fallback:**
- **Sempre** tentar match exato primeiro
- IA só quando necessário
- Permite associação manual se IA falhar

### 8.2 Complexidade Estimada

**Estimativa:** 3-5 dias (complexidade 2/5)

**Breakdown:**
- Setup OpenAI SDK: 1 dia
- Implementação AIMatchService: 1-2 dias
- Integração com upload: 1 dia
- Cache Redis: 1 dia
- Testes: 1 dia

### 8.3 Custos Estimados

**Cenário Conservador:**
- 10 organizações
- 50 produtos cada
- 100 uploads/mês por org
- 50% usa IA (50% match exato)

**Cálculo:**
- 10 orgs × 100 uploads × 50% = 500 matches IA/mês
- 500 × $0.0001 = **$0.05/mês**

**Cenário Otimista (com cache):**
- 80% hits no cache
- 500 × 20% = 100 matches IA/mês
- 100 × $0.0001 = **$0.01/mês**

**Conclusão:** Custo negligenciável, valor alto.

### 8.4 Monitoramento

**Métricas Importantes:**
- Taxa de match exato vs IA
- Accuracy do match IA
- Latência média
- Custo mensal OpenAI
- Cache hit rate

**Dashboard:**
```typescript
{
  "total_uploads": 1000,
  "exact_matches": 600,
  "ai_matches": 350,
  "no_matches": 50,
  "ai_accuracy": 0.95,
  "avg_latency_ms": 320,
  "monthly_cost_usd": 0.03,
  "cache_hit_rate": 0.82
}
```

### 8.5 Segurança

**API Key:**
- Nunca expor no frontend
- Variável de ambiente
- Rotação periódica

**Rate Limiting:**
- Limitar requests por usuário
- Prevenir abuso
- Monitorar uso anormal

**Validação:**
- Validar lista de produtos (max 100)
- Sanitizar nomes de arquivos
- Timeout em requests IA (5s)

---

## 9. Dependências entre Componentes

```
AI Match Service
  ├── OpenAI API (GPT-4o-mini)
  ├── Redis (cache)
  ├── Image Upload (TEMP_PRD_04)
  ├── Product Database (Prisma)
  └── Logging (Pino + Sentry)
```

---

## 10. Riscos e Mitigações

### Risco 1: OpenAI API Down
**Mitigação:** Fallback para match exato + associação manual

### Risco 2: Custo Inesperado
**Mitigação:** Rate limiting + alertas de custo + cache agressivo

### Risco 3: Accuracy Baixa
**Mitigação:** Testes com dataset real + ajuste de prompt + feedback loop

### Risco 4: Latência Alta
**Mitigação:** Cache + processamento assíncrono (opcional)

---

## 11. Roadmap de Features IA (Futuro)

**Fase 2:**
- Geração automática de layouts de templates
- Otimização de títulos/textos

**Fase 3:**
- Análise de qualidade de imagens
- Sugestão de paletas de cores
- Detecção de produtos em imagens (OCR)

**Fase 4:**
- Geração de descrições de produtos
- Tradução automática
- A/B testing de layouts

---

## RESUMO

**Feature:** Match Inteligente de Imagens com IA
**Prioridade:** Alta (MVP)
**Complexidade:** Baixa-Média (3-5 dias)
**Custo:** Negligenciável (~$0.01-0.05/mês)
**Valor:** Alto (resolve dor crítica)

**Próximo passo:** SPEC implementa AIMatchService integrado ao upload de imagens.
