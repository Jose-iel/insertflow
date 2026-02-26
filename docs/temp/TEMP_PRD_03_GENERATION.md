# TEMP_PRD_03 - Engine de Geração de Encartes

## 1. Resumo do Pedido

Sistema que recebe template JSON + dados de produtos e gera imagens PNG de alta qualidade (300 DPI) para impressão e redes sociais. Deve processar múltiplos encartes quando há mais produtos do que slots disponíveis no template.

---

## 2. Contexto Atual da Codebase

**Projeto novo:** Sem implementação existente.

**Requisitos dos PRDs anteriores:**
- Templates em JSON (TEMP_PRD_02)
- Formatos: 3:4 (1080x1440) ou 9:16 (1080x1920)
- Multi-tenancy com isolamento (TEMP_PRD_01)
- Processamento assíncrono desejável
- Tempo alvo: ~1 minuto (manter performance atual do n8n)

---

## 3. Regras de Negócio

### 3.1 Fluxo de Geração

**Input:**
1. Lista de produtos (nome, preço, imagem)
2. Pasta de templates selecionada (ex: "Mercado Maré")
3. Formato selecionado (feed ou stories)
4. Organização (tenant context)

**Processamento:**
1. Identificar templates disponíveis na pasta + formato (ex: `/mercado-mare/feed/`)
2. Executar algoritmo de divisão de produtos
3. Para cada encarte:
   - Carregar template JSON
   - Injetar dados dos produtos
   - Renderizar HTML/Canvas
   - Gerar PNG 300 DPI
   - Salvar em `/{folder}/{format}/generated/{date-job-id}/`
4. Atualizar status dos produtos (processado = true)
5. Retornar links dos encartes gerados

**Output:**
- N arquivos PNG (um por encarte)
- Links para download/visualização
- Metadados (timestamp, template usado, produtos incluídos)

### 3.2 Algoritmo de Divisão de Produtos

**Objetivo:** Distribuir N produtos entre templates disponíveis, otimizando para usar templates maiores primeiro.

**Exemplo:**
```
Entrada:
- 13 produtos
- Templates disponíveis: [1, 2, 4, 6]

Algoritmo:
1. Ordenar templates decrescente: [6, 4, 2, 1]
2. Enquanto houver produtos:
   - Escolher maior template que cabe
   - Alocar produtos para esse template
   - Repetir

Resultado:
- Encarte 1: template 6 (produtos 1-6)
- Encarte 2: template 6 (produtos 7-12)
- Encarte 3: template 1 (produto 13)
```

**Pseudocódigo:**
```javascript
function divideProducts(products, availableTemplates) {
  const sorted = availableTemplates.sort((a, b) => b.slots - a.slots);
  const encartes = [];
  let remaining = [...products];
  
  while (remaining.length > 0) {
    // Encontra maior template que cabe
    const template = sorted.find(t => t.slots <= remaining.length) 
                   || sorted[sorted.length - 1]; // fallback para menor
    
    // Aloca produtos
    const allocated = remaining.splice(0, template.slots);
    
    encartes.push({
      template: template,
      products: allocated
    });
  }
  
  return encartes;
}
```

### 3.3 Injeção de Dados no Template

**Variáveis Suportadas:**

**Por Produto (N = 1, 2, 3...):**
- `{{nome_produto_N}}` → nome do produto
- `{{preco_produto_N}}` → preço formatado (R$ 10,99)
- `{{imagem_produto_N}}` → URL/path da imagem

**Globais:**
- `{{data_validade}}` → data de validade do encarte
- `{{header}}` → texto do cabeçalho
- `{{fundo}}` → imagem de fundo (se aplicável)

**Processamento:**
```javascript
function injectData(templateJSON, products, globalData) {
  const rendered = JSON.parse(JSON.stringify(templateJSON));
  
  rendered.elements.forEach(element => {
    if (element.type === 'text' && element.content) {
      // Substituir variáveis de produtos
      products.forEach((product, index) => {
        const n = index + 1;
        element.content = element.content
          .replace(`{{nome_produto_${n}}}`, product.name)
          .replace(`{{preco_produto_${n}}}`, formatPrice(product.price));
      });
      
      // Substituir variáveis globais
      element.content = element.content
        .replace('{{data_validade}}', globalData.validUntil)
        .replace('{{header}}', globalData.header);
    }
    
    if (element.type === 'image' && element.variable) {
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          element.src = product.imagePath;
        }
      });
    }
  });
  
  return rendered;
}
```

### 3.4 Geração de PNG de Alta Qualidade

**Requisitos:**
- Resolução: 300 DPI (para impressão)
- Formato: PNG sem compressão ou compressão lossless
- Dimensões: conforme template (1080x1440 ou 1080x1920)
- Qualidade: adequada para impressão em A4/A3

**Cálculo DPI:**
```
DPI = (pixels / polegadas)

Para 1080x1440 em 300 DPI:
- Largura: 1080 / 300 = 3.6 polegadas (9.14 cm)
- Altura: 1440 / 300 = 4.8 polegadas (12.19 cm)

Para impressão A4 (21x29.7cm) em 300 DPI:
- Largura: 21cm = 8.27" → 2480px
- Altura: 29.7cm = 11.69" → 3507px

NOTA: 1080x1440 é adequado para redes sociais, mas pode ser pequeno 
para impressão A4 de alta qualidade. Considerar gerar em resolução maior.
```

**Opções de Implementação:**
1. Gerar em 1080px (redes sociais) + upscale para impressão
2. Gerar direto em alta resolução (2480x3307 para A4)
3. Gerar em múltiplas resoluções (social + print)

**Decisão para SPEC:** Definir se gera uma ou múltiplas resoluções.

### 3.5 Processamento Assíncrono

**Motivação:**
- Geração pode demorar (especialmente múltiplos encartes)
- Não bloquear interface do usuário
- Permitir processamento em background

**Fluxo:**
```
1. Usuário clica "Gerar"
2. API cria job na fila (Redis + BullMQ)
3. Retorna job ID imediatamente
4. Worker processa job em background
5. Atualiza status no banco
6. Frontend polling ou WebSocket para status
7. Quando completo, mostra links de download
```

**Estados do Job:**
- `pending` - na fila
- `processing` - sendo processado
- `completed` - finalizado com sucesso
- `failed` - erro durante processamento

---

## 4. Histórico Relevante

**Sistema atual (n8n):**
- Tempo de processamento: ~1 minuto
- Usa Google Slides API para gerar
- Processamento síncrono (usuário espera)
- Feedback via Apps Script

**Meta:** Manter ou melhorar performance (~1 minuto).

---

## 5. Padrões de Testes do Projeto

**Testes Críticos:**
- Algoritmo de divisão (unit tests)
- Injeção de variáveis (unit tests)
- Geração de PNG (integration tests)
- Qualidade da imagem (visual regression tests)
- Performance (load tests)

---

## 6. Referências Externas

### 6.1 Bibliotecas de Geração de Imagens

#### Opção 1: Puppeteer

**Características:**
- Controla Chrome/Chromium headless
- Renderiza HTML/CSS → screenshot PNG
- Suporte a viewport customizado
- Mantido pelo Google

**Pesquisa realizada:**
- "Puppeteer high DPI screenshot 300 DPI print quality PNG 2024"
- GitHub Issues: #1329 (high resolution), #1669 (DPI setting)

**Prós:**
- ✅ Renderização perfeita de HTML/CSS
- ✅ Suporte a fontes web
- ✅ Fácil de usar
- ✅ Comunidade grande

**Contras:**
- ❌ DPI não é configurável diretamente (issue #1669)
- ❌ Consome mais memória (Chrome completo)
- ❌ Pode ter problemas com páginas muito grandes (issue #477)

**Workaround para 300 DPI:**
```javascript
// Gerar em resolução maior e marcar como 300 DPI
const page = await browser.newPage();
await page.setViewport({
  width: 1080 * 3,  // 3x maior
  height: 1440 * 3,
  deviceScaleFactor: 3  // simula retina
});
await page.screenshot({
  path: 'output.png',
  type: 'png'
});
// Depois usar Sharp para ajustar DPI metadata
```

**Recursos:**
- Documentação: pptr.dev/guides/screenshots
- "Take better screenshots with Puppeteer" (dev.to)

#### Opção 2: Playwright

**Características:**
- Similar ao Puppeteer
- Multi-browser (Chromium, Firefox, WebKit)
- Mantido pela Microsoft
- API moderna

**Pesquisa realizada:**
- "Playwright vs Puppeteer performance screenshot generation 2024"

**Prós:**
- ✅ Performance similar ou melhor que Puppeteer
- ✅ API mais moderna
- ✅ Suporte a múltiplos browsers
- ✅ Melhor para testes E2E

**Contras:**
- ❌ Mesmas limitações de DPI
- ❌ Overhead de múltiplos browsers (se não usar)

**Comparação (fontes):**
- "Playwright vs Puppeteer: Which to choose in 2026?" (BrowserStack)
- "Playwright vs Puppeteer: The Definitive Comparison" (Better Stack)

**Consenso:**
- Puppeteer: mais maduro (2017), comunidade maior (87k stars)
- Playwright: mais moderno (2020), melhor para testes (64k stars)
- Performance: similar
- Para screenshots: ambos funcionam bem

#### Opção 3: node-html-to-image

**Características:**
- Wrapper sobre Puppeteer
- API simplificada
- Foco em geração de imagens

**Pesquisa realizada:**
- "Node.js generate high quality PNG from HTML CSS puppeteer sharp 2024"

**Prós:**
- ✅ API mais simples que Puppeteer direto
- ✅ Menos boilerplate

**Contras:**
- ❌ Menos controle
- ❌ Dependência extra

**Exemplo:**
```javascript
const nodeHtmlToImage = require('node-html-to-image');

await nodeHtmlToImage({
  output: './image.png',
  html: '<html><body>Hello</body></html>',
  quality: 100,
  type: 'png'
});
```

**Recursos:**
- NPM: node-html-to-image
- "Quick and simple way to generate images with node.js and Puppeteer" (Medium)

#### Opção 4: Sharp (para pós-processamento)

**Características:**
- Biblioteca de manipulação de imagens
- Muito rápida (libvips)
- Redimensionamento, conversão, metadata

**Uso:**
- Não gera de HTML, mas processa PNGs gerados
- Ajusta DPI metadata
- Redimensiona se necessário
- Otimiza tamanho do arquivo

**Exemplo:**
```javascript
const sharp = require('sharp');

await sharp('input.png')
  .withMetadata({ density: 300 })  // 300 DPI
  .png({ quality: 100, compressionLevel: 0 })
  .toFile('output.png');
```

**Recursos:**
- Documentação: sharp.pixelplumbing.com
- "Processing images with sharp in Node.js" (LogRocket)

### 6.2 Sistema de Filas (Async Processing)

**Pesquisa realizada:**
- "Node.js queue system BullMQ Redis async job processing"

#### BullMQ

**Características:**
- Sistema de filas baseado em Redis
- Sucessor do Bull (mais moderno)
- Suporte a workers, jobs, eventos
- Retry automático, prioridades, delays

**Prós:**
- ✅ Redis já existe na VPS
- ✅ Muito confiável (exactly-once semantics)
- ✅ Dashboard UI disponível
- ✅ TypeScript nativo
- ✅ Ótima documentação

**Contras:**
- ❌ Requer Redis (mas já temos)

**Recursos:**
- Site oficial: bullmq.io
- GitHub: taskforcesh/bullmq
- "Building a Scalable Job Queue With BullMQ and Redis in Node.js" (dev.to)
- "How to Build a Job Queue in Node.js with BullMQ and Redis" (OneUpTime)

**Exemplo:**
```javascript
// Producer
import { Queue } from 'bullmq';

const queue = new Queue('encarte-generation', {
  connection: { host: 'localhost', port: 6379 }
});

const job = await queue.add('generate', {
  products: [...],
  templateFolder: 'mercado-mare',
  orgId: 'org-123'
});

// Worker
import { Worker } from 'bullmq';

const worker = new Worker('encarte-generation', async (job) => {
  const { products, templateFolder, orgId } = job.data;
  
  // Processar geração
  const encartes = await generateEncartes(products, templateFolder, orgId);
  
  return { encartes };
}, {
  connection: { host: 'localhost', port: 6379 }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
```

**Features Úteis:**
- Retry com backoff exponencial
- Prioridades (jobs urgentes primeiro)
- Rate limiting (não sobrecarregar)
- Progress tracking (mostrar % no frontend)
- Eventos (completed, failed, progress)

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Proposta

```
/apps/api/
├── services/
│   └── generation/
│       ├── GenerationService.ts       # Orquestra geração
│       ├── TemplateRenderer.ts        # Renderiza template → HTML
│       ├── ImageGenerator.ts          # HTML → PNG
│       ├── ProductDivider.ts          # Algoritmo de divisão
│       └── VariableInjector.ts        # Injeta dados no template
├── workers/
│   └── GenerationWorker.ts            # BullMQ worker
├── queues/
│   └── GenerationQueue.ts             # BullMQ queue setup
└── routes/
    └── generation.ts                  # API endpoints

/packages/database/
└── schema.prisma
    ├── GenerationJob model
    └── GeneratedEncarte model
```

### 7.2 Schema do Banco (Prisma)

```prisma
model GenerationJob {
  id          String   @id @default(cuid())
  orgId       String
  userId      String
  folderId    String
  status      String   // pending, processing, completed, failed
  progress    Int      @default(0)  // 0-100
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  folder       Folder       @relation(fields: [folderId], references: [id])
  encartes     GeneratedEncarte[]
  
  @@index([orgId])
  @@index([userId])
  @@index([status])
}

model GeneratedEncarte {
  id          String   @id @default(cuid())
  jobId       String
  templateId  String
  filePath    String   // /uploads/org-123/encartes/encarte-456.png
  fileUrl     String   // URL pública
  products    Json     // IDs dos produtos incluídos
  createdAt   DateTime @default(now())
  
  job      GenerationJob @relation(fields: [jobId], references: [id])
  template Template      @relation(fields: [templateId], references: [id])
  
  @@index([jobId])
}

model Product {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  price       Decimal
  imagePath   String?
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  
  @@index([orgId])
  @@index([name])  // para match de imagens
}
```

### 7.3 API Endpoints

```typescript
// POST /api/generation/start
// Inicia geração de encartes
{
  "folderId": "folder-123",
  "format": "feed",  // "feed" ou "stories"
  "productIds": ["prod-1", "prod-2", ...],
  "globalData": {
    "validUntil": "2024-12-31",
    "header": "OFERTAS DA SEMANA"
  }
}
// Response: { "jobId": "job-456" }

// GET /api/generation/status/:jobId
// Consulta status do job
// Response: {
//   "status": "processing",
//   "progress": 45,
//   "encartes": [...]
// }

// GET /api/generation/download/:encarteId
// Download do PNG gerado
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisões Técnicas Principais

**1. Biblioteca de Geração:**

**Recomendação: Puppeteer + Sharp**

**Justificativa:**
- Puppeteer: renderização HTML/CSS perfeita, comunidade grande, maduro
- Sharp: pós-processamento (DPI metadata, otimização)
- Combinação testada e confiável

**Alternativa:** Playwright (se SPEC preferir API mais moderna)

**2. Resolução de Geração:**

**Recomendação: Gerar em alta resolução (3x) + Sharp**

**Abordagem:**
```
1. Template define dimensões base (1080x1440)
2. Renderizar em 3x (3240x4320)
3. Screenshot PNG
4. Sharp ajusta DPI metadata para 300
5. Resultado: PNG adequado para impressão E redes sociais
```

**Alternativa:** Gerar múltiplas versões (social + print) - mais complexo

**3. Processamento:**

**Recomendação: Assíncrono com BullMQ**

**Justificativa:**
- Não bloqueia usuário
- Escalável (múltiplos workers)
- Redis já existe na VPS
- Retry automático em caso de falha

**MVP:** Pode começar síncrono e migrar para async depois

### 8.2 Complexidade Estimada

**Estimativa:** 2-3 semanas (complexidade 3/5)

**Breakdown:**
- Algoritmo de divisão: 1-2 dias
- Injeção de variáveis: 2-3 dias
- Setup Puppeteer + geração básica: 3-4 dias
- Otimização DPI/qualidade: 2-3 dias
- BullMQ + async processing: 3-4 dias
- Testes e ajustes: 2-3 dias

### 8.3 Performance

**Estimativa de Tempo:**
- Renderizar 1 encarte: 2-5 segundos
- 3 encartes (13 produtos): 6-15 segundos
- Overhead (divisão, I/O): 5-10 segundos
- **Total: 10-25 segundos** (melhor que 1 minuto atual)

**Otimizações:**
- Reusar instância do browser (não criar nova a cada job)
- Pool de workers (processar múltiplos jobs em paralelo)
- Cache de templates renderizados

### 8.4 Armazenamento de Encartes

**Estrutura:**
```
/uploads
  /org-{id}
    /templates
      /{folder-name}/              # ex: "mercado-mare"
        /feed/                     # Templates 3:4 (posts)
          /templates/              # templates JSON
          /generated/              # encartes gerados
            /{date-job-id}/        # ex: 2024-02-25-job-456
              /encarte-1.png
              /encarte-2.png
        /stories/                  # Templates 9:16 (stories/reels)
          /templates/              # templates JSON
          /generated/              # encartes gerados
            /{date-job-id}/        # ex: 2024-02-25-job-789
              /encarte-1.png
              /encarte-2.png
```

**Benefícios:**
- Encartes organizados por cliente E formato
- Separação clara entre posts (3:4) e stories (9:16)
- Fácil encontrar gerações específicas
- Histórico visual por pasta e formato

**Limpeza:**
- Definir política de retenção (ex: 30 dias)
- Cron job para deletar antigos
- Ou mover para cold storage (S3 Glacier)

### 8.5 Tratamento de Erros

**Cenários:**
- Template não encontrado → erro claro
- Imagem de produto faltando → placeholder ou erro
- Falha no Puppeteer → retry automático (BullMQ)
- Timeout (template muito complexo) → aumentar timeout

**Logs:**
- Registrar cada etapa da geração
- Facilitar debug de problemas

---

## 9. Dependências entre Componentes

```
Generation Engine
  ├── Template Editor (TEMP_PRD_02)
  │   └── Fornece JSON do template
  ├── Image Manager (TEMP_PRD_04)
  │   └── Fornece paths das imagens
  ├── Puppeteer (rendering)
  ├── Sharp (pós-processamento)
  ├── BullMQ (async processing)
  └── Redis (queue backend)
```

---

## 10. Riscos e Mitigações

### Risco 1: Qualidade de Impressão Insuficiente
**Mitigação:** Gerar em 3x resolução + validar com impressão teste

### Risco 2: Performance Degradada com Muitos Jobs
**Mitigação:** BullMQ com rate limiting + múltiplos workers

### Risco 3: Puppeteer Consome Muita Memória
**Mitigação:** Limitar workers concorrentes + monitorar memória

### Risco 4: Fontes Não Renderizam Corretamente
**Mitigação:** Instalar fontes no servidor + fallback para web fonts

---

## PRÓXIMO DOCUMENTO

**TEMP_PRD_04_IMAGES.md:** Sistema de gestão de imagens (upload, storage, match por nome, otimização)
