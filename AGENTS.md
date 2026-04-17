# AGENTS.md

Guia para agentes de IA que trabalham neste repositório.

---

## O que é o projeto

**HomeHost Manual** — aplicação web para anfitriões de alojamento local (Airbnb, etc.) criarem manuais digitais interativos para as suas propriedades. Projeto académico da unidade curricular *Computação em Nuvem* do IPCB, com requisitos obrigatórios de serviços Azure.

**Entregas académicas**:
- ✅ Entrega #1 (27 fev) — relatório inicial
- 🟡 Entrega #2 (17 abr) — funcionalidades em funcionamento
- ⏳ Entrega #3 (22 maio) — versão final + custos + alternativas europeias

Ver [`docs/STATUS.md`](docs/STATUS.md) para o estado atual detalhado.

---

## Onde estão as coisas

```
.
├── frontend/              # React 19 + Vite (SPA)
│   ├── src/
│   │   ├── pages/         # páginas da app
│   │   ├── components/    # componentes reutilizáveis
│   │   ├── services/      # acesso a dados (cosmosdb.js, blobstorage.js, functions.js)
│   │   └── styles/
│   ├── Dockerfile         # multi-stage: node build → nginx serve (ainda não usado no deploy)
│   ├── nginx.conf         # SPA fallback config
│   └── .env               # VITE_* (ATENÇÃO: commitado com chaves reais)
│
├── infra/                 # Bicep (Infrastructure as Code)
│   ├── main.bicep         # subscription scope: RG + módulo
│   └── resources.bicep    # todos os recursos Azure
│
├── functions/             # Azure Functions (AINDA NÃO CRIADO — Plano 2)
│
├── docs/
│   ├── STATUS.md          # estado do projeto, divergências, próximos passos
│   └── plans/             # planos de implementação
│       ├── 01-easy-auth-microsoft.md
│       ├── 02-migrate-to-functions.md
│       └── 03-docker-ghcr.md
│
├── .github/workflows/
│   └── deploy.yml         # CI/CD (2 jobs: infra + frontend)
│
├── package.json           # scripts de deploy da raiz (deploy, deploy:infra, deploy:frontend, outputs)
├── README.md              # docs operacionais (deploy, env vars, CI/CD, arquitetura)
├── enunciado.txt          # requisitos da unidade curricular
└── Relatório_MiniProjeto_CN_pdf.pdf
```

---

## Stack e decisões já tomadas

- **Frontend**: React 19 + Vite, SPA. Servido via App Service (Linux, Node 20) com `pm2 serve --spa`.
- **Backend**: Azure Functions (Node.js, Consumption Plan). **Provisionado mas sem código** — migração planeada no Plano 2.
- **Base de dados**: Cosmos DB serverless, 4 containers (`users`, `properties`, `manuals`, `analytics`).
- **Storage**: Blob Storage, container `homehost-images` com leitura pública.
- **Monitorização**: Application Insights + Log Analytics.
- **IaC**: Bicep (scope: subscription → module com Resource Group).
- **CI/CD**: GitHub Actions, autenticação via Service Principal (`AZURE_CREDENTIALS` secret).
- **Auth** (planeada): Easy Auth no Function App, provider Microsoft — Plano 1.
- **Docker** (planeado): GHCR como registry, App Service em modo container — Plano 3.

### Escolhas que já discutimos e porquê

| Decisão | Razão |
|---|---|
| GHCR em vez de ACR | Zero custo, zero recurso Azure extra, imagem pública simples |
| Easy Auth em vez de MSAL | Zero código de auth, plataforma trata da sessão |
| Functions Consumption | Free tier cobre o workload, escala a zero |
| `.env` do frontend gerado no CI a partir da infra | Evita manter secrets em sync no GitHub; será irrelevante após Plano 2 |
| App Service Linux B1 | Mais barato que S1, suficiente para 1 app |

---

### Outras convenções deste repo

- Textos em PT-PT quando estão para o utilizador/relatório; inglês apenas em código e identificadores
- Bicep com `@description` nos params principais, organização em secções com comentários `// ============`
- Bicep: todos os parâmetros vêm de `main.bicep` → `resources.bicep` via module
- GitHub Actions jobs nomeados por o que fazem (`deploy-infra`, `deploy-frontend`), não por tecnologia

---

## Recursos em produção (útil para debug)

- **App Service**: `homehost-dev-upe3xlftudhes` → https://homehost-dev-upe3xlftudhes.azurewebsites.net
- **Function App**: `func-homehost-dev-upe3xlftudhes` → https://func-homehost-dev-upe3xlftudhes.azurewebsites.net
- **Cosmos DB**: `cosmos-homehost-dev-upe3xlftudhes`
- **Storage Account**: `sthomehostupe3xlftud` (+ `stfunchomehost<suffix>` para o Function App)
- **Resource Group**: `rg-homehost-dev`
- **Região**: `westeurope`

Subscription: `<subscription-id>` (IPCB).

---

## Comandos rápidos

```bash
npm run deploy            # infra + frontend
npm run deploy:infra      # só Bicep
npm run deploy:frontend   # só frontend
npm run outputs           # ver URLs/nomes dos recursos
npm --prefix frontend run dev   # dev server local (http://localhost:5173)
```

Deploy automático: push para `main` dispara `.github/workflows/deploy.yml`.

---

## O que um agente deve atualizar ao fazer mudanças

A regra geral: **mantém os 3 ficheiros fonte-de-verdade alinhados com a realidade**:

1. **`docs/STATUS.md`** — snapshot do estado atual + divergências + compliance
2. **`README.md`** — stack, arquitetura, como correr, como fazer deploy
3. **`docs/plans/*.md`** — planos futuros com checklists

### Cenários

| O que mudaste | Atualiza |
|---|---|
| Adicionaste/removeste recurso no Bicep | `README.md` (secção Arquitetura) + `STATUS.md` (Infra + Compliance) |
| Mudaste fluxo de deploy | `README.md` (secção Deploy) + `STATUS.md` (Deploy e CI/CD) |
| Completaste uma fase de um plano | Marca o checkbox em `docs/plans/0X-*.md` + atualiza `STATUS.md` (mover da secção "planos" para "feito") |
| Completaste um plano inteiro | Arquiva: move o plano para `docs/plans/done/` + remove a referência aos "planos pendentes" no `STATUS.md` |
| Descobriste nova divergência do relatório | Acrescenta a `STATUS.md` §3 (Divergências) |
| Adicionaste novas convenções ou decisões | Atualiza este `AGENTS.md` |
| Alteraste variáveis de ambiente | `README.md` (secção Variáveis de ambiente) + `frontend/.env` ou workflow |
| Adicionaste dependência ao frontend | Corre `npm install` no `frontend/` — `package-lock.json` tem de ser commitado |
| Mudaste nome ou nome-padrão de recurso Azure | `STATUS.md` (Recursos em produção) + `AGENTS.md` (Recursos em produção) |

### Atualizar os planos

Os planos em `docs/plans/` têm uma secção `## Checklist` no fim. Quando completares um passo:

1. Marca o checkbox de `[ ]` para `[x]`
2. Se o passo revelar um problema não previsto, acrescenta uma nota no passo respetivo
3. Quando **todos** os checkboxes ficam marcados, o plano está concluído — atualiza `STATUS.md` para refletir

### Atualizar STATUS.md

Atualiza a **data** no topo sempre que fizeres uma mudança significativa. Mantém:
- §1 **Compliance** alinhada com a realidade (✅ / ⚠️ / ❌)
- §2 **O que está feito** com lista precisa de recursos deployed
- §3 **Divergências** separadas em "cobertas por planos" vs "não cobertas"
- §4 **Planos** — se um plano for concluído, retira da lista ou marca como ✅
- §6 **Próximos passos** ajustada ao restante trabalho

---

## O que NÃO fazer

- **Não** correr comandos git (`commit`, `push`, `pull`) em nome do utilizador — só se for **explicitamente** pedido
- **Não** rodar chaves Azure automaticamente sem aprovação (utilizador assumiu o risco do `.env` committed)
- **Não** criar recursos Azure fora do Bicep — tudo IaC
- **Não** adicionar dependências sem justificação (este projeto quer continuar leve)
- **Não** introduzir `any` / `as any` em TypeScript sem avisar
- **Não** fazer deploy manual (`az ...` ou `npm run deploy`) sem o utilizador pedir; o CI faz isso em push a `main`
- **Não** sugerir migrar para outras plataformas (Static Web Apps, Supabase, Vercel) sem razão forte — decisão de ficar em Azure+Functions já foi tomada
- **Não** apagar o `Dockerfile` nem o `nginx.conf` (vão ser usados no Plano 3)

---

## Contexto do grupo

Projeto a 3 alunos:
- **Catarina Gama** — Frontend, UX, App Service, templates Bicep, QR codes
- **João Borralho** — Dados e Backend (Cosmos, Blob)
- **Maria Gama** — Infraestrutura, CI/CD, Docker, Functions, custos

Entregas avaliativas:
- #1: 27 fev (2v) — relatório inicial ✅
- #2: 17 abr (4v) — funcionalidades 🟡
- #3: 22 mai (14v) — versão final ⏳

---

## Leitura sugerida antes de começar

1. [`enunciado.txt`](enunciado.txt) — requisitos obrigatórios da UC
2. [`docs/STATUS.md`](docs/STATUS.md) — onde estamos hoje
3. [`README.md`](README.md) — como a infra está montada e como fazer deploy
4. Planos em `docs/plans/` pela ordem: 3 → 1 → 2

VAI ATUALIZANDO FICHEIROS MD QUANDO NECESSARIO