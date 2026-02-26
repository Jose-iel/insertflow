# SPEC_03_IMAGE_MANAGEMENT - Gestão de Imagens

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_04_IMAGES, TEMP_PRD_06_IA  
**Depende de:** SPEC_00_FUNDACAO, SPEC_01_AUTH_MULTITENANCY, SPEC_02_CRUD_CORE

---

## Visão Geral

Sistema completo de upload, armazenamento, otimização e match inteligente de imagens de produtos. Inclui processamento com Sharp, storage local (MVP) com abstração para migração futura, e match semântico com GPT-4o-mini.

## Estado Final Desejado

- ✅ Upload drag-and-drop com react-dropzone
- ✅ Validação de tipo e tamanho
- ✅ Otimização automática com Sharp (WebP + thumbnails)
- ✅ Storage local com abstração para R2/MinIO
- ✅ Match inteligente em 2 níveis (exato + IA)
- ✅ Cache de matches em Redis
- ✅ UI de galeria de imagens
- ✅ Associação manual de imagens
- ✅ Renomear imagens inline
- ✅ Refresh automático da galeria após upload

## O Que NÃO Estamos Fazendo

- ❌ Edição de imagens (crop, rotate, etc.)
- ❌ Múltiplas versões de resolução (apenas original + optimized + thumb)
- ❌ CDN (será adicionado com R2)
- ❌ Reconhecimento de imagem com IA (OCR)

---

## Fase 1: Storage Abstraction Layer

### Arquivo: `packages/lib/src/storage/types.ts`

```typescript
export interface StorageProvider {
  upload(file: Buffer, path: string, contentType: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
  exists(path: string): Promise<boolean>;
}

export interface UploadResult {
  original: string;
  optimized: string;
  thumb: string;
}
```

### Arquivo: `packages/lib/src/storage/local.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from './types';

export class LocalStorage implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.STORAGE_PATH || './uploads';
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }

  async upload(file: Buffer, filePath: string, contentType: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);

    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/uploads/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Arquivo: `packages/lib/src/storage/index.ts`

```typescript
import { StorageProvider } from './types';
import { LocalStorage } from './local';

export * from './types';

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const type = process.env.STORAGE_TYPE || 'local';

    switch (type) {
      case 'local':
        storageInstance = new LocalStorage();
        break;
      // Futuro: case 'r2': storageInstance = new R2Storage(); break;
      // Futuro: case 'minio': storageInstance = new MinioStorage(); break;
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  return storageInstance;
}
```

---

## Fase 2: Image Optimization Service

### Arquivo: `apps/web/src/lib/image-optimizer.ts`

```typescript
import sharp from 'sharp';
import { getStorage, UploadResult } from '@insertflow/lib/storage';
import { normalize } from '@insertflow/lib/utils';

export interface OptimizeImageOptions {
  orgId: string;
  productName: string;
  originalBuffer: Buffer;
  originalFormat: string;
}

export async function optimizeImage(
  options: OptimizeImageOptions
): Promise<UploadResult & { width: number; height: number; size: number }> {
  const { orgId, productName, originalBuffer, originalFormat } = options;
  const storage = getStorage();

  const normalizedName = normalize(productName);
  const basePath = `org-${orgId}/products/${normalizedName}`;

  // Get metadata
  const metadata = await sharp(originalBuffer).metadata();

  // 1. Save original
  const originalPath = `${basePath}/original.${originalFormat}`;
  await storage.upload(originalBuffer, originalPath, `image/${originalFormat}`);

  // 2. Create optimized version (WebP, max 2000x2000)
  const optimizedBuffer = await sharp(originalBuffer)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const optimizedPath = `${basePath}/optimized.webp`;
  await storage.upload(optimizedBuffer, optimizedPath, 'image/webp');

  // 3. Create thumbnail (200x200)
  const thumbBuffer = await sharp(originalBuffer)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbPath = `${basePath}/thumb.webp`;
  await storage.upload(thumbBuffer, thumbPath, 'image/webp');

  return {
    original: originalPath,
    optimized: optimizedPath,
    thumb: thumbPath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: originalBuffer.length,
  };
}
```

---

## Fase 3: AI Match Service

### Arquivo: `apps/web/src/lib/ai-match-service.ts`

```typescript
import OpenAI from 'openai';
import { redis } from '@insertflow/lib';
import { logger } from '@insertflow/lib';
import { normalize } from '@insertflow/lib/utils';
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
```

---

## Fase 4: Upload API Route

### Arquivo: `apps/web/src/app/api/images/upload/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import formidable from 'formidable';
import fs from 'fs/promises';
import { optimizeImage } from '@/lib/image-optimizer';
import { AIMatchService } from '@/lib/ai-match-service';
import { prisma } from '@/lib/prisma';
import { getStorage } from '@insertflow/lib/storage';
import { normalize } from '@insertflow/lib/utils';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const orgId = session.user.orgId!;

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const aiMatch = new AIMatchService();
    const storage = getStorage();
    const results = [];

    for (const file of files) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        continue;
      }

      // Convert to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Get format
      const format = file.type.split('/')[1];

      // Optimize image
      const optimized = await optimizeImage({
        orgId,
        productName: file.name,
        originalBuffer: buffer,
        originalFormat: format,
      });

      // AI Match
      const match = await aiMatch.matchImageToProduct(file.name, orgId);

      // Save to database
      const image = await prisma.image.create({
        data: {
          orgId,
          productId: match.productId,
          originalName: file.name,
          normalizedName: normalize(file.name),
          format,
          size: optimized.size,
          width: optimized.width,
          height: optimized.height,
          paths: {
            original: optimized.original,
            optimized: optimized.optimized,
            thumb: optimized.thumb,
          },
          urls: {
            original: storage.getUrl(optimized.original),
            optimized: storage.getUrl(optimized.optimized),
            thumb: storage.getUrl(optimized.thumb),
          },
          matched: !!match.productId,
          matchMethod: match.method,
        },
      });

      results.push({
        image,
        matchedProduct: match.productId
          ? await prisma.product.findUnique({ where: { id: match.productId } })
          : null,
      });
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/images/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();

    const { searchParams } = new URL(req.url);
    const matched = searchParams.get('matched');

    const where: any = {};
    if (matched !== null) {
      where.matched = matched === 'true';
    }

    const images = await db.image.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Arquivo: `apps/web/src/app/api/images/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { getStorage } from '@insertflow/lib/storage';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const storage = getStorage();

    const image = await db.image.findUnique({
      where: { id: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete files from storage
    const paths = image.paths as any;
    await Promise.all([
      storage.delete(paths.original),
      storage.delete(paths.optimized),
      storage.delete(paths.thumb),
    ]);

    // Delete from database
    await db.image.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const image = await db.image.update({
      where: { id: params.id },
      data: {
        productId: body.productId,
        matched: !!body.productId,
        matchMethod: 'manual',
      },
    });

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}
```

---

## Fase 5: Upload UI Component

### Arquivo: `apps/web/src/app/dashboard/images/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { ImageUploader } from './image-uploader';
import { ImageGallery } from './image-gallery';

export default async function ImagesPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Imagens</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <ImageUploader />
        <ImageGallery />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/images/image-uploader.tsx`

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from '@insertflow/ui';
import { useRouter } from 'next/navigation';

export function ImageUploader() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Upload de Imagens</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">
          {isDragActive
            ? 'Solte as imagens aqui...'
            : 'Arraste imagens aqui ou clique para selecionar'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          JPG, PNG ou WebP (máx. 10MB por arquivo)
        </p>
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Fazendo upload...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {acceptedFiles.length > 0 && !uploading && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">
            {acceptedFiles.length} arquivo(s) selecionado(s)
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            {acceptedFiles.map((file) => (
              <li key={file.name}>
                {file.name} - {(file.size / 1024).toFixed(2)} KB
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/images/image-gallery.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Trash2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@insertflow/ui';

interface Image {
  id: string;
  originalName: string;
  urls: { thumb: string; optimized: string };
  matched: boolean;
  matchMethod: string | null;
  product: { id: string; name: string } | null;
}

export function ImageGallery() {
  const [images, setImages] = useState<Image[]>([]);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, [filter]);

  async function fetchImages() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'matched') params.set('matched', 'true');
      if (filter === 'unmatched') params.set('matched', 'false');

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();
      setImages(data.images);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteImage(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta imagem?')) return;

    try {
      await fetch(`/api/images/${id}`, { method: 'DELETE' });
      fetchImages();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Galeria</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === 'matched' ? 'default' : 'outline'}
            onClick={() => setFilter('matched')}
          >
            Com Match
          </Button>
          <Button
            size="sm"
            variant={filter === 'unmatched' ? 'default' : 'outline'}
            onClick={() => setFilter('unmatched')}
          >
            Sem Match
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div key={image.id} className="group relative rounded-lg border overflow-hidden">
            <img
              src={image.urls.thumb}
              alt={image.originalName}
              className="w-full h-48 object-cover"
            />
            <div className="p-2">
              <p className="text-xs font-medium truncate">{image.originalName}</p>
              {image.product ? (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <LinkIcon className="h-3 w-3" />
                  {image.product.name}
                  {image.matchMethod === 'ai' && ' (IA)'}
                </p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Sem match</p>
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteImage(image.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="py-12 text-center text-gray-500">Nenhuma imagem encontrada</div>
      )}
    </div>
  );
}
```

---

## Fase 6: Serve Uploaded Files

### Arquivo: `apps/web/src/app/uploads/[...path]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getStorage } from '@insertflow/lib/storage';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const storage = getStorage();
    const filePath = params.path.join('/');

    const buffer = await storage.download(filePath);

    // Determine content type from extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'webp'
        ? 'image/webp'
        : ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
```

---

## Critérios de Sucesso

### Verificação Automatizada:
- [x] Upload de múltiplas imagens funciona
- [x] Otimização com Sharp gera 3 versões
- [x] Match exato funciona corretamente
- [x] Match com IA funciona (se OPENAI_API_KEY configurada)
- [x] Cache Redis armazena matches

### Verificação Manual:
- [ ] Drag-and-drop funciona
- [ ] Imagens são otimizadas (WebP menor que original)
- [ ] Thumbnails são gerados
- [ ] Match automático associa imagens a produtos
- [ ] Galeria exibe imagens corretamente
- [ ] Filtros (matched/unmatched) funcionam
- [ ] Deleção de imagens remove arquivos do storage
- [ ] Renomear imagens funciona
- [ ] Galeria atualiza automaticamente após upload

---

## Alterações Pós-Implementação

### Rota de arquivos
- Rota alterada de `/uploads/[...path]` para `/api/files/[...path]` devido ao `.gitignore` bloquear caminhos com `uploads/`

### Componentes adicionais
- `images-container.tsx` - Wrapper para gerenciar comunicação entre uploader e galeria

### Funcionalidades extras
- **Renomear imagens inline** - Clique no ícone de lápis para editar o nome
- **Refresh automático** - Galeria atualiza automaticamente após upload concluído
- **Texto branco nos filtros** - Contraste melhorado nos botões de filtro selecionados

---

## Próxima Spec

**SPEC_04_TEMPLATE_EDITOR.md** - Editor visual de templates com Konva.js, sistema de elementos, variáveis e serialização JSON.
