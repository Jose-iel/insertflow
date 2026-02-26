# TEMP_PRD_04 - Sistema de Gestão de Imagens

## 1. Resumo do Pedido

Sistema para upload, armazenamento e gestão de imagens de produtos. Deve permitir upload via interface web, fazer match automático por nome de produto, e servir imagens para o engine de geração de encartes.

---

## 2. Contexto Atual da Codebase

**Projeto novo:** Sem implementação existente.

**Requisitos dos PRDs anteriores:**
- Sistema próprio de armazenamento (não Google Drive) - TEMP_PRD_01
- Match por nome de produto - TEMP_PRD_01
- Isolamento por organização (multi-tenancy) - TEMP_PRD_01
- Imagens usadas na geração de encartes - TEMP_PRD_03

---

## 3. Regras de Negócio

### 3.1 Upload de Imagens

**Interface:**
- Drag-and-drop de múltiplos arquivos
- Click para selecionar arquivos
- Preview antes de upload
- Progress bar durante upload
- Validação de tipo e tamanho

**Validações:**
- Formatos aceitos: JPG, PNG, WebP
- Tamanho máximo: 10MB por arquivo
- Dimensões mínimas: 300x300px (recomendado)
- Nome do arquivo deve corresponder a produto existente (warning se não)

**Fluxo:**
```
1. Usuário arrasta/seleciona imagens
2. Frontend valida tipo e tamanho
3. Mostra preview e nome detectado
4. Usuário confirma upload
5. Upload multipart para API
6. Backend processa e otimiza (Sharp)
7. Match automático:
   a. Tenta match exato (normalização)
   b. Se falhar, usa IA (GPT-4o-mini)
   c. Cache resultado em Redis
8. Salva no storage
9. Registra no banco de dados (com productId se matched)
10. Retorna sucesso + URL + match status
```

### 3.2 Match Automático por Nome

**⚠️ IMPORTANTE:** Match por string tem limitações. **IA é crucial** para resolver variações (ver TEMP_PRD_06_IA.md).

**Estratégia de Match (2 níveis):**

**Nível 1: Match Exato (Fallback Rápido)**
```
Imagem: "coca-cola-2l.png"
Produtos cadastrados:
  - "Coca Cola 2L" ✅ match exato
  - "Pepsi 2L" ❌ não match

Algoritmo:
1. Normalizar nome do arquivo (lowercase, remover extensão)
2. Normalizar nomes dos produtos
3. Buscar match exato no banco
4. Se encontrar → retorna (sem usar IA)
```

**Normalização:**
```javascript
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')  // remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')  // remove extensão
    .replace(/[^a-z0-9]/g, '');  // remove caracteres especiais
}

// "Coca-Cola 2L" → "cocacola2l"
// "coca-cola-2l.png" → "cocacola2l"
```

**Nível 2: Match Inteligente com IA (GPT-4o-mini)**

**Quando usar:** Se match exato falhar

**Vantagens:**
- ✅ Entende variações: "2L" = "2 Litros" = "Dois Litros"
- ✅ Tolera typos: "Coka Cola" → "Coca Cola"
- ✅ Reconhece abreviações: "Refri Coca" → "Refrigerante Coca Cola"
- ✅ Contexto semântico

**Implementação completa:** Ver `TEMP_PRD_06_IA.md`

**Custo:** ~$0.0001 por match (~$0.01-0.05/mês total)
**Latência:** 200-500ms (com cache: <10ms)

### 3.3 Gestão de Imagens

**Listagem:**
- Grid de thumbnails
- Filtro por produto (matched/unmatched)
- Busca por nome
- Ordenação (data, nome, tamanho)

**Ações:**
- Visualizar em tamanho real
- Deletar
- Substituir (upload nova versão)
- Associar manualmente a produto
- Download

**Metadados:**
- Nome original
- Tamanho do arquivo
- Dimensões (width x height)
- Formato
- Data de upload
- Produto associado (se houver)
- URL pública

### 3.4 Otimização de Imagens

**Processamento Automático:**
1. Redimensionar se muito grande (max 2000x2000px)
2. Converter para WebP (menor tamanho, boa qualidade)
3. Manter original também (backup)
4. Gerar thumbnail (200x200px)

**Estrutura de Arquivos:**
```
/uploads/org-123/products/
  /coca-cola-2l/
    /original.png       # Original preservado
    /optimized.webp     # Versão otimizada
    /thumb.webp         # Thumbnail
```

**Benefícios:**
- Menor uso de storage
- Carregamento mais rápido na interface
- Original disponível se necessário

### 3.5 Armazenamento

**Opções (decisão para SPEC):**

**A) Filesystem Local (MVP)**
- Mais simples
- Sem custos extras
- Adequado para início
- Backup manual necessário

**B) S3-Compatible (Produção)**
- Cloudflare R2 (zero egress fees)
- MinIO (self-hosted na VPS)
- AWS S3 (mais caro)

**Estrutura de Paths:**
```
/{storage-root}
  /org-{orgId}
    /products
      /{productName}
        /original.{ext}
        /optimized.webp
        /thumb.webp
    /templates
      /{folderName}/             # pasta do cliente (ex: "mercado-mare")
        /feed/                   # Templates 3:4 (posts)
          /templates/            # templates JSON
          /generated/            # encartes gerados
            /{date-jobId}/       # ex: 2024-02-25-job-456
              /encarte-1.png
              /encarte-2.png
        /stories/                # Templates 9:16 (stories/reels)
          /templates/            # templates JSON
          /generated/            # encartes gerados
            /{date-jobId}/       # ex: 2024-02-25-job-789
              /encarte-1.png
              /encarte-2.png
```

**Organização:**
- Produtos: por nome do produto
- Templates: por pasta do cliente + formato (feed/stories)
- Encartes: dentro da pasta + formato, por data+jobId
- Separação clara entre formatos diferentes

---

## 4. Histórico Relevante

**Sistema atual (Google Drive):**
- Imagens armazenadas em pasta do Drive
- Match por nome via script
- Limitações: lento, dependente do Google, complexo

**Decisão:** Migrar para sistema próprio (TEMP_PRD_01).

---

## 5. Padrões de Testes do Projeto

**Testes Críticos:**
- Upload de múltiplos arquivos (integration)
- Match por nome (unit tests)
- Otimização de imagens (unit tests)
- Validação de formatos (unit tests)
- Isolamento multi-tenant (integration)

---

## 6. Referências Externas

### 6.1 Upload de Arquivos em Next.js

**Pesquisa realizada:**
- "Next.js file upload best practices multipart form data 2024"

**Recursos Encontrados:**
- GitHub Discussion: "File upload from NextJS API route using multipart form"
- "Implementing Multiple File Uploads in Next.js" (Medium)
- "Next.js File Upload: The Ultimate Lightweight Solution" (Medium)

**Bibliotecas Recomendadas:**

#### formidable (v3)
- Parser de multipart/form-data
- Suporte a múltiplos arquivos
- Streaming (não carrega tudo na memória)
- Validação de tamanho

**Exemplo:**
```javascript
// app/api/upload/route.ts
import formidable from 'formidable';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const form = formidable({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ mimetype }) => {
      return mimetype?.includes('image') || false;
    }
  });

  const [fields, files] = await form.parse(req);
  
  // Processar arquivos
  for (const file of files.images) {
    await processImage(file);
  }
  
  return Response.json({ success: true });
}

// IMPORTANTE: Desabilitar bodyParser
export const config = {
  api: {
    bodyParser: false
  }
};
```

**Alternativas:**
- `multer` (mais popular, mas menos atualizado)
- `busboy` (mais baixo nível)

### 6.2 Otimização de Imagens com Sharp

**Pesquisa realizada:**
- "Node.js image optimization Sharp resize compress WebP 2024"

**Recursos Encontrados:**
- Documentação oficial: sharp.pixelplumbing.com
- GitHub: lovell/sharp (28k+ stars)
- "Optimize and Transform Images in Node.js with Sharp" (Codu)
- "WebP Image Optimisation + BlurHash with Sharp" (Opinly)

**Sharp - Características:**
- Muito rápido (usa libvips)
- Suporte a múltiplos formatos
- Redimensionamento, crop, rotate
- Conversão de formatos
- Compressão inteligente
- Metadata manipulation

**Exemplo de Otimização:**
```javascript
import sharp from 'sharp';

async function optimizeImage(inputPath, productName, orgId) {
  const outputDir = `/uploads/org-${orgId}/products/${productName}`;
  
  // Metadata
  const metadata = await sharp(inputPath).metadata();
  
  // Original (preservar)
  await sharp(inputPath)
    .toFile(`${outputDir}/original.${metadata.format}`);
  
  // Otimizado (WebP)
  await sharp(inputPath)
    .resize(2000, 2000, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .webp({ quality: 85 })
    .toFile(`${outputDir}/optimized.webp`);
  
  // Thumbnail
  await sharp(inputPath)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(`${outputDir}/thumb.webp`);
  
  return {
    original: `${outputDir}/original.${metadata.format}`,
    optimized: `${outputDir}/optimized.webp`,
    thumb: `${outputDir}/thumb.webp`,
    dimensions: {
      width: metadata.width,
      height: metadata.height
    }
  };
}
```

**Formatos Suportados:**
- Input: JPEG, PNG, WebP, GIF, SVG, TIFF
- Output: JPEG, PNG, WebP, AVIF, GIF, TIFF

**Performance:**
- ~10x mais rápido que ImageMagick
- Baixo uso de memória (streaming)

### 6.3 Storage S3-Compatible

**Pesquisa realizada:**
- "S3 compatible storage MinIO Cloudflare R2 comparison Node.js"

**Recursos Encontrados:**
- "9 Cloudflare R2 Alternatives" (ThemeDev)
- "Cloudflare R2 Hands-On Guide" (dev.to)
- "Storage Wars: Cloudflare R2 vs Amazon S3" (Vantage)
- "5 Cheap Object Storage Providers" (Sliplane)

#### Opção 1: Cloudflare R2

**Características:**
- S3-compatible API
- Zero egress fees (grande vantagem)
- Global CDN integrado
- Free tier: 10GB storage

**Prós:**
- ✅ Sem custo de download (egress)
- ✅ CDN global (baixa latência)
- ✅ Preço competitivo
- ✅ API S3 padrão

**Contras:**
- ❌ Requer conta Cloudflare
- ❌ Configuração inicial

**Preços (2024):**
- Storage: $0.015/GB/mês
- Class A ops (PUT): $4.50/milhão
- Class B ops (GET): $0.36/milhão
- Egress: $0 (FREE)

**Exemplo (aws-sdk):**
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

await s3.send(new PutObjectCommand({
  Bucket: 'insertflow-images',
  Key: `org-123/products/coca-cola-2l/optimized.webp`,
  Body: fileBuffer,
  ContentType: 'image/webp'
}));
```

#### Opção 2: MinIO (Self-Hosted)

**Características:**
- Open source
- S3-compatible
- Roda na própria VPS
- Sem custos de serviço

**Prós:**
- ✅ Controle total
- ✅ Sem custos extras (usa VPS existente)
- ✅ API S3 padrão
- ✅ Easypanel tem template

**Contras:**
- ❌ Usa recursos da VPS
- ❌ Backup manual
- ❌ Sem CDN (precisa configurar)

**Deploy no Easypanel:**
- Template one-click disponível
- Configuração via env vars
- Integração com Docker

#### Opção 3: Filesystem Local

**Características:**
- Arquivos direto no disco
- Sem dependências externas
- Mais simples

**Prós:**
- ✅ Simplicidade máxima
- ✅ Sem custos
- ✅ Rápido (local)

**Contras:**
- ❌ Não escala bem
- ❌ Backup manual
- ❌ Sem CDN
- ❌ Limitado ao disco da VPS

**Recomendação:**
- **MVP:** Filesystem local
- **Produção:** Cloudflare R2 (zero egress é decisivo)

### 6.4 Componentes de Upload (React)

**Pesquisa realizada:**
- "React drag drop file upload component library 2024"

**Recursos Encontrados:**
- react-dropzone (GitHub: 10k+ stars)
- react-drag-drop-files (GitHub: 400+ stars)
- PrimeReact FileUpload
- "Building a File Upload Component with Drag-and-Drop" (Medium)

#### react-dropzone

**Características:**
- Biblioteca mais popular
- Drag-and-drop nativo
- Validação de tipos
- Múltiplos arquivos
- Hooks API

**Prós:**
- ✅ Muito customizável
- ✅ TypeScript support
- ✅ Acessibilidade (a11y)
- ✅ Bem mantido

**Exemplo:**
```javascript
import { useDropzone } from 'react-dropzone';

function ImageUpload() {
  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    onDrop: (files) => {
      // Upload files
      uploadImages(files);
    }
  });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      <p>Arraste imagens aqui ou clique para selecionar</p>
      
      {acceptedFiles.map(file => (
        <div key={file.name}>
          {file.name} - {(file.size / 1024).toFixed(2)} KB
        </div>
      ))}
    </div>
  );
}
```

#### react-drag-drop-files

**Características:**
- Mais simples que dropzone
- Menos features, mais leve
- Boa para casos básicos

**Quando usar:**
- Dropzone: projetos complexos, muita customização
- Drag-drop-files: MVP rápido, UI simples

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Proposta

```
/apps/web/app/
├── (dashboard)/
│   └── images/
│       ├── page.tsx                 # Lista de imagens
│       ├── upload/
│       │   └── page.tsx             # Upload de imagens
│       └── components/
│           ├── ImageGrid.tsx        # Grid de thumbnails
│           ├── ImageUploader.tsx    # Drag-drop upload
│           └── ImageCard.tsx        # Card individual

/apps/api/
├── routes/
│   └── images.ts                    # API endpoints
├── services/
│   ├── ImageService.ts              # Lógica de negócio
│   ├── ImageOptimizer.ts            # Sharp processing
│   ├── ImageMatcher.ts              # Match por nome
│   └── StorageService.ts            # Abstração de storage
└── lib/
    ├── storage/
    │   ├── LocalStorage.ts          # Filesystem
    │   ├── R2Storage.ts             # Cloudflare R2
    │   └── MinioStorage.ts          # MinIO
    └── upload/
        └── multipart.ts             # Formidable setup

/packages/database/
└── schema.prisma
    └── Image model
```

### 7.2 Schema do Banco (Prisma)

```prisma
model Image {
  id            String   @id @default(cuid())
  orgId         String
  productId     String?  // null se não matched
  originalName  String
  normalizedName String  // para match
  format        String   // jpg, png, webp
  size          Int      // bytes
  width         Int
  height        Int
  paths         Json     // { original, optimized, thumb }
  urls          Json     // { original, optimized, thumb }
  matched       Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  product      Product?     @relation(fields: [productId], references: [id])
  
  @@index([orgId])
  @@index([productId])
  @@index([normalizedName])
  @@index([matched])
}

model Product {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  normalizedName String  // para match
  price       Decimal
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  images       Image[]
  
  @@index([orgId])
  @@index([normalizedName])
}
```

### 7.3 API Endpoints

```typescript
// POST /api/images/upload
// Upload múltiplas imagens
// Content-Type: multipart/form-data
// Response: { images: [...] }

// GET /api/images
// Lista imagens da org
// Query: ?matched=true&search=coca
// Response: { images: [...], total: 100 }

// GET /api/images/:id
// Detalhes de uma imagem
// Response: { image: {...} }

// DELETE /api/images/:id
// Deleta imagem
// Response: { success: true }

// PATCH /api/images/:id/associate
// Associa imagem a produto manualmente
// Body: { productId: "prod-123" }
// Response: { image: {...} }

// GET /api/images/:id/download
// Download da imagem original
// Response: file stream
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisões Técnicas Principais

**1. Storage:**

**Recomendação para MVP: Filesystem Local**
- Mais simples
- Sem configuração externa
- Adequado para 10-15 usuários iniciais

**Migração futura: Cloudflare R2**
- Quando escalar
- Zero egress fees
- CDN global

**Abstração:**
```typescript
interface StorageProvider {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

// Trocar provider sem mudar código
const storage: StorageProvider = 
  process.env.STORAGE === 'r2' 
    ? new R2Storage() 
    : new LocalStorage();
```

**2. Otimização de Imagens:**

**Recomendação: Sharp com WebP**
- Converter para WebP (menor tamanho)
- Manter original (backup)
- Gerar thumbnail (performance)

**3. Upload Component:**

**Recomendação: react-dropzone**
- Mais completo
- Melhor UX
- TypeScript support

### 8.2 Complexidade Estimada

**Estimativa:** 1-2 semanas (complexidade 2/5)

**Breakdown:**
- Upload multipart (formidable): 2-3 dias
- Otimização (Sharp): 2-3 dias
- Match por nome: 2 dias
- Interface (react-dropzone): 2-3 dias
- Storage abstraction: 1-2 dias
- Testes: 2 dias

### 8.3 Performance

**Upload:**
- 10 imagens (5MB cada): ~10-20 segundos
- Otimização: +2-3 segundos por imagem
- Total: ~30-40 segundos para batch

**Otimização:**
- Processar em paralelo (Promise.all)
- Limitar concorrência (p-limit)

**Exemplo:**
```javascript
import pLimit from 'p-limit';

const limit = pLimit(3); // max 3 simultâneos

const results = await Promise.all(
  files.map(file => 
    limit(() => optimizeImage(file))
  )
);
```

### 8.4 Segurança

**Validações:**
- Tipo de arquivo (magic bytes, não só extensão)
- Tamanho máximo
- Dimensões mínimas
- Sanitização de nome de arquivo

**Isolamento:**
- Paths sempre incluem orgId
- Verificar permissões antes de servir
- URLs assinadas (se usar S3)

**Exemplo de Validação:**
```javascript
import fileType from 'file-type';

async function validateImage(buffer) {
  const type = await fileType.fromBuffer(buffer);
  
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
    throw new Error('Formato inválido');
  }
  
  const metadata = await sharp(buffer).metadata();
  
  if (metadata.width < 300 || metadata.height < 300) {
    throw new Error('Imagem muito pequena (mín 300x300)');
  }
  
  return true;
}
```

### 8.5 Match por Nome - Refinamentos

**Casos de Borda:**
```
Produto: "Coca-Cola 2L"
Imagens:
  - "coca-cola-2l.jpg" → match exato ✅
  - "coca_cola_2l.png" → match (normalizado) ✅
  - "cocacola2l.webp" → match (normalizado) ✅
  - "coca-cola.jpg" → match parcial? (decisão)
  - "coca.jpg" → não match ❌
```

**Estratégia:**
1. Match exato (normalizado)
2. Se não, sugerir mais próximo (Levenshtein < 3)
3. Permitir associação manual

**UX:**
```
Upload: coca-cola.jpg
⚠️ Produto similar encontrado: "Coca-Cola 2L"
[ Associar ] [ Ignorar ]
```

---

## 9. Dependências entre Componentes

```
Image Manager
  ├── Upload Component (react-dropzone)
  ├── Image Optimizer (Sharp)
  ├── Storage Provider (Local/R2/MinIO)
  ├── Database (Prisma)
  └── Generation Engine (TEMP_PRD_03)
      └── Consome URLs das imagens
```

---

## 10. Riscos e Mitigações

### Risco 1: Storage Cheio
**Mitigação:** 
- Monitorar uso de disco
- Política de retenção (deletar antigos)
- Migrar para R2 quando necessário

### Risco 2: Match Incorreto
**Mitigação:**
- Mostrar sugestões, não auto-associar
- Permitir associação manual
- Log de matches para auditoria

### Risco 3: Upload Lento
**Mitigação:**
- Compressão client-side (opcional)
- Processamento assíncrono
- Progress feedback

### Risco 4: Imagens Corrompidas
**Mitigação:**
- Validação com Sharp (tenta decodificar)
- Backup do original
- Retry automático

---

## PRÓXIMO DOCUMENTO

**TEMP_PRD_05_INFRA.md:** Deploy e infraestrutura (Docker, Easypanel, CI/CD, monitoramento, backup)
