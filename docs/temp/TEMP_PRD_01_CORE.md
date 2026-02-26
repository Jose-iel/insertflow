# TEMP_PRD_01 - Arquitetura Core e Multi-Tenancy

## 1. Resumo do Pedido

Sistema web para geração automatizada de encartes de supermercado com as seguintes características:

- **Migração do fluxo atual:** Google Sheets + n8n + Google Slides → Sistema web completo
- **Multi-tenant:** Múltiplas organizações isoladas
- **Editor de templates:** Designers criam templates visuais sem código
- **Geração inteligente:** Sistema divide produtos automaticamente entre múltiplos encartes
- **Formatos:** PNG em 2 aspectos (3:4 feed, 9:16 stories/reels)
- **Gestão de imagens:** Sistema próprio (não Google Drive)

---

## 2. Contexto Atual da Codebase

### 2.1 Estado do Projeto
- **Projeto novo:** Sem código existente
- **Documentação:** Apenas definições de agentes em `/docs/agents/`
- **Infraestrutura:** VPS com Easypanel já configurada
- **Serviços existentes:** PostgreSQL, Redis, n8n (será descontinuado)

### 2.2 Estrutura Atual
```
/Users/josehenrique/Pessoal/insertflow/
├── docs/
│   └── agents/
│       ├── CODE_AGENT.md
│       ├── SEARCH_AGENT.md
│       └── SPEC_AGENT.md
```

---

## 3. Regras de Negócio

### 3.1 Multi-Tenancy (Organizações)

**Hierarquia:**
```
Admin (Super User)
  └── Organizações
      └── Usuários
          ├── Templates
          ├── Pastas de Templates
          ├── Produtos
          └── Imagens
```

**Isolamento:**
- Organizações são completamente isoladas
- Usuários de uma org NÃO veem dados de outras orgs
- Templates, imagens, produtos são por organização
- Admin cria e gerencia organizações

### 3.2 Autenticação e Autorização

**Perfis:**
1. **Admin (Super User)**
   - Cria organizações
   - Gerencia usuários de qualquer org
   - Acesso total ao sistema

2. **Usuário da Organização**
   - Cadastra produtos
   - Cria/edita templates
   - Organiza pastas de templates
   - Gera encartes
   - Faz upload de imagens

**Autenticação:**
- Email + Senha (simples)
- Sem OAuth, sem SSO
- Admin cria usuários manualmente

### 3.3 Sistema de Templates

**Organização:**
- Templates organizados em **pastas por cliente**
- Cada pasta pertence a uma organização
- Dentro de cada pasta: **subpastas por formato**
  - `/feed/` - Templates 3:4 (posts)
  - `/stories/` - Templates 9:16 (stories/reels)
- Exemplo: "Mercado Maré" → `/feed/` (templates 1-6 produtos) + `/stories/` (templates 1-6 produtos)
- Usuários criam pastas dentro de sua org
- Templates podem ser clonados entre pastas

**Estrutura de Template:**
- Define quantidade de produtos (1, 2, 3, 4, 5, 6, etc.)
- Define formato (3:4 ou 9:16)
- Contém elementos: textos, fundos, imagens, formas, cores
- Áreas de produtos (slots) onde dados serão injetados

**Criação:**
- Designers criam templates do zero no editor visual
- Sem necessidade de conhecimento técnico
- Preview em tempo real não é obrigatório (simplifica MVP)

**Armazenamento de Encartes Gerados:**
- Encartes são salvos dentro da pasta de templates usada, separados por formato
- Estrutura: `/templates/{folder-name}/{format}/generated/{date-job-id}/`
  - Exemplo: `/templates/mercado-mare/feed/generated/2024-02-25-job-456/`
  - Exemplo: `/templates/mercado-mare/stories/generated/2024-02-25-job-789/`
- Facilita encontrar gerações por cliente E formato
- Histórico organizado por pasta e formato

### 3.4 Lógica de Divisão de Produtos

**Algoritmo:**
1. Usuário cadastra N produtos
2. Usuário escolhe pasta de templates (ex: "Mercado Maré")
3. Usuário escolhe formato (Feed 3:4 OU Stories 9:16)
4. Sistema identifica templates disponíveis na subpasta do formato (ex: `/feed/` com templates 1, 2, 4, 6)
5. Sistema divide produtos usando templates maiores primeiro
6. Gera múltiplos encartes conforme necessário
7. Salva em `/{folder}/feed/generated/` ou `/{folder}/stories/generated/`

**Exemplo:**
- 13 produtos cadastrados
- Pasta tem templates: 1, 2, 4, 6
- Sistema gera:
  - Encarte 1: template 6 (produtos 1-6)
  - Encarte 2: template 6 (produtos 7-12)
  - Encarte 3: template 1 (produto 13)

**Regra:**
- Sempre usa template de 1 produto como fallback
- Otimiza para usar templates maiores primeiro
- Garante que todos os produtos sejam incluídos

### 3.5 Gestão de Produtos

**Campos:**
- Nome do produto
- Preço
- Status: processado/não processado
- Link para imagem (match automático por nome)

**Fluxo:**
1. Usuário cadastra produtos na interface
2. Sistema faz match de imagens por nome
3. Indica se imagem está faltando
4. Usuário escolhe pasta de templates
5. Clica em "Gerar"
6. Sistema processa e retorna links dos encartes gerados

### 3.6 Gestão de Imagens

**Armazenamento:**
- Sistema próprio (não Google Drive)
- Upload direto na interface
- Organizado por organização

**Match Inteligente (com IA):**
- **Nível 1:** Match exato por normalização de string (rápido)
- **Nível 2:** Match semântico com IA (GPT-4o-mini) se exato falhar
- Entende variações: "2L" = "2 Litros", typos, abreviações
- Cache em Redis (reduz custo)
- Custo negligenciável (~$0.01-0.05/mês)
- **Ver detalhes:** TEMP_PRD_06_IA.md

**Estrutura:**
```
/uploads
  /org-{id}
    /products
      /{product-name}.png
```

### 3.7 Geração de Encartes

**Output:**
- Formato: PNG de alta qualidade
- Resolução: 300 DPI (para impressão)
- Aspectos: 3:4 (feed) OU 9:16 (stories/reels)
- Definido pelo template escolhido

**Performance:**
- Tempo atual (n8n): ~1 minuto para processar
- Meta: manter ou melhorar
- Processamento pode ser assíncrono

**Entrega:**
- PNGs salvos no sistema
- Links retornados ao usuário
- Campo "processado" atualizado com links

---

## 4. Histórico Relevante

### 4.1 Sistema Atual (n8n + Google)
- n8n com workflow de automação
- Google Sheets para cadastro de dados
- Google Slides para templates (DOR PRINCIPAL)
- Google Drive para armazenamento
- Script Apps Script para feedback

### 4.2 Decisões Arquiteturais

**Descartado:**
- ❌ Manter n8n (não suporta editor visual + lógica complexa)
- ❌ Google Slides para templates (inadequado para design)
- ❌ Google Drive para imagens (complexidade desnecessária)

**Aprovado:**
- ✅ Sistema completo em Node.js + React/Next.js
- ✅ Editor visual de templates
- ✅ Armazenamento próprio de imagens
- ✅ Multi-tenancy com PostgreSQL

---

## 5. Padrões de Testes do Projeto

**Estado atual:** Projeto novo, sem testes definidos ainda.

**Recomendações para SPEC:**
- Definir framework (Jest, Vitest)
- Estrutura de pastas para testes
- Padrões de nomenclatura
- Cobertura mínima esperada

---

## 6. Referências Externas

### 6.1 Multi-Tenancy com PostgreSQL

**Padrão Recomendado: Row-Level Security (RLS)**

Fontes pesquisadas:
- "Securing Multi-Tenant Applications Using Row Level Security in PostgreSQL with Prisma ORM" (Medium)
- "Multi-Tenant Search in PostgreSQL with Row-Level Security" (Pedro Alonso)
- "Build Multi-Tenant SaaS with NestJS: Complete Guide to Row-Level Security" (EliteDev)

**Abordagem:**
- Coluna `org_id` em todas as tabelas
- RLS policies no PostgreSQL
- Prisma com contexto de tenant
- Isolamento garantido no nível do banco

**Alternativas:**
- Schema por tenant (mais complexo)
- Database por tenant (overhead)

### 6.2 Autenticação Next.js

Fontes pesquisadas:
- "How to Implement Multi-Tenancy in Next.js: A Complete Guide" (Update.dev)
- "Multi tenancy best practices" (Vercel Next.js Discussions)
- "Complete Authentication Guide for Next.js App Router in 2025" (Clerk)

**Opções:**
1. **NextAuth.js v5 (Auth.js)**
   - Open source
   - Controle total
   - Sem vendor lock-in
   - Requer mais configuração

2. **Clerk**
   - Pronto para produção
   - Multi-tenant nativo
   - Pago (free tier limitado)
   - Menos controle

**Recomendação para SPEC:** NextAuth.js v5 (mais controle, sem custos)

### 6.3 Deploy Easypanel

Fontes pesquisadas:
- "Deploying a Next.js Application with Easypanel" (Easypanel Docs)
- "Self-hosting Next.js with EasyPanel (Docker)" (Reddit)
- "Dockerizing a Next.js and Node.js App with PostgreSQL and Prisma" (Medium)

**Easypanel suporta:**
- Nixpacks (build automático)
- Dockerfile customizado
- PostgreSQL templates
- Redis templates
- Variáveis de ambiente
- Domínios customizados

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Proposta (para SPEC definir)

```
/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # Node.js backend (opcional, pode ser tudo no Next.js)
├── packages/
│   ├── database/               # Prisma schema + migrations
│   ├── ui/                     # Componentes compartilhados
│   └── config/                 # Configs compartilhadas
├── docs/
│   ├── agents/
│   └── history/                # SPECs gerados
└── docker/
    └── Dockerfile
```

### 7.2 Tecnologias Core (Confirmadas)

**Frontend:**
- Next.js 14+ (App Router)
- React
- TypeScript
- TailwindCSS

**Backend:**
- Node.js
- Next.js API Routes ou servidor separado

**Banco de Dados:**
- PostgreSQL (já existe na VPS)
- Prisma ORM

**Cache:**
- Redis (já existe na VPS)

**Deploy:**
- Easypanel (Docker)

### 7.3 Dependências entre Componentes

```
Web App (Next.js)
  ├── Auth System (NextAuth)
  ├── Template Editor (Konva.js - ver TEMP_PRD_02)
  ├── Generation Engine (Puppeteer/Sharp - ver TEMP_PRD_03)
  ├── Image Manager + AI Match (ver TEMP_PRD_04 e TEMP_PRD_06)
  └── Database (Prisma + PostgreSQL)
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisões Técnicas Pendentes

1. **Editor de Templates:**
   - Fabric.js vs Konva.js (ver TEMP_PRD_02)
   - Estrutura de dados do template (JSON schema)

2. **Geração de PNG:**
   - Puppeteer vs Playwright (ver TEMP_PRD_03)
   - Como garantir 300 DPI

3. **Armazenamento de Imagens:**
   - Filesystem vs S3-compatible (ver TEMP_PRD_04)
   - MinIO self-hosted vs Cloudflare R2

4. **Arquitetura:**
   - Monorepo vs repos separados
   - API Routes do Next.js vs servidor Node separado

### 8.2 Complexidade Estimada

**Alto:**
- Editor visual de templates (4/5)
- Sistema de geração multi-encarte (3/5)

**Médio:**
- Multi-tenancy com RLS (3/5)
- Autenticação (2/5)

**Baixo:**
- CRUD de produtos (1/5)
- Upload de imagens (2/5)

### 8.3 Priorização Sugerida (MVP)

**Fase 1 - Core (2-3 semanas):**
- Autenticação + Multi-tenancy
- CRUD de organizações e usuários
- CRUD de produtos
- Upload e gestão de imagens

**Fase 2 - Editor (3-4 semanas):**
- Editor visual de templates
- Sistema de pastas
- Clonagem de templates

**Fase 3 - Geração (2-3 semanas):**
- Engine de geração PNG
- Lógica de divisão de produtos
- Processamento assíncrono

**Total MVP:** 7-10 semanas

---

## 9. Informações Adicionais

### 9.1 Usuários Iniciais
- 10-15 usuários
- Baixa concorrência inicial
- Pode escalar depois

### 9.2 Volume de Dados (Estimado)
- Produtos: centenas por org
- Templates: dezenas por org
- Imagens: centenas por org
- Encartes gerados: milhares/mês

### 9.3 Requisitos Não-Funcionais
- Performance: ~1 minuto para gerar (manter atual)
- Disponibilidade: não crítico (pode ter downtime planejado)
- Segurança: isolamento total entre orgs
- Usabilidade: designers sem conhecimento técnico devem usar

---

## DOCUMENTOS RELACIONADOS

- **TEMP_PRD_02_EDITOR.md:** Sistema de editor de templates (Konva.js, estrutura JSON, UI/UX)
- **TEMP_PRD_03_GENERATION.md:** Engine de geração de encartes (Puppeteer, 300 DPI, algoritmo de divisão)
- **TEMP_PRD_04_IMAGES.md:** Sistema de gestão de imagens (storage, upload, match, otimização)
- **TEMP_PRD_05_INFRA.md:** Deploy e infraestrutura (Docker, Easypanel, CI/CD, monitoramento)
- **TEMP_PRD_06_IA.md:** Match inteligente de imagens com IA (GPT-4o-mini, cache, custos)
