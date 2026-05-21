# pdf-service

Serviço HTTP em Node.js que gera PDFs dos manuais HomeHost a partir da página pública (`/manual/:id`), usando Puppeteer headless + Chromium.

Corre em **Azure Container Apps**, com imagem publicada no **Azure Container Registry**. É invocado pelo Function App (`GET /api/manuals/{id}/pdf`), não pelo browser diretamente.

## Endpoints

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/pdf` | Body: `{ "propertyId": "<id>" }` → devolve `application/pdf` |

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP (default `8080`) |
| `PUBLIC_BASE_URL` | URL do App Service (frontend) — usado para montar `${PUBLIC_BASE_URL}/manual/<id>` |
| `PUPPETEER_EXECUTABLE_PATH` | Path do Chromium (default `/usr/bin/chromium`) |

## Local dev

```bash
docker build -t homehost/pdf-service .
docker run --rm -p 8080:8080 \
	-e PUBLIC_BASE_URL=https://homehost-dev-upe3xlftudhes.azurewebsites.net \
	homehost/pdf-service
```

Testar:

```bash
curl -X POST http://localhost:8080/pdf \
	-H 'Content-Type: application/json' \
	-d '{"propertyId":"<id-de-uma-property-publicada>"}' \
	-o manual.pdf
```

## Deploy

Automático via GitHub Actions (`.github/workflows/deploy.yml`, jobs `build-and-push-pdf` + `deploy-pdf-service`).
