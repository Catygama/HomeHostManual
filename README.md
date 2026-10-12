# HomeHostManual

Plataforma para anfitriões de alojamento local criarem e partilharem manuais digitais das suas propriedades.

## Stack

- **Frontend**: React 19 + Vite (SPA)
- **Backend**: Azure Functions (Node.js) — `health`, `me`, API REST de **properties**, upsert/leitura de **manuals**, endpoints públicos, `POST /api/uploads/sas` (SAS para Blob) e `GET /api/manuals/{id}/pdf` (proxy para o serviço de PDF). Chaves de Cosmos e Storage vivem só nas app settings do Function App.
- **Serviço de PDF**: contentor Docker (Node + Puppeteer headless) em **Azure Container Apps**, imagem publicada no **Azure Container Registry** privado
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
┌────────────────┐         ┌──────────────────┐
│  App Service   │         │   Function App   │
│ (serve a SPA)  │◀────────│  (API, Node 20)  │
└────────────────┘ HTML    └────────┬─────────┘
        ▲ /manual/:id               │
        │                ┌──────────┼──────────┐
        │                ▼          ▼          ▼
        │          ┌─────────┐ ┌────────┐ ┌──────────────┐
        │          │ Cosmos  │ │  Blob  │ │ Container App│
        │          │   DB    │ │Storage │ │  (PDF svc)   │
        │          └─────────┘ └────────┘ └──────┬───────┘
        │                                        │
        │                                        ▼ pull
        │                                  ┌──────────┐
        │                                  │   ACR    │
        │                                  └──────────┘
        │                                        │
        └────────────────────────────────────────┘
              Puppeteer carrega /manual/:id e devolve PDF
```

### Componentes

| Recurso | Papel |
|---|---|
| **App Service** | Serve o SPA estático (`pm2 serve --spa`). Sem lógica server-side. |
| **Function App** | API HTTP — medeia acessos ao Cosmos, Blob Storage e ao serviço de PDF; trata da auth. |
| **Container Apps Environment** | Host gerido (sem servidor) para o `pdf-service`. |
| **Container App** `ca-pdf-…` | Serviço HTTP em Node + Puppeteer; scale-to-zero (min 0, max 2). Carrega a página `/manual/:id` em Chromium headless e devolve PDF. |
| **Container Registry** (ACR Basic) | Registry privado das imagens Docker do `pdf-service`; tag por commit SHA. |
| **Cosmos DB** | Base de dados NoSQL com 4 containers: `users`, `properties`, `manuals`, `analytics`. |
| **Blob Storage** | Container `homehost-images` para fotos dos manuais (acesso público em leitura). |
| **Application Insights** | Telemetria unificada de App Service + Function App + Container App. |
| **Log Analytics** | Backing store do App Insights e dos logs do Container Apps Environment. |

### Fluxo de pedidos

O frontend só fala com `VITE_FUNCTION_URL` (Function App) via HTTP, com cookies da sessão Easy Auth. Nenhuma credencial de Cosmos ou Storage chega ao browser. Para upload de imagens o frontend pede um SAS token a `POST /api/uploads/sas` e faz o `PUT` direto ao blob — a chave do Storage fica só no Function App.

Para gerar o PDF de um manual, o browser abre `GET /api/manuals/{id}/pdf` no Function App. Esse endpoint valida que a property existe e chama o Container App (`POST /pdf`) por HTTPS interno (URL em `PDF_SERVICE_URL`, app setting). O Container App corre Puppeteer, abre `https://<app-service>/manual/{id}`, espera pelo conteúdo, exporta o PDF em A4 e devolve-o ao Function App, que o faz stream para o browser.

## Estrutura do projeto

```
.
├── frontend/                  # React + Vite (SPA)
├── functions/                 # Azure Functions (Node v4)
├── pdf-service/               # Container Node + Puppeteer (PDF dos manuais)
├── infra/                     # Bicep (main.bicep + resources.bicep)
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

Cria/atualiza o Resource Group `rg-homehost-dev` e todos os recursos: App Service Plan, App Service, Function App, Cosmos DB, Storage Account, Application Insights, Log Analytics, **Container Registry (ACR Basic)**, **Container Apps Environment** e o **Container App** do `pdf-service`.

O deployment é guardado no nome `homehost-deploy` à escala da subscription — usado pelo `deploy:frontend`, `deploy:functions` e `outputs` para descobrir nomes dos recursos.

> No primeiro `deploy:infra` o Container App é criado com uma imagem helloworld de placeholder (não há imagem no ACR ainda). Em CI, o job `build-and-push-pdf` constrói a imagem real e o `deploy-pdf-service` faz `az containerapp update --image` para a imagem do ACR. Localmente, faz a mesma sequência (`docker build` + `az acr login` + `docker push` + `az containerapp update`).

### 4. Apenas o frontend

```bash
npm run deploy:frontend
```

Faz `vite build`, empacota `frontend/dist/` num `dist.zip` e publica-o no App Service via `az webapp deploy`. O App Service serve a SPA com `pm2 serve --spa` (startup command já definido no Bicep).

### 5. Apenas o serviço de PDF (Docker → ACR → Container App)

Não há script `npm` para isto (é feito pelo CI). Manualmente:

```bash
ACR_NAME=$(az deployment sub show --name homehost-deploy --query properties.outputs.containerRegistryName.value -o tsv)
ACR_SERVER=$(az deployment sub show --name homehost-deploy --query properties.outputs.containerRegistryLoginServer.value -o tsv)
RG=$(az deployment sub show --name homehost-deploy --query properties.outputs.resourceGroupName.value -o tsv)
CA=$(az deployment sub show --name homehost-deploy --query properties.outputs.pdfContainerAppName.value -o tsv)
TAG=$(git rev-parse --short=7 HEAD)

az acr login --name "$ACR_NAME"
docker build -t "$ACR_SERVER/pdf-service:$TAG" -t "$ACR_SERVER/pdf-service:latest" pdf-service
docker push "$ACR_SERVER/pdf-service:$TAG"
docker push "$ACR_SERVER/pdf-service:latest"

az containerapp update --resource-group "$RG" --name "$CA" --image "$ACR_SERVER/pdf-service:$TAG"
```

### 6. Consultar outputs do deployment

```bash
npm run outputs
```

Devolve as URLs/nomes dos recursos criados (App Service, Function App, Cosmos, Storage, ACR, Container App de PDF).

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
| `deploy-infra` | Lê a imagem atual do Container App (ou usa helloworld no 1º run), faz `az deployment sub create` do `infra/main.bicep` e expõe outputs |
| `deploy-frontend` | Gera `frontend/.env` com `VITE_FUNCTION_URL` → `npm ci` + `vite build` + zip + `az webapp deploy` |
| `deploy-functions` | `npm ci` em `functions/` + `Azure/functions-action@v1` para publicar código no Function App |
| `build-and-push-pdf` | `az acr login` → `docker build -t <acr>/pdf-service:<sha7>` → `docker push` (também tag `latest`) |
| `deploy-pdf-service` | `az containerapp update --image <acr>/pdf-service:<sha7>` |

Os 4 jobs de deploy dependem do `deploy-infra`. `deploy-pdf-service` depende também do `build-and-push-pdf`. Se a infra falhar, nada do resto corre.

## Parâmetros do Bicep

`infra/main.bicep` aceita:

| Parâmetro | Default |
|---|---|
| `environment` | `dev` |
| `location` | `westeurope` |
| `projectName` | `homehost` |
| `pdfContainerImage` | `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest` (substituído pelo CI pela imagem real do ACR) |

Para fazer deploy de um ambiente diferente:

```bash
az deployment sub create \
  --location westeurope \
  --name homehost-deploy-prod \
  --template-file infra/main.bicep \
  --parameters environment=prod
```
