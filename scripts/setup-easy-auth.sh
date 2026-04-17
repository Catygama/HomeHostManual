#!/usr/bin/env bash
# =============================================================================
# setup-easy-auth.sh
#
# Configura App Service Authentication (Easy Auth) com provider Microsoft /
# Entra ID no Function App do HomeHost Manual.
#
# Passos:
#   1. Obtém nome do Function App e do Resource Group a partir do deployment
#      Bicep já aplicado na subscrição.
#   2. Cria (ou reutiliza) uma App Registration multi-tenant no Entra ID.
#   3. Gera um client secret válido 1 ano.
#   4. Configura authsettingsV2 no Function App a apontar para essa app
#      registration, com unauthenticated-client-action = AllowAnonymous.
#
# Pré-requisitos:
#   - az CLI instalado e `az login` feito na subscrição correcta
#   - Permissão para criar App Registrations no tenant
#   - Infra já deployada (`npm run deploy:infra`)
#
# Uso:
#   bash scripts/setup-easy-auth.sh
#
# Idempotência:
#   - Reexecutar é seguro: reaproveita a app registration se já existir e
#     actualiza o redirect URI. Gera um novo client secret a cada corrida
#     (os antigos continuam válidos até expirarem).
# =============================================================================

set -euo pipefail

DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-homehost-deploy}"
APP_REG_NAME="${APP_REG_NAME:-homehost-func-auth}"

echo "==> Garantir extensão 'authV2' do az CLI (preview)"
az config set extension.use_dynamic_install=yes_without_prompt >/dev/null
az config set extension.dynamic_install_allow_preview=true >/dev/null
az extension add --name authV2 --allow-preview true --upgrade --only-show-errors >/dev/null 2>&1 || true

echo "==> Obter outputs do deployment '$DEPLOYMENT_NAME'"
FUNC_APP_NAME=$(az deployment sub show \
	--name "$DEPLOYMENT_NAME" \
	--query properties.outputs.functionAppName.value -o tsv)
RG_NAME=$(az deployment sub show \
	--name "$DEPLOYMENT_NAME" \
	--query properties.outputs.resourceGroupName.value -o tsv)

if [[ -z "$FUNC_APP_NAME" || -z "$RG_NAME" ]]; then
	echo "Erro: não consegui ler functionAppName/resourceGroupName. Já correste 'npm run deploy:infra'?" >&2
	exit 1
fi

FUNC_HOST="${FUNC_APP_NAME}.azurewebsites.net"
REDIRECT_URI="https://${FUNC_HOST}/.auth/login/aad/callback"

echo "    Function App:   $FUNC_APP_NAME"
echo "    Resource Group: $RG_NAME"
echo "    Redirect URI:   $REDIRECT_URI"

echo ""
echo "==> Garantir App Registration '$APP_REG_NAME'"
APP_ID=$(az ad app list --display-name "$APP_REG_NAME" --query "[0].appId" -o tsv 2>/dev/null || true)

if [[ -z "$APP_ID" ]]; then
	echo "    Criar nova app registration (multi-tenant + contas Microsoft pessoais)..."
	APP_ID=$(az ad app create \
		--display-name "$APP_REG_NAME" \
		--sign-in-audience AzureADandPersonalMicrosoftAccount \
		--web-redirect-uris "$REDIRECT_URI" \
		--enable-id-token-issuance true \
		--query appId -o tsv)
else
	echo "    App registration já existe (appId=$APP_ID). Actualizar redirect URI..."
	az ad app update \
		--id "$APP_ID" \
		--web-redirect-uris "$REDIRECT_URI" \
		--enable-id-token-issuance true >/dev/null
fi

echo "    App ID: $APP_ID"

echo ""
echo "==> Gerar client secret (substitui secrets antigos)"
SECRET_NAME="easy-auth-$(date +%Y%m%d%H%M%S)"
CLIENT_SECRET=$(az ad app credential reset \
	--id "$APP_ID" \
	--display-name "$SECRET_NAME" \
	--years 1 \
	--query password -o tsv)
echo "    Secret '$SECRET_NAME' criado (expira em 1 ano)."

echo ""
echo "==> Garantir Function App em auth v2 (upgrade de v1 se necessário)"
az webapp auth config-version upgrade \
	--name "$FUNC_APP_NAME" \
	--resource-group "$RG_NAME" >/dev/null 2>&1 || echo "    (já em v2 ou upgrade desnecessário)"

echo ""
echo "==> Configurar authsettingsV2 no Function App"
az webapp auth microsoft update \
	--name "$FUNC_APP_NAME" \
	--resource-group "$RG_NAME" \
	--client-id "$APP_ID" \
	--client-secret "$CLIENT_SECRET" \
	--issuer "https://login.microsoftonline.com/common/v2.0" \
	--yes >/dev/null

az webapp auth update \
	--name "$FUNC_APP_NAME" \
	--resource-group "$RG_NAME" \
	--enabled true \
	--unauthenticated-client-action AllowAnonymous \
	--require-https true >/dev/null

echo ""
echo "==> Registar URLs permitidos para post-login redirect"
APP_SERVICE_URL=$(az deployment sub show \
	--name "$DEPLOYMENT_NAME" \
	--query properties.outputs.appServiceUrl.value -o tsv)
SUB_ID=$(az account show --query id -o tsv)
AUTH_RES_ID="/subscriptions/${SUB_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Web/sites/${FUNC_APP_NAME}/config/authsettingsV2"
ORIGINS=("${APP_SERVICE_URL}" "http://localhost:5173" "http://localhost:3000" "http://localhost:4173")
PATHS=("" "/" "/dashboard")
URLS_JSON="["
for o in "${ORIGINS[@]}"; do
	for p in "${PATHS[@]}"; do
		URLS_JSON+="\"${o}${p}\","
	done
done
URLS_JSON="${URLS_JSON%,}]"

az resource update \
	--ids "$AUTH_RES_ID" \
	--set "properties.login.allowedExternalRedirectUrls=${URLS_JSON}" \
	--query "properties.login.allowedExternalRedirectUrls" -o tsv >/dev/null
echo "    $APP_SERVICE_URL + localhost:5173/3000/4173 (root, /, /dashboard)"

echo ""
echo "Easy Auth configurado com sucesso."
echo ""
echo "Testar em:"
echo "  https://${FUNC_HOST}/.auth/login/aad"
echo "  https://${FUNC_HOST}/.auth/me"
