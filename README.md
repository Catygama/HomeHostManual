# HomeHostManual

Plataforma para anfitriões de alojamento local criarem e partilharem manuais digitais das suas propriedades.

## Stack

- **Frontend**: React 19 + Vite (SPA)
- **Backend**: Azure Functions (Node.js) — `health`, `me`, API REST de **properties**, upsert/leitura de **manuals** + endpoints públicos. Chaves de Cosmos vivem só nas app settings do Function App.
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

O frontend só fala com `VITE_FUNCTION_URL` (Function App) via HTTP, com cookies da sessão Easy Auth. Nenhuma credencial de Cosmos ou Storage chega ao browser — ficam só nas app settings do Function App. Para upload de imagens falta implementar (`POST /api/uploads/sas`) — ver [`docs/plans/02-migrate-to-functions.md`](docs/plans/02-migrate-to-functions.md) Fase 4. Autenticação (Easy Auth) em [`docs/plans/01-easy-auth-microsoft.md`](docs/plans/01-easy-auth-microsoft.md).

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

A app fica disponível em `http://localhost:5173`. O CORS do Function App já está configurado para `localhost:5173`, `3000` e `4173`. Cosmos e Blob deixaram de ser acedidos do browser — não precisam de CORS no client-side (o Blob mantém CORS só para leitura pública de imagens, mas não é estritamente necessário para `<img src>`).

## Deploy

Todos os comandos correm a partir da raiz do repositório.

### 1. Deploy completo (infra + frontend)

```bash
npm run deploy
```

Não inclui o código das Azure Functions; o CI em `main` corre também o job `deploy-functions`.

### 2. Apenas as Azure Functions

```bash
npm run deploy:functions
```

Faz `npm ci` em `functions/`, cria um zip (com `node_modules`) e publica com `az functionapp deployment source config-zip`, usando os nomes do deployment `homehost-deploy` (igual ao `deploy:frontend`). Remove o `func-deploy.zip` no fim se o deploy tiver sucesso. Requer `az login` e `zip` (macOS/Linux).

### 3. Apenas a infraestrutura (Bicep)

```bash
npm run deploy:infra
```

Cria/atualiza o Resource Group `rg-homehost-dev` e todos os recursos: App Service Plan, App Service, Function App, Cosmos DB, Storage Account, Application Insights e Log Analytics.

O deployment é guardado no nome `homehost-deploy` à escala da subscription — usado pelo `deploy:frontend`, `deploy:functions` e `outputs` para descobrir nomes dos recursos.

### 4. Apenas o frontend

```bash
npm run deploy:frontend
```

Faz `vite build`, empacota `frontend/dist/` num `dist.zip` e publica-o no App Service via `az webapp deploy`. O App Service serve a SPA com `pm2 serve --spa` (startup command já definido no Bicep).

### 5. Consultar outputs do deployment

```bash
npm run outputs
```

Devolve as URLs/nomes dos recursos criados (App Service, Function App, Cosmos, Storage).

## Variáveis de ambiente (frontend)

`frontend/.env` — lido pelo Vite em runtime:

| Variável | Descrição |
|---|---|
| `VITE_FUNCTION_URL` | URL base do Function App (Easy Auth + `/api/me` + API `properties`/`manuals` + endpoints públicos) |

Depois do primeiro `deploy:infra`, corre `npm run outputs` e copia `functionAppUrl` para o `.env`. No CI o `.env` é escrito automaticamente a partir do output do Bicep antes do `vite build` — o único secret no GitHub é `AZURE_CREDENTIALS`.

> O bundle do browser já não transporta nenhuma credencial do Cosmos ou do Storage — tudo passa pelo Function App.

## CI/CD — GitHub Actions

Existe um workflow em `.github/workflows/deploy.yml` que faz deploy da infraestrutura, do frontend e das Functions em cada push para `main` (ou **Actions → Deploy → Run workflow**).

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
| `deploy-infra` | `az deployment sub create` do `infra/main.bicep` e lê os outputs (nomes dos recursos) |
| `deploy-frontend` | Gera `frontend/.env` com `VITE_FUNCTION_URL` → `npm ci` + `vite build` + zip + `az webapp deploy` |
| `deploy-functions` | `npm ci` em `functions/` + `Azure/functions-action@v1` para publicar código no Function App |

`deploy-frontend` e `deploy-functions` dependem do `deploy-infra`. Se a infra falhar, os outros jobs não correm.

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
