# HomeHostManual

Plataforma para anfitriões de alojamento local criarem e partilharem manuais digitais das suas propriedades.

## Stack

- **Frontend**: React 19 + Vite (SPA)
- **Backend**: Azure Functions (Node.js) — provisionado, implementação em curso
- **Base de dados**: Azure Cosmos DB (Serverless)
- **Storage**: Azure Blob Storage (imagens)
- **Hosting frontend**: Azure App Service (Linux, Node 20)
- **IaC**: Bicep (`infra/`)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)

## Arquitetura

```
┌────────────────┐         ┌─────────────────┐
│    Browser     │         │  App Insights   │◀─── telemetria de tudo
│ (React SPA)    │         └─────────────────┘
└───────┬────────┘
        │ HTTPS
        ▼
┌────────────────┐         ┌─────────────────┐
│  App Service   │         │  Function App   │
│ (serve a SPA)  │         │ (API, Node 20)  │
└────────────────┘         └────────┬────────┘
                                    │
                       ┌────────────┼────────────┐
                       ▼            ▼            ▼
                 ┌──────────┐ ┌──────────┐ ┌──────────┐
                 │ Cosmos   │ │  Blob    │ │  …       │
                 │   DB     │ │ Storage  │ │          │
                 └──────────┘ └──────────┘ └──────────┘
```

### Componentes

| Recurso | Papel |
|---|---|
| **App Service** | Serve o SPA estático (`pm2 serve --spa`). Sem lógica server-side. |
| **Function App** | API HTTP — medeia acessos ao Cosmos e Blob Storage, autenticação. |
| **Cosmos DB** | Base de dados NoSQL com 4 containers: `users`, `properties`, `manuals`, `analytics`. |
| **Blob Storage** | Container `homehost-images` para fotos dos manuais (acesso público em leitura). |
| **Application Insights** | Telemetria unificada de App Service + Function App. |
| **Log Analytics** | Backing store do App Insights. |

### Fluxo de pedidos

**Estado atual** (temporário): o browser liga **diretamente** ao Cosmos DB e ao Blob Storage usando SDKs `@azure/cosmos` e `@azure/storage-blob`. As credenciais estão no bundle do frontend — inseguro, mas aceitável enquanto a API não está implementada.

**Estado alvo**: todo o acesso a dados passa pelo Function App. O frontend só fala com `VITE_FUNCTION_URL` via HTTP e nenhuma credencial chega ao browser. Plano de migração detalhado em [`docs/plans/02-migrate-to-functions.md`](docs/plans/02-migrate-to-functions.md); plano de autenticação (Easy Auth) em [`docs/plans/01-easy-auth-microsoft.md`](docs/plans/01-easy-auth-microsoft.md).

## Estrutura do projeto

```
.
├── frontend/                  # React + Vite (SPA)
├── infra/                     # Bicep (main.bicep + resources.bicep)
├── docs/plans/                # Planos de migração (auth, backend)
├── .github/workflows/         # CI/CD
└── package.json               # Scripts de deploy (root)
```

## Pré-requisitos

- [Node.js 20+](https://nodejs.org)
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (≥ 2.60)
- `zip` (já incluído em macOS/Linux)
- Sessão Azure autenticada:

```bash
az login
az account set --subscription "<ID_DA_SUBSCRIPTION>"
```

## Desenvolvimento local

```bash
npm run install:frontend
npm --prefix frontend run dev
```

A app fica disponível em `http://localhost:5173`. O CORS do Function App, Cosmos DB e Blob Storage já está configurado para `localhost:5173`, `3000` e `4173`.

## Deploy

Todos os comandos correm a partir da raiz do repositório.

### 1. Deploy completo (infra + frontend)

```bash
npm run deploy
```

### 2. Apenas a infraestrutura (Bicep)

```bash
npm run deploy:infra
```

Cria/atualiza o Resource Group `rg-homehost-dev` e todos os recursos: App Service Plan, App Service, Function App, Cosmos DB, Storage Account, Application Insights e Log Analytics.

O deployment é guardado no nome `homehost-deploy` à escala da subscription — usado pelo `deploy:frontend` para descobrir dinamicamente o nome do App Service.

### 3. Apenas o frontend

```bash
npm run deploy:frontend
```

Faz `vite build`, empacota `frontend/dist/` num `dist.zip` e publica-o no App Service via `az webapp deploy`. O App Service serve a SPA com `pm2 serve --spa` (startup command já definido no Bicep).

### 4. Consultar outputs do deployment

```bash
npm run outputs
```

Devolve as URLs/nomes dos recursos criados (App Service, Function App, Cosmos, Storage).

## Variáveis de ambiente (frontend)

`frontend/.env` — são lidas pelo Vite em runtime:

| Variável | Descrição |
|---|---|
| `VITE_COSMOS_ENDPOINT` | Endpoint do Cosmos DB |
| `VITE_COSMOS_KEY` | Chave primária do Cosmos (ver nota de segurança) |
| `VITE_COSMOS_DATABASE` | `homehostdb` |
| `VITE_STORAGE_ACCOUNT` | Nome da storage account |
| `VITE_STORAGE_CONNECTION_STRING` | Connection string do Blob Storage |
| `VITE_FUNCTION_URL` | URL base do Function App |

Depois do primeiro `deploy:infra`, corre `npm run outputs` e atualiza o `.env` com os valores devolvidos.

> **Segurança**: expor `VITE_COSMOS_KEY` no bundle do browser dá controlo total à base de dados a quem abrir o DevTools. Em produção, mover as operações de Cosmos para o Function App e remover a chave do `.env`.

## CI/CD — GitHub Actions

Existe um workflow em `.github/workflows/deploy.yml` que faz deploy automático da infraestrutura e do frontend sempre que há um push para `main` (também pode ser corrido manualmente via **Actions → Deploy → Run workflow**).

### Setup (uma vez)

1. **Criar um Service Principal** com o Azure CLI (localmente):

	```bash
	az ad sp create-for-rbac \
		--name "github-actions-homehost" \
		--role Contributor \
		--scopes /subscriptions/<SUBSCRIPTION_ID> \
		--sdk-auth
	```

	O output é um JSON com `clientId`, `clientSecret`, `tenantId`, etc.

2. **Adicionar o secret no GitHub**:
	- Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
	- Nome: `AZURE_CREDENTIALS`
	- Valor: o JSON inteiro do passo anterior

3. **Push para `main`** — o workflow corre sozinho.

### O que o workflow faz

| Job | O que faz |
|---|---|
| `deploy-infra` | `az deployment sub create` do `infra/main.bicep` e lê os outputs |
| `deploy-frontend` | `npm ci` + `vite build` + zip + `az webapp deploy` para o App Service devolvido pelos outputs |

`deploy-frontend` depende do `deploy-infra` — se a infra falhar, o frontend não é publicado.

## Parâmetros do Bicep

`infra/main.bicep` aceita:

| Parâmetro | Default |
|---|---|
| `environment` | `dev` |
| `location` | `westeurope` |
| `projectName` | `homehost` |

Para fazer deploy de um ambiente diferente:

```bash
az deployment sub create \
  --location westeurope \
  --name homehost-deploy-prod \
  --template-file infra/main.bicep \
  --parameters environment=prod
```
