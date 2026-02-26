# SPEC_02_CRUD_CORE - CRUDs Básicos

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_01_CORE  
**Depende de:** SPEC_00_FUNDACAO, SPEC_01_AUTH_MULTITENANCY

---

## Visão Geral

Implementação de CRUDs completos para Organizações, Usuários, Produtos e Pastas de Templates. Inclui validação com Zod, API Routes, componentes UI e integração com multi-tenancy.

## Estado Final Desejado

- ✅ CRUD de Organizações (apenas Admin)
- ✅ CRUD de Usuários (Admin cria, User edita próprio perfil)
- ✅ CRUD de Produtos (por organização)
- ✅ CRUD de Pastas de Templates (por organização)
- ✅ Validação de dados com Zod
- ✅ UI responsiva com TailwindCSS
- ✅ Feedback de erros e sucesso

## O Que NÃO Estamos Fazendo

- ❌ Importação em massa de produtos (pode ser adicionado depois)
- ❌ Histórico de alterações/auditoria
- ❌ Soft delete (usando hard delete)
- ❌ Exportação de dados

---

## Fase 1: Schemas de Validação (Zod)

### Arquivo: `packages/lib/src/schemas.ts`

```typescript
import { z } from 'zod';

// Organization
export const createOrganizationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(3).optional(),
  active: z.boolean().optional(),
});

// User
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'user']).default('user'),
  orgId: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
});

// Product
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().positive('Preço deve ser positivo'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  processed: z.boolean().optional(),
});

// Folder
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
```

---

## Fase 2: API Routes - Organizações

### Arquivo: `apps/web/src/app/api/organizations/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { createOrganizationSchema } from '@insertflow/lib/schemas';

export async function GET() {
  try {
    await requireAdmin();
    
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true, products: true, templates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = createOrganizationSchema.parse(body);
    
    const organization = await prisma.organization.create({
      data: validated,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/organizations/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { updateOrganizationSchema } from '@insertflow/lib/schemas';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        _count: {
          select: { products: true, templates: true, folders: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = updateOrganizationSchema.parse(body);
    
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ organization });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    await prisma.organization.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
```

---

## Fase 2.5: API Routes - Usuários

### Arquivo: `apps/web/src/app/api/users/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { createUserSchema } from '@insertflow/lib';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    const where: any = {};
    if (orgId) where.orgId = orgId;

    const users = await prisma.user.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = createUserSchema.parse(body);
    
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
        role: validated.role,
        orgId: validated.orgId || null,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/users/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth-helpers';
import { updateUserSchema } from '@insertflow/lib';
import bcrypt from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    
    // User pode ver apenas próprio perfil, Admin pode ver qualquer um
    if (session.user.role !== 'admin' && session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    
    // User pode editar apenas próprio perfil, Admin pode editar qualquer um
    if (session.user.role !== 'admin' && session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await req.json();
    const validated = updateUserSchema.parse(body);
    
    const data: any = { ...validated };
    
    // Hash password if provided
    if (validated.password) {
      data.password = await bcrypt.hash(validated.password, 10);
    }
    
    // Only admin can change active status
    if (validated.active !== undefined && session.user.role !== 'admin') {
      delete data.active;
    }
    
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
```

---

## Fase 3: API Routes - Produtos (com Multi-Tenancy)

### Arquivo: `apps/web/src/app/api/products/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { createProductSchema } from '@insertflow/lib/schemas';
import { normalize } from '@insertflow/lib/utils';

export async function GET(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const processed = searchParams.get('processed');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { normalizedName: { contains: normalize(search) } },
      ];
    }
    
    if (processed !== null) {
      where.processed = processed === 'true';
    }

    const products = await db.product.findMany({
      where,
      include: {
        images: {
          select: { id: true, urls: true, matched: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = createProductSchema.parse(body);
    
    const product = await db.product.create({
      data: {
        ...validated,
        normalizedName: normalize(validated.name),
        orgId: session.user.orgId!,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/products/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { updateProductSchema } from '@insertflow/lib/schemas';
import { normalize } from '@insertflow/lib/utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: { images: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = updateProductSchema.parse(body);
    
    const data: any = { ...validated };
    if (validated.name) {
      data.normalizedName = normalize(validated.name);
    }
    
    const product = await db.product.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    await db.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
```

---

## Fase 4: API Routes - Pastas

### Arquivo: `apps/web/src/app/api/folders/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { createFolderSchema } from '@insertflow/lib/schemas';

export async function GET() {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    
    const folders = await db.folder.findMany({
      include: {
        _count: {
          select: { templates: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = createFolderSchema.parse(body);
    
    const folder = await db.folder.create({
      data: {
        ...validated,
        orgId: session.user.orgId!,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/folders/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { updateFolderSchema } from '@insertflow/lib';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    const folder = await db.folder.findUnique({
      where: { id: params.id },
      include: {
        templates: {
          select: { id: true, name: true, format: true },
        },
        _count: {
          select: { templates: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = updateFolderSchema.parse(body);
    
    const folder = await db.folder.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ folder });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    await db.folder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
```

---

## Fase 5: UI - Produtos

### Arquivo: `apps/web/src/app/dashboard/products/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { ProductsList } from './products-list';
import { CreateProductButton } from './create-product-button';

export default async function ProductsPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Produtos</h1>
          <CreateProductButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ProductsList />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/products/products-list.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  processed: boolean;
  images: any[];
}

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [search]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return;
    
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2"
        />
      </div>

      <div className="rounded-lg bg-white shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Preço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Imagem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  R$ {product.price.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {product.images.length > 0 ? (
                    <span className="text-green-600">✓ Com imagem</span>
                  ) : (
                    <span className="text-red-600">✗ Sem imagem</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {product.processed ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                      Processado
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            Nenhum produto encontrado
          </div>
        )}
      </div>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/products/create-product-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateProductButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        setName('');
        setPrice('');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Produto
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Novo Produto</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preço
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Fase 6: UI - Organizações (Admin)

### Arquivo: `apps/web/src/app/admin/organizations/page.tsx`

```typescript
import { requireAdmin } from '@/lib/auth-helpers';
import { OrganizationsList } from './organizations-list';
import { CreateOrganizationButton } from './create-organization-button';

export default async function OrganizationsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Organizações</h1>
          <CreateOrganizationButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <OrganizationsList />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/organizations/organizations-list.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Users, Package } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  _count: {
    users: number;
    products: number;
    templates: number;
  };
}

export function OrganizationsList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    setLoading(true);
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      setOrganizations(data.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrganization(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta organização? Todos os dados serão perdidos.')) return;
    
    try {
      await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organização
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Slug
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Usuários
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Produtos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {organizations.map((org) => (
            <tr key={org.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {org.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {org.slug}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {org._count.users}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {org._count.products}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <button
                  onClick={() => toggleActive(org.id, org.active)}
                  className={`rounded-full px-2 py-1 text-xs ${
                    org.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {org.active ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/organizations/${org.id}`}>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteOrganization(org.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {organizations.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          Nenhuma organização encontrada
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/organizations/create-organization-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateOrganizationButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      if (res.ok) {
        setIsOpen(false);
        setName('');
        setSlug('');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar organização');
      }
    } catch (error) {
      setError('Erro ao criar organização');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Organização
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Nova Organização</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(generateSlug(e.target.value));
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usado na URL: /org/{slug}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Fase 7: UI - Usuários (Admin)

### Arquivo: `apps/web/src/app/admin/users/page.tsx`

```typescript
import { requireAdmin } from '@/lib/auth-helpers';
import { UsersList } from './users-list';
import { CreateUserButton } from './create-user-button';

export default async function UsersPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <CreateUserButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <UsersList />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/users/users-list.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Shield, User } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  organization: {
    id: string;
    name: string;
  } | null;
}

export function UsersList() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Usuário
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organização
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Papel
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {user.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.organization?.name || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  {user.role === 'admin' ? (
                    <>
                      <Shield className="h-4 w-4 text-purple-600" />
                      Admin
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-gray-400" />
                      Usuário
                    </>
                  )}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <button
                  onClick={() => toggleActive(user.id, user.active)}
                  className={`rounded-full px-2 py-1 text-xs ${
                    user.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.active ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          Nenhum usuário encontrado
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/users/create-user-button.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
}

export function CreateUserButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  async function fetchOrganizations() {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      setOrganizations(data.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          orgId: orgId || undefined,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        setRole('user');
        setOrgId('');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      setError('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Usuário
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Novo Usuário</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Papel
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Organização
                </label>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Nenhuma (Admin global)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Fase 8: UI - Pastas de Templates

### Arquivo: `apps/web/src/app/dashboard/folders/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { FoldersList } from './folders-list';
import { CreateFolderButton } from './create-folder-button';

export default async function FoldersPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Pastas de Templates</h1>
          <CreateFolderButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <FoldersList />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/folders/folders-list.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, FolderOpen, FileText } from 'lucide-react';
import Link from 'next/link';

interface Folder {
  id: string;
  name: string;
  _count: {
    templates: number;
  };
}

export function FoldersList() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    setLoading(true);
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta pasta? Os templates serão desvinculados.')) return;
    
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      fetchFolders();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <FileText className="h-4 w-4" />
                  {folder._count.templates} template(s)
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteFolder(folder.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/dashboard/templates?folderId=${folder.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Ver Templates
              </Button>
            </Link>
          </div>
        </div>
      ))}

      {folders.length === 0 && (
        <div className="col-span-full py-12 text-center text-gray-500">
          Nenhuma pasta encontrada
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/folders/create-folder-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateFolderButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setIsOpen(false);
        setName('');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar pasta');
      }
    } catch (error) {
      setError('Erro ao criar pasta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Pasta
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Nova Pasta</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Fase 9: UI - Listagem de Templates

### Arquivo: `apps/web/src/app/dashboard/templates/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { TemplatesList } from './templates-list';
import { CreateTemplateButton } from './create-template-button';

export default async function TemplatesPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Templates</h1>
          <CreateTemplateButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TemplatesList />
      </main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/templates-list.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Copy, Layout } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  format: 'feed' | 'stories';
  productSlots: number;
  folder: {
    id: string;
    name: string;
  } | null;
}

export function TemplatesList() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'feed' | 'stories'>('all');

  useEffect(() => {
    fetchTemplates();
  }, [folderId, filter]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('folderId', folderId);
      if (filter !== 'all') params.set('format', filter);
      
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Tem certeza que deseja deletar este template?')) return;
    
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={filter === 'feed' ? 'default' : 'outline'}
          onClick={() => setFilter('feed')}
        >
          Feed (3:4)
        </Button>
        <Button
          size="sm"
          variant={filter === 'stories' ? 'default' : 'outline'}
          onClick={() => setFilter('stories')}
        >
          Stories (9:16)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Layout className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {template.format === 'feed' ? 'Feed (3:4)' : 'Stories (9:16)'}
                    {' • '}
                    {template.productSlots} produto(s)
                  </p>
                  {template.folder && (
                    <p className="text-xs text-gray-400 mt-1">
                      📁 {template.folder.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/dashboard/templates/${template.id}/editor`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Template
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhum template encontrado
          </div>
        )}
      </div>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/create-template-button.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Folder {
  id: string;
  name: string;
}

export function CreateTemplateButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'feed' | 'stories'>('feed');
  const [folderId, setFolderId] = useState('');
  const [productSlots, setProductSlots] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  async function fetchFolders() {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          format,
          folderId: folderId || null,
          productSlots: parseInt(productSlots),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsOpen(false);
        setName('');
        setFormat('feed');
        setFolderId('');
        setProductSlots('1');
        router.push(`/dashboard/templates/${data.template.id}/editor`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar template');
      }
    } catch (error) {
      setError('Erro ao criar template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Template
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Novo Template</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Formato
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'feed' | 'stories')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="feed">Feed (1080x1440 - 3:4)</option>
                  <option value="stories">Stories (1080x1920 - 9:16)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pasta
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Sem pasta</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantidade de Produtos
                </label>
                <select
                  value={productSlots}
                  onChange={(e) => setProductSlots(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} produto(s)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : 'Criar e Editar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Fase 10: Layout e Navegação

### Arquivo: `apps/web/src/app/dashboard/layout.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOrg();

  return (
    <div className="flex h-screen">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/layout.tsx`

```typescript
import { requireAdmin } from '@/lib/auth-helpers';
import { AdminSidebar } from '@/components/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex h-screen">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

### Arquivo: `apps/web/src/components/dashboard-sidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  Layout, 
  Image, 
  Sparkles,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@insertflow/ui';

interface DashboardSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Produtos', icon: Package },
  { href: '/dashboard/folders', label: 'Pastas', icon: FolderOpen },
  { href: '/dashboard/templates', label: 'Templates', icon: Layout },
  { href: '/dashboard/images', label: 'Imagens', icon: Image },
  { href: '/dashboard/generation', label: 'Gerar Encartes', icon: Sparkles },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">InsertFlow</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-300 hover:text-white">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
```

### Arquivo: `apps/web/src/components/admin-sidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  LogOut,
  User,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@insertflow/ui';

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/organizations', label: 'Organizações', icon: Building2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-purple-900 text-white flex flex-col">
      <div className="p-4 border-b border-purple-800">
        <h1 className="text-xl font-bold">InsertFlow Admin</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-200 hover:bg-purple-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-purple-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar ao Dashboard
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-purple-300 truncate">Admin</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200 hover:text-white">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/page.tsx` (atualizado)

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { Package, FolderOpen, Layout, Image } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await requireOrg();

  const quickLinks = [
    { href: '/dashboard/products', label: 'Produtos', icon: Package, color: 'bg-blue-500' },
    { href: '/dashboard/folders', label: 'Pastas', icon: FolderOpen, color: 'bg-yellow-500' },
    { href: '/dashboard/templates', label: 'Templates', icon: Layout, color: 'bg-green-500' },
    { href: '/dashboard/images', label: 'Imagens', icon: Image, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Olá, {session.user.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo ao InsertFlow. O que você gostaria de fazer hoje?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 ${link.color} rounded-lg flex items-center justify-center mb-4`}>
              <link.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{link.label}</h3>
          </Link>
        ))}
      </div>

      {session.user.role === 'admin' && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-800">
            Você é um administrador.{' '}
            <Link href="/admin" className="font-semibold underline">
              Acessar painel administrativo
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/admin/page.tsx` (atualizado)

```typescript
import { requireAdmin } from '@/lib/auth-helpers';
import { Building2, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  await requireAdmin();

  const adminLinks = [
    { href: '/admin/organizations', label: 'Organizações', icon: Building2, description: 'Gerenciar organizações do sistema' },
    { href: '/admin/users', label: 'Usuários', icon: Users, description: 'Gerenciar usuários e permissões' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
        <p className="text-gray-600 mt-1">
          Gerencie organizações e usuários do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <link.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{link.label}</h3>
            <p className="text-gray-600 mt-1">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## Critérios de Sucesso

### Verificação Automatizada:
- [x] Todas as API routes compilam sem erros
- [x] Schemas Zod validam corretamente
- [x] Build passa sem erros
- [ ] Testes de integração passam

### Verificação Manual:
- [ ] Admin consegue criar/editar/deletar organizações
- [ ] Admin consegue criar usuários
- [ ] User consegue criar/editar/deletar produtos de sua org
- [ ] User consegue criar/editar/deletar pastas de sua org
- [ ] Validação de formulários funciona
- [ ] Mensagens de erro são claras
- [ ] Isolamento multi-tenant funciona (user não vê dados de outras orgs)

---

## Próxima Spec

**SPEC_03_IMAGE_MANAGEMENT.md** - Sistema completo de upload, storage, otimização e match inteligente de imagens com IA.
