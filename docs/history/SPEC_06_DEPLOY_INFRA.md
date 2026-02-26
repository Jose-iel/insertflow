# SPEC_06_DEPLOY_INFRA - Deploy e Infraestrutura

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_05_INFRA  
**Depende de:** SPEC_00_FUNDACAO, SPEC_01_AUTH_MULTITENANCY, SPEC_02_CRUD_CORE, SPEC_03_IMAGE_MANAGEMENT, SPEC_04_TEMPLATE_EDITOR, SPEC_05_GENERATION_ENGINE

---

## Visão Geral

Containerização completa com Docker, CI/CD com GitHub Actions, deploy no Easypanel, monitoramento com Sentry + Pino, e backup automático de PostgreSQL e uploads.

## Estado Final Desejado

- ✅ Dockerfiles otimizados (multi-stage)
- ✅ Docker Compose para desenvolvimento
- ✅ GitHub Actions CI/CD
- ✅ Deploy no Easypanel configurado
- ✅ Sentry para error tracking
- ✅ Pino para logging estruturado
- ✅ Backup automático (PostgreSQL + uploads)
- ✅ Health checks
- ✅ Variáveis de ambiente documentadas

## O Que NÃO Estamos Fazendo

- ❌ Kubernetes (Easypanel é suficiente)
- ❌ Múltiplos ambientes (staging) no MVP
- ❌ Blue-green deployment
- ❌ Monitoramento avançado (Prometheus/Grafana)

---

## Fase 1: Dockerfiles

### Arquivo: `docker/Dockerfile.web`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/*/package*.json ./packages/*/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npm run db:generate

# Build
RUN npm run build --filter=@insertflow/web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy built app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

### Arquivo: `docker/Dockerfile.worker`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/workers/package*.json ./apps/workers/
COPY packages/*/package*.json ./packages/*/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npm run db:generate

# Build workers
RUN npm run build --filter=@insertflow/workers

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy built app
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Create uploads directory
RUN mkdir -p /app/uploads

CMD ["node", "apps/workers/dist/index.js"]
```

### Arquivo: `docker-compose.yml` (atualizado)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: insertflow-postgres
    environment:
      POSTGRES_DB: insertflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: insertflow-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    container_name: insertflow-web
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/insertflow
      REDIS_URL: redis://redis:6379
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: dev-secret-change-in-prod
      STORAGE_TYPE: local
      STORAGE_PATH: /app/uploads
      NODE_ENV: production
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    container_name: insertflow-worker
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/insertflow
      REDIS_URL: redis://redis:6379
      STORAGE_TYPE: local
      STORAGE_PATH: /app/uploads
      NODE_ENV: production
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres-data:
  redis-data:
  uploads:
```

---

## Fase 2: Health Check Endpoint

### Arquivo: `apps/web/src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@insertflow/lib';

export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        redis: 'ok',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}
```

---

## Fase 3: GitHub Actions CI/CD

### Arquivo: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: insertflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run db:generate

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/insertflow_test
          REDIS_URL: redis://localhost:6379
```

### Arquivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Easypanel
        env:
          EASYPANEL_TOKEN: ${{ secrets.EASYPANEL_TOKEN }}
          EASYPANEL_PROJECT_ID: ${{ secrets.EASYPANEL_PROJECT_ID }}
        run: |
          curl -X POST https://api.easypanel.io/projects/$EASYPANEL_PROJECT_ID/deploy \
            -H "Authorization: Bearer $EASYPANEL_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"source": "github", "branch": "main"}'
```

---

## Fase 4: Sentry Configuration

### Arquivo: `apps/web/instrumentation.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}
```

### Arquivo: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

---

## Fase 5: Backup Scripts

### Arquivo: `scripts/backup-db.sh`

```bash
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="$BACKUP_DIR/insertflow_$DATE.sql.gz"

echo "🔄 Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
docker exec insertflow-postgres pg_dump -U postgres insertflow | gzip > "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "insertflow_*.sql.gz" -mtime +30 -delete

echo "🧹 Old backups cleaned"

# Optional: Upload to S3/R2
# aws s3 cp "$BACKUP_FILE" s3://insertflow-backups/postgres/
```

### Arquivo: `scripts/backup-uploads.sh`

```bash
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/uploads"
BACKUP_FILE="$BACKUP_DIR/uploads_$DATE.tar.gz"

echo "🔄 Starting uploads backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup uploads
tar czf "$BACKUP_FILE" -C /app uploads

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 90 days
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +90 -delete

echo "🧹 Old backups cleaned"

# Optional: Upload to S3/R2
# aws s3 cp "$BACKUP_FILE" s3://insertflow-backups/uploads/
```

### Arquivo: `scripts/restore-db.sh`

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-db.sh <backup-file>"
  exit 1
fi

BACKUP_FILE=$1

echo "⚠️  This will restore database from: $BACKUP_FILE"
echo "⚠️  Current data will be LOST!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted"
  exit 0
fi

echo "🔄 Restoring database..."

gunzip -c "$BACKUP_FILE" | docker exec -i insertflow-postgres psql -U postgres insertflow

echo "✅ Database restored successfully"
```

---

## Fase 6: Easypanel Configuration

### Arquivo: `easypanel.yml`

```yaml
services:
  - name: insertflow-web
    type: app
    source:
      type: github
      repo: seu-usuario/insertflow
      branch: main
    build:
      type: dockerfile
      dockerfile: docker/Dockerfile.web
    env:
      - name: DATABASE_URL
        value: ${DATABASE_URL}
      - name: REDIS_URL
        value: ${REDIS_URL}
      - name: NEXTAUTH_URL
        value: https://insertflow.seudominio.com
      - name: NEXTAUTH_SECRET
        value: ${NEXTAUTH_SECRET}
      - name: STORAGE_TYPE
        value: local
      - name: OPENAI_API_KEY
        value: ${OPENAI_API_KEY}
      - name: SENTRY_DSN
        value: ${SENTRY_DSN}
      - name: NODE_ENV
        value: production
    domains:
      - name: insertflow.seudominio.com
        port: 3000
    volumes:
      - name: uploads
        path: /app/uploads
    healthcheck:
      path: /api/health
      interval: 30s
      timeout: 10s

  - name: insertflow-worker
    type: worker
    source:
      type: github
      repo: seu-usuario/insertflow
      branch: main
    build:
      type: dockerfile
      dockerfile: docker/Dockerfile.worker
    env:
      - name: DATABASE_URL
        value: ${DATABASE_URL}
      - name: REDIS_URL
        value: ${REDIS_URL}
      - name: STORAGE_TYPE
        value: local
      - name: NODE_ENV
        value: production
    volumes:
      - name: uploads
        path: /app/uploads
```

---

## Fase 7: Documentation

### Arquivo: `docs/deployment.md`

```markdown
# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 16
- Redis 7

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/insertflow"

# Redis
REDIS_URL="redis://host:6379"

# Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Storage
STORAGE_TYPE="local" # or "r2"

# OpenAI
OPENAI_API_KEY="sk-..."

# Sentry
SENTRY_DSN="https://..."
```

## Local Development

1. Start services:
   ```bash
   docker-compose up -d
   ```

2. Run migrations:
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Production Deployment (Easypanel)

1. Push code to GitHub
2. Configure Easypanel project
3. Set environment variables
4. Deploy via Easypanel dashboard or GitHub Actions

## Backup & Restore

### Backup Database
```bash
./scripts/backup-db.sh
```

### Backup Uploads
```bash
./scripts/backup-uploads.sh
```

### Restore Database
```bash
./scripts/restore-db.sh /backups/postgres/insertflow_20240225.sql.gz
```

## Monitoring

- **Sentry:** Error tracking and performance monitoring
- **Logs:** Pino structured logs (JSON format)
- **Health Check:** `GET /api/health`

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL
- Verify PostgreSQL is running
- Check network connectivity

### Redis Connection Issues
- Check REDIS_URL
- Verify Redis is running

### Generation Failures
- Check worker logs
- Verify Puppeteer dependencies installed
- Check storage permissions
```

---

## Critérios de Sucesso

### Verificação Automatizada:
- [ ] Docker images compilam sem erros
- [ ] Docker Compose inicia todos os serviços
- [ ] Health check endpoint responde
- [ ] CI passa no GitHub Actions
- [ ] Migrations rodam sem erros

### Verificação Manual:
- [ ] Aplicação roda em produção no Easypanel
- [ ] Logs aparecem no Sentry
- [ ] Backup scripts funcionam
- [ ] Restore funciona corretamente
- [ ] Workers processam jobs
- [ ] Uploads persistem após restart
- [ ] SSL/HTTPS configurado

---

## Resumo Final

Todas as 7 especificações técnicas foram criadas com sucesso:

1. **SPEC_00_FUNDACAO** - Setup do monorepo, Prisma, Next.js, Docker Compose
2. **SPEC_01_AUTH_MULTITENANCY** - NextAuth.js, multi-tenancy, RLS
3. **SPEC_02_CRUD_CORE** - CRUDs de organizações, usuários, produtos, pastas
4. **SPEC_03_IMAGE_MANAGEMENT** - Upload, Sharp, storage, AI match
5. **SPEC_04_TEMPLATE_EDITOR** - Konva.js, editor visual, serialização JSON
6. **SPEC_05_GENERATION_ENGINE** - Puppeteer, Sharp, BullMQ, divisão de produtos
7. **SPEC_06_DEPLOY_INFRA** - Docker, CI/CD, Easypanel, Sentry, backups

**Próximo passo:** O Agente CODE pode executar cada spec sequencialmente para implementar o projeto completo.
