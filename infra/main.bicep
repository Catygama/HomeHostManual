// ============================================================================
// HomeHost Manual - Azure Infrastructure (Bicep)
// Deploy: az deployment sub create --location westeurope --template-file main.bicep
// ============================================================================

targetScope = 'subscription'

@description('Nome do ambiente (dev, prod)')
param environment string = 'dev'

@description('Localização dos recursos Azure')
param location string = 'westeurope'

@description('Nome base do projeto')
param projectName string = 'homehost'

@description('Imagem Docker do serviço de PDF (ex: acrhomehost<suffix>.azurecr.io/pdf-service:<sha>). Default = helloworld; o workflow atualiza-a no deploy.')
param pdfContainerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var resourceGroupName = 'rg-${projectName}-${environment}'
var uniqueSuffix = uniqueString(resourceGroupName, subscription().subscriptionId)

// ============================================================================
// Resource Group
// ============================================================================
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

// ============================================================================
// Módulo com todos os recursos dentro do Resource Group
// ============================================================================
module resources 'resources.bicep' = {
  scope: rg
  name: 'homehost-resources'
  params: {
    location: location
    projectName: projectName
    environment: environment
    uniqueSuffix: uniqueSuffix
    pdfContainerImage: pdfContainerImage
  }
}

// ============================================================================
// Outputs
// ============================================================================
output resourceGroupName string = rg.name
output appServiceUrl string = resources.outputs.appServiceUrl
output appServiceName string = resources.outputs.appServiceName
output functionAppUrl string = resources.outputs.functionAppUrl
output functionAppName string = resources.outputs.functionAppName
output cosmosDbEndpoint string = resources.outputs.cosmosDbEndpoint
output cosmosDbAccountName string = resources.outputs.cosmosDbAccountName
output cosmosDbDatabaseName string = resources.outputs.cosmosDbDatabaseName
output storageAccountName string = resources.outputs.storageAccountName
output containerRegistryName string = resources.outputs.containerRegistryName
output containerRegistryLoginServer string = resources.outputs.containerRegistryLoginServer
output pdfContainerAppName string = resources.outputs.pdfContainerAppName
output pdfServiceUrl string = resources.outputs.pdfServiceUrl
