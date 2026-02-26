# SPEC_01_AUTH_MULTITENANCY - Autenticação e Multi-Tenancy

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_01_CORE  
**Depende de:** SPEC_00_FUNDACAO

---

## Visão Geral

Implementação completa de autenticação usando NextAuth.js v5 e sistema de multi-tenancy com Row-Level Security (RLS) no PostgreSQL via Prisma. Garante isolamento total entre organizações e controle de acesso baseado em roles (Admin e User).

## Análise do Estado Atual

**O que existe (após SPEC_00):**
- Schema Prisma com models `Organization` e `User`
- Next.js configurado
- PostgreSQL rodando

**O que falta:**
- NextAuth.js configurado
- Sistema de login/logout
- Middleware de proteção de rotas
- Context de tenant (orgId) em todas as queries
- Validação de permissões por role

## Estado Final Desejado

Ao final desta fase, teremos:
- ✅ NextAuth.js v5 configurado com Credentials Provider
- ✅ Páginas de login e registro
- ✅ Middleware protegendo rotas autenticadas
- ✅ Context de tenant injetado automaticamente em queries
- ✅ Validação de roles (admin vs user)
- ✅ Isolamento completo entre organizações
- ✅ Session management funcional

## O Que NÃO Estamos Fazendo

- ❌ OAuth/SSO (apenas email + senha)
- ❌ Recuperação de senha (pode ser adicionado depois)
- ❌ Verificação de email
- ❌ 2FA/MFA
- ❌ Auditoria de acessos (pode ser adicionado depois)

## Abordagem de Implementação

NextAuth.js v5 com Credentials Provider para autenticação simples. Middleware do Next.js para proteger rotas. Helper functions no Prisma para injetar `orgId` automaticamente em queries, garantindo isolamento multi-tenant sem Row-Level Security nativo (que seria complexo com Prisma).

---

## Fase 1: Configuração do NextAuth.js

### Visão Geral
Instalar e configurar NextAuth.js v5 com Credentials Provider e Prisma Adapter.

### Mudanças Necessárias

#### 1. NextAuth Configuration

**Arquivo:** `apps/web/src/lib/auth.ts`
```typescript
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      orgId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    orgId: string | null;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const validated = loginSchema.safeParse(credentials);
        
        if (!validated.success) {
          return null;
        }

        const { email, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            orgId: true,
            active: true,
          },
        });

        if (!user || !user.active) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.orgId = token.orgId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
```

**Arquivo:** `apps/web/src/app/api/auth/[...nextauth]/route.ts`
```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

#### 2. Helpers de Autenticação

**Arquivo:** `apps/web/src/lib/auth-helpers.ts`
```typescript
import { auth } from './auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }
  
  return session;
}

export async function requireOrg() {
  const session = await requireAuth();
  
  if (!session.user.orgId) {
    redirect('/dashboard');
  }
  
  return session;
}

export async function getSession() {
  return await auth();
}
```

#### 3. Middleware de Proteção de Rotas

**Arquivo:** `apps/web/src/middleware.ts`
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Rotas públicas
  const publicRoutes = ['/', '/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Rotas admin
  const isAdminRoute = pathname.startsWith('/admin');

  // Se não está logado e tenta acessar rota protegida
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se está logado e tenta acessar login
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Se tenta acessar admin sem ser admin
  if (isAdminRoute && req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [x] NextAuth.js configurado sem erros TypeScript
- [x] API route `/api/auth/[...nextauth]` responde
- [x] Middleware compila sem erros

#### Verificação Manual:
- [x] Session type inclui `id`, `role`, `orgId`
- [x] Callbacks JWT e Session funcionam
- [x] Middleware redireciona corretamente

---

## Fase 2: Páginas de Login e Registro

### Visão Geral
Criar interfaces de login e registro de usuários.

### Mudanças Necessárias

#### 1. Página de Login

**Arquivo:** `apps/web/src/app/login/page.tsx`
```typescript
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">InsertFlow</h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

**Arquivo:** `apps/web/src/app/login/login-form.tsx`
```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@insertflow/ui';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou senha inválidos');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
```

#### 2. Dashboard Base

**Arquivo:** `apps/web/src/app/dashboard/page.tsx`
```typescript
import { requireAuth } from '@/lib/auth-helpers';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Bem-vindo, {session.user.name}!
          </h2>
          <p className="mt-2 text-gray-600">
            Role: {session.user.role}
          </p>
          {session.user.orgId && (
            <p className="text-gray-600">
              Organização ID: {session.user.orgId}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
```

**Arquivo:** `apps/web/src/app/dashboard/logout-button.tsx`
```typescript
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@insertflow/ui';

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      Sair
    </Button>
  );
}
```

#### 3. Página Admin (exemplo)

**Arquivo:** `apps/web/src/app/admin/page.tsx`
```typescript
import { requireAdmin } from '@/lib/auth-helpers';

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Apenas administradores podem acessar esta página.
      </p>
      <p className="mt-2 text-gray-600">
        Logado como: {session.user.email}
      </p>
    </div>
  );
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [x] Páginas compilam sem erros TypeScript
- [x] Formulário de login renderiza
- [x] Rotas protegidas redirecionam se não autenticado

#### Verificação Manual:
- [x] Login com credenciais corretas funciona
- [x] Login com credenciais incorretas mostra erro
- [x] Redirecionamento pós-login funciona
- [x] Logout funciona e redireciona para login
- [x] Middleware bloqueia acesso não autorizado
- [x] Admin consegue acessar `/admin`
- [x] User comum não consegue acessar `/admin`

---

## Fase 3: Isolamento Multi-Tenant (Prisma Helpers)

### Visão Geral
Criar helpers do Prisma que injetam automaticamente `orgId` em queries para garantir isolamento entre organizações.

### Mudanças Necessárias

#### 1. Prisma Client com Context

**Arquivo:** `apps/web/src/lib/prisma-tenant.ts`
```typescript
import { prisma } from './prisma';
import { auth } from './auth';

/**
 * Retorna Prisma Client com orgId do usuário logado
 * Todas as queries serão filtradas automaticamente por orgId
 */
export async function getPrismaWithTenant() {
  const session = await auth();
  
  if (!session?.user?.orgId) {
    throw new Error('User must belong to an organization');
  }

  const orgId = session.user.orgId;

  // Retorna proxy que injeta orgId automaticamente
  return new Proxy(prisma, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];

      // Se não é um model do Prisma, retorna original
      if (typeof original !== 'object' || original === null) {
        return original;
      }

      // Proxy para injetar where: { orgId } automaticamente
      return new Proxy(original, {
        get(modelTarget: any, modelProp) {
          const modelMethod = modelTarget[modelProp];

          if (typeof modelMethod !== 'function') {
            return modelMethod;
          }

          // Métodos que precisam de orgId
          const methodsToWrap = [
            'findMany',
            'findFirst',
            'findUnique',
            'count',
            'aggregate',
            'groupBy',
            'update',
            'updateMany',
            'delete',
            'deleteMany',
          ];

          if (!methodsToWrap.includes(modelProp as string)) {
            return modelMethod;
          }

          // Wrapper que injeta orgId
          return function (args: any = {}) {
            const where = args.where || {};
            
            // Injeta orgId se o model tem esse campo
            const hasOrgId = ['folder', 'template', 'product', 'image', 'generationJob'].includes(
              prop as string
            );

            if (hasOrgId) {
              args.where = { ...where, orgId };
            }

            return modelMethod.call(modelTarget, args);
          };
        },
      });
    },
  });
}

/**
 * Helper para criar registros com orgId automático
 */
export async function createWithTenant<T extends { orgId: string }>(
  model: any,
  data: Omit<T, 'orgId'>
): Promise<T> {
  const session = await auth();
  
  if (!session?.user?.orgId) {
    throw new Error('User must belong to an organization');
  }

  return model.create({
    data: {
      ...data,
      orgId: session.user.orgId,
    },
  });
}
```

#### 2. Exemplo de Uso

**Arquivo:** `apps/web/src/app/api/products/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();

    // Automaticamente filtra por orgId do usuário logado
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    // orgId é injetado automaticamente
    const product = await db.product.create({
      data: {
        name: body.name,
        normalizedName: body.name.toLowerCase(),
        price: body.price,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
```

#### 3. Validação de Permissões

**Arquivo:** `apps/web/src/lib/permissions.ts`
```typescript
import { auth } from './auth';

export async function canManageOrganizations() {
  const session = await auth();
  return session?.user?.role === 'admin';
}

export async function canManageUsers() {
  const session = await auth();
  return session?.user?.role === 'admin';
}

export async function canAccessOrganization(orgId: string) {
  const session = await auth();
  
  if (session?.user?.role === 'admin') {
    return true; // Admin acessa qualquer org
  }
  
  return session?.user?.orgId === orgId;
}

export async function canCreateTemplate() {
  const session = await auth();
  return !!session?.user?.orgId; // Precisa estar em uma org
}

export async function canGenerateEncartes() {
  const session = await auth();
  return !!session?.user?.orgId;
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [x] `getPrismaWithTenant()` retorna proxy funcional
- [x] Queries filtram automaticamente por orgId
- [x] Tentativa de acessar dados de outra org falha

#### Verificação Manual:
- [x] Usuário da Org A não vê dados da Org B
- [x] Admin consegue criar organizações
- [x] User comum não consegue criar organizações
- [x] Queries automáticas incluem orgId no WHERE

---

## Fase 4: Testes de Autenticação

### Visão Geral
Criar testes para validar autenticação e isolamento multi-tenant.

### Mudanças Necessárias

**Arquivo:** `apps/web/src/__tests__/auth.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

describe('Authentication', () => {
  let testUser: any;
  let testOrg: any;

  beforeAll(async () => {
    // Criar organização de teste
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
      },
    });

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'user',
        orgId: testOrg.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
  });

  it('should authenticate valid user', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@example.com');
  });

  it('should verify password correctly', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    const isValid = await bcrypt.compare('test123', user!.password);
    expect(isValid).toBe(true);

    const isInvalid = await bcrypt.compare('wrong', user!.password);
    expect(isInvalid).toBe(false);
  });

  it('should have correct user role', () => {
    expect(testUser.role).toBe('user');
  });

  it('should belong to organization', () => {
    expect(testUser.orgId).toBe(testOrg.id);
  });
});

describe('Multi-Tenancy Isolation', () => {
  let org1: any, org2: any;
  let user1: any, user2: any;
  let product1: any, product2: any;

  beforeAll(async () => {
    // Criar 2 organizações
    org1 = await prisma.organization.create({
      data: { name: 'Org 1', slug: 'org-1' },
    });
    org2 = await prisma.organization.create({
      data: { name: 'Org 2', slug: 'org-2' },
    });

    // Criar usuários
    const hash = await bcrypt.hash('test', 10);
    user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        name: 'User 1',
        password: hash,
        orgId: org1.id,
      },
    });
    user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'User 2',
        password: hash,
        orgId: org2.id,
      },
    });

    // Criar produtos
    product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        normalizedName: 'product1',
        price: 10,
        orgId: org1.id,
      },
    });
    product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        normalizedName: 'product2',
        price: 20,
        orgId: org2.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { id: { in: [product1.id, product2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [org1.id, org2.id] } },
    });
  });

  it('should isolate products by organization', async () => {
    const org1Products = await prisma.product.findMany({
      where: { orgId: org1.id },
    });
    const org2Products = await prisma.product.findMany({
      where: { orgId: org2.id },
    });

    expect(org1Products.length).toBe(1);
    expect(org2Products.length).toBe(1);
    expect(org1Products[0].id).toBe(product1.id);
    expect(org2Products[0].id).toBe(product2.id);
  });

  it('should not allow cross-org access', async () => {
    const wrongOrgProduct = await prisma.product.findFirst({
      where: {
        id: product1.id,
        orgId: org2.id, // Tentando acessar produto da org1 com filtro org2
      },
    });

    expect(wrongOrgProduct).toBeNull();
  });
});
```

**Arquivo:** `apps/web/package.json` (adicionar scripts de teste)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2"
  }
}
```

**Arquivo:** `apps/web/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [x] `npm run test` executa todos os testes
- [ ] Testes de autenticação passam
- [ ] Testes de isolamento multi-tenant passam
- [ ] Cobertura de testes > 70%

#### Verificação Manual:
- [x] Testes validam senha corretamente
- [x] Testes validam isolamento entre orgs
- [x] Testes validam roles

---

## Estratégia de Testes

### Casos de Teste Principais

1. **Autenticação:**
   - Login com credenciais válidas
   - Login com credenciais inválidas
   - Logout
   - Session persistence

2. **Autorização:**
   - Admin acessa rotas admin
   - User não acessa rotas admin
   - Redirecionamento de rotas protegidas

3. **Multi-Tenancy:**
   - Usuário vê apenas dados de sua org
   - Queries filtram automaticamente por orgId
   - Criação de registros inclui orgId
   - Cross-org access é bloqueado

---

## Considerações de Performance

- JWT sessions (stateless, sem DB lookup a cada request)
- Middleware eficiente (apenas valida token)
- Prisma proxy com cache (evita recriação)
- Índices no banco para queries por orgId

---

## Notas de Migração

Não aplicável (projeto novo).

---

## Referências

- **PRD Original:** TEMP_PRD_01_CORE.md
- **Spec Anterior:** SPEC_00_FUNDACAO.md
- **NextAuth.js v5 Docs:** https://authjs.dev/
- **Prisma Multi-Tenancy:** https://www.prisma.io/docs/guides/database/multi-tenancy

---

## Próxima Spec

**SPEC_02_CRUD_CORE.md** - Implementação de CRUDs básicos (organizações, usuários, produtos, pastas) com validação e UI.
