# 🚀 Deploy Manual no Easypanel

Este guia detalha o processo **passo a passo** para fazer deploy do InsertFlow no Easypanel.

## ⚠️ Informações Importantes

**O Easypanel NÃO suporta:**
- ❌ Importação direta de `docker-compose.yml`
- ❌ Build context do GitHub em Docker Compose
- ❌ Variáveis de ambiente compartilhadas entre serviços via `${VAR}`

**Você deve:**
- ✅ Criar cada serviço manualmente pela interface
- ✅ Configurar variáveis de ambiente individualmente por serviço
- ✅ Fazer push do código no GitHub antes de começar

---

## 📋 Pré-requisitos

Antes de começar, tenha em mãos:

1. **Repositório GitHub**: `Jose-iel/insertflow` (já com código commitado)
2. **Domínio**: `insertflow.iel-company.com.br`
3. **OpenAI API Key**: Sua chave da OpenAI
4. **Acesso ao Easypanel**: URL do seu painel

---

## 🔐 Passo 0: Gerar Secrets

Execute localmente e **anote os valores**:

```bash
# Gerar NEXTAUTH_SECRET
openssl rand -base64 32

# Gerar POSTGRES_PASSWORD
openssl rand -base64 32
```

**Exemplo de saída:**
```
NEXTAUTH_SECRET: vRrlaqbvnsBNUyDFQp9hH8X8h23tXI1vCCQmKg7DthQ=
POSTGRES_PASSWORD: fVkS9yz7St8qtyazOBuoc213/YmlWkaSK3RUMc50j/g=
```

---

## � Passo 1: Criar Projeto

1. Acesse seu Easypanel
2. Clique em **"Create Project"**
3. **Project Name**: `insertflow`
4. Clique em **"Create"**

Você será redirecionado para a página do projeto.

---

## 🗄️ Passo 2: Adicionar PostgreSQL

1. No projeto, clique em **"Add Service"**
2. Selecione **"Database"** → **"PostgreSQL"**

### Configurações Básicas:
- **Service Name**: `postgres`
- **Image**: Deixe o padrão (`postgres:16` ou similar)

### Database Settings:
- **Database Name**: `insertflow`
- **Username**: `postgres`
- **Password**: Cole a senha que você gerou (`POSTGRES_PASSWORD`)
  - Exemplo: `fVkS9yz7St8qtyazOBuoc213/YmlWkaSK3RUMc50j/g=`

### Volumes (Mounts):
1. Clique em **"Add Mount"**
2. Tipo: **Volume**
3. **Volume Name**: `postgres-data`
4. **Mount Path**: `/var/lib/postgresql/data`

### Deploy:
- Clique em **"Deploy"** ou **"Create"**
- Aguarde o PostgreSQL inicializar (30-60 segundos)
- Verifique os logs para confirmar que está rodando

**✅ Anote:** A URL de conexão será `postgresql://postgres:SENHA@postgres:5432/insertflow`

---

## 🔴 Passo 3: Adicionar Redis

1. No projeto, clique em **"Add Service"**
2. Selecione **"Database"** → **"Redis"**

### Configurações Básicas:
- **Service Name**: `redis`
- **Image**: Deixe o padrão (`redis:7-alpine` ou similar)

### Volumes (Mounts):
1. Clique em **"Add Mount"**
2. Tipo: **Volume**
3. **Volume Name**: `redis-data`
4. **Mount Path**: `/data`

### Deploy:
- Clique em **"Deploy"** ou **"Create"**
- Aguarde o Redis inicializar (10-20 segundos)

**✅ Anote:** A URL de conexão será `redis://redis:6379`

---

## 🌐 Passo 4: Adicionar App Web (Next.js)

1. No projeto, clique em **"Add Service"**
2. Selecione **"App"**

### Source (Código):
1. **Source Type**: Selecione **"GitHub"**
2. Clique em **"Connect GitHub"** (se ainda não conectou)
3. Autorize o Easypanel a acessar seus repositórios
4. **Repository**: Selecione `Jose-iel/insertflow`
5. **Branch**: `main`
6. **Build Type**: Selecione **"Dockerfile"**
7. **Dockerfile Path**: `docker/Dockerfile.web`

### Environment (Variáveis de Ambiente):

Clique em **"Add Variable"** para cada uma das variáveis abaixo:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:SUA_SENHA_POSTGRES@postgres:5432/insertflow` |
| `REDIS_URL` | `redis://redis:6379` |
| `NEXTAUTH_URL` | `https://insertflow.iel-company.com.br` |
| `NEXTAUTH_SECRET` | Cole o secret que você gerou |
| `STORAGE_TYPE` | `local` |
| `STORAGE_PATH` | `/app/uploads` |
| `OPENAI_API_KEY` | Cole sua chave da OpenAI |
| `SENTRY_DSN` | Deixe vazio (ou adicione se tiver) |
| `NEXT_PUBLIC_SENTRY_DSN` | Deixe vazio (ou adicione se tiver) |
| `NODE_ENV` | `production` |

**⚠️ IMPORTANTE:** Substitua `SUA_SENHA_POSTGRES` pela senha que você gerou no Passo 0.

**Exemplo de DATABASE_URL:**
```
postgresql://postgres:fVkS9yz7St8qtyazOBuoc213/YmlWkaSK3RUMc50j/g=@postgres:5432/insertflow
```

### Mounts (Volumes):
1. Clique em **"Add Mount"**
2. Tipo: **Volume**
3. **Volume Name**: `uploads`
4. **Mount Path**: `/app/uploads`

### Domains & Proxy:
1. Clique em **"Add Domain"**
2. **Domain**: `insertflow.iel-company.com.br`
3. **Port**: `3000` (porta que o Next.js escuta)
4. **HTTPS**: ✅ Marque para ativar SSL automático
5. **Primary**: ✅ Marque como domínio principal

### Deploy Settings:
- **Replicas**: `1`
- **Command**: Deixe vazio (usa o CMD do Dockerfile)

### Deploy:
- Clique em **"Deploy"**
- O build começará automaticamente
- **Tempo estimado**: 5-10 minutos (primeira vez)
- Acompanhe os logs para ver o progresso

---

## ⚙️ Passo 5: Adicionar Worker (Processamento de Jobs)

1. No projeto, clique em **"Add Service"**
2. Selecione **"App"**

### Source (Código):
1. **Source Type**: **"GitHub"**
2. **Repository**: `Jose-iel/insertflow` (mesmo repositório)
3. **Branch**: `main`
4. **Build Type**: **"Dockerfile"**
5. **Dockerfile Path**: `docker/Dockerfile.worker`

### Environment (Variáveis de Ambiente):

Clique em **"Add Variable"** para cada uma:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:SUA_SENHA_POSTGRES@postgres:5432/insertflow` |
| `REDIS_URL` | `redis://redis:6379` |
| `STORAGE_TYPE` | `local` |
| `STORAGE_PATH` | `/app/uploads` |
| `NODE_ENV` | `production` |

**⚠️ Use a MESMA senha do PostgreSQL que você usou no serviço web!**

### Mounts (Volumes):
1. Clique em **"Add Mount"**
2. Tipo: **Volume**
3. **Volume Name**: `uploads` (**MESMO nome do web - importante!**)
4. **Mount Path**: `/app/uploads`

**💡 Dica:** Usar o mesmo nome de volume (`uploads`) faz com que web e worker compartilhem os mesmos arquivos.

### Deploy Settings:
- **Replicas**: `1`
- **Command**: Deixe vazio

### Deploy:
- Clique em **"Deploy"**
- Aguarde o build (5-10 minutos)

---

## 🗄️ Passo 6: Executar Migrations (Criar Tabelas)

Após os serviços **web** e **worker** estarem rodando:

### 6.1. Acessar Console do Serviço Web

1. No Easypanel, vá até o serviço **"web"**
2. Clique na aba **"Console"** ou **"Terminal"**
3. Um terminal interativo será aberto

### 6.2. Executar Migrations

No terminal, execute os comandos:

```bash
# Criar as tabelas no banco de dados
npm run db:push

# Popular com usuário admin
npm run db:seed
```

**Saída esperada:**
```
🌱 Seeding database...
✅ Admin criado: admin@insertflow.com
🎉 Seed concluído!

📝 Credenciais:
Email: admin@insertflow.com
Senha: InsertFlow@2024!
```

---

## ✅ Passo 7: Verificar Deploy

### 7.1. Health Check

Acesse no navegador:
```
https://insertflow.iel-company.com.br/api/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-27T13:57:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### 7.2. Acessar Aplicação

Acesse:
```
https://insertflow.iel-company.com.br
```

**Credenciais de Login:**
- **Email**: `admin@insertflow.com`
- **Senha**: `InsertFlow@2024!`

---

## � Configurações Pós-Deploy

### Auto-Deploy no Git Push

Para fazer deploy automático quando você fizer push no GitHub:

1. No Easypanel, vá até o serviço **web**
2. Clique na aba **"Deploy"**
3. Ative **"Auto Deploy"**
4. Repita para o serviço **worker**

Agora, sempre que você fizer push na branch `main`, o Easypanel fará rebuild e deploy automaticamente.

### Configurar Backups

1. No Easypanel, vá em **"Settings"** do projeto
2. Clique em **"Backups"**
3. Configure backup para:
   - **Volume `postgres-data`**: Backup diário, retenção 7 dias
   - **Volume `uploads`**: Backup semanal, retenção 30 dias

---

## ❓ Troubleshooting

### Build Falha

**Sintomas:** Build não completa, erro no log

**Soluções:**
1. Verifique se o código está no GitHub (branch `main`)
2. Confirme que os Dockerfiles existem nos caminhos:
   - `docker/Dockerfile.web`
   - `docker/Dockerfile.worker`
3. Verifique os logs de build para erros específicos
4. Tente fazer rebuild manual: **"Deploy"** → **"Rebuild"**

### Erro de Conexão com Banco de Dados

**Sintomas:** `ECONNREFUSED` ou `connection refused`

**Soluções:**
1. Aguarde 30-60s após criar o PostgreSQL (ele demora para inicializar)
2. Verifique se o serviço `postgres` está rodando (status verde)
3. Confirme que a `DATABASE_URL` está correta:
   - Nome do host deve ser `postgres` (nome do serviço)
   - Porta deve ser `5432`
   - Senha deve estar correta
4. Verifique os logs do PostgreSQL

### Worker Não Processa Jobs

**Sintomas:** Jobs ficam na fila, não são processados

**Soluções:**
1. Verifique se o serviço `worker` está rodando
2. Confirme que o volume `uploads` está montado com o **mesmo nome** do web
3. Verifique se `REDIS_URL` está correto: `redis://redis:6379`
4. Veja os logs do worker para erros

### SSL/HTTPS Não Funciona

**Sintomas:** Certificado inválido ou não carrega HTTPS

**Soluções:**
1. Aguarde 2-5 minutos após adicionar o domínio (Let's Encrypt demora)
2. Verifique se o domínio está apontando para o IP do servidor
3. Confirme que a opção **"HTTPS"** está marcada no domínio
4. Tente remover e adicionar o domínio novamente

### Uploads Não Persistem

**Sintomas:** Arquivos somem após restart

**Soluções:**
1. Confirme que o volume `uploads` está configurado em **Mounts**
2. Verifique se o **Mount Path** é `/app/uploads`
3. Certifique-se que web e worker usam o **mesmo nome de volume**

---

## ✅ Checklist de Verificação

Use esta lista para confirmar que tudo está funcionando:

### Serviços
- [ ] PostgreSQL rodando (status verde)
- [ ] Redis rodando (status verde)
- [ ] Web rodando (status verde)
- [ ] Worker rodando (status verde)

### Configuração
- [ ] Domínio configurado e acessível
- [ ] HTTPS funcionando (cadeado verde)
- [ ] Variáveis de ambiente configuradas em todos os serviços
- [ ] Volumes montados corretamente

### Funcionalidades
- [ ] Health check respondendo: `/api/health`
- [ ] Login funcionando com credenciais do admin
- [ ] Migrations executadas com sucesso
- [ ] Consegue criar organizações
- [ ] Consegue fazer upload de imagens
- [ ] Worker processa jobs (teste gerando um encarte)

### Segurança
- [ ] Senhas fortes geradas (POSTGRES_PASSWORD, NEXTAUTH_SECRET)
- [ ] OpenAI API Key configurada
- [ ] Auto-deploy ativado (opcional)
- [ ] Backups configurados (recomendado)

---

## 📚 Recursos Adicionais

### Documentação do Easypanel
- [App Service](https://easypanel.io/docs/services/app)
- [Database Services](https://easypanel.io/docs/services/postgres)
- [Environment Variables](https://easypanel.io/docs/services/app#environment)

### Logs e Monitoramento
- **Ver logs**: Clique no serviço → aba **"Logs"**
- **Console**: Clique no serviço → aba **"Console"**
- **Métricas**: Dashboard do projeto mostra CPU/RAM

### Comandos Úteis no Console

```bash
# Ver status do banco
npm run db:studio

# Recriar tabelas (CUIDADO: apaga dados)
npm run db:push --force-reset

# Ver logs da aplicação
tail -f /var/log/app.log
```

---

## 🎉 Conclusão

Se você chegou até aqui e todos os checkboxes estão marcados, **parabéns!** Sua aplicação InsertFlow está rodando em produção no Easypanel.

**Próximos passos:**
1. Crie sua primeira organização
2. Faça upload de produtos e imagens
3. Crie templates de encartes
4. Gere seu primeiro encarte

**Credenciais de acesso:**
- URL: `https://insertflow.iel-company.com.br`
- Email: `admin@insertflow.com`
- Senha: `InsertFlow@2024!`

**Suporte:**
- Documentação: `/docs/deployment.md`
- Issues: GitHub do projeto
- Easypanel: [Discord](https://discord.com/invite/9bcDSXcZQ7)
