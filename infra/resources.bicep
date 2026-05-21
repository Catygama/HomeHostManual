// ============================================================================
// HomeHost Manual - Recursos Azure
// ============================================================================

param location string
param projectName string
param environment string
param uniqueSuffix string

@description('Imagem Docker do serviço de PDF (com tag); injetada via main.bicep')
param pdfContainerImage string

// ---------- Nomes dos recursos ----------
var appServicePlanName = 'asp-${projectName}-${environment}'
var appServiceName = '${projectName}-${environment}-${uniqueSuffix}'
var functionAppName = 'func-${projectName}-${environment}-${uniqueSuffix}'
var cosmosDbAccountName = 'cosmos-${projectName}-${environment}-${uniqueSuffix}'
var storageAccountName = 'st${projectName}${take(uniqueSuffix, 10)}'
var appInsightsName = 'ai-${projectName}-${environment}'
var logAnalyticsName = 'log-${projectName}-${environment}'
var containerRegistryName = 'acr${projectName}${take(uniqueSuffix, 10)}'
var containerAppsEnvName = 'cae-${projectName}-${environment}'
var pdfContainerAppName = 'ca-pdf-${environment}-${take(uniqueSuffix, 6)}'

// Origens permitidas para CORS (localhost do Vite + App Service em produção)
var allowedOrigins = [
	'http://localhost:5173'
	'http://localhost:3000'
	'http://localhost:4173'
	'https://${appServiceName}.azurewebsites.net'
]

// ============================================================================
// 1. Log Analytics Workspace (necessário para Application Insights)
// ============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================================================
// 2. Application Insights (Monitorização)
// ============================================================================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ============================================================================
// 3. App Service Plan (Plano para o frontend e functions)
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // necessário para Linux
  }
}

// ============================================================================
// 4. App Service (Frontend React.js em Docker Container)
// ============================================================================
resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      cors: {
        allowedOrigins: allowedOrigins
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDb.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: 'homehostdb'
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '0'
        }
      ]
    }
    httpsOnly: true
  }
}

// ============================================================================
// 5. Azure CosmosDB (Base de dados NoSQL - modo Serverless)
// ============================================================================
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: cosmosDbAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

// Base de dados
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  parent: cosmosDb
  name: 'homehostdb'
  properties: {
    resource: {
      id: 'homehostdb'
    }
  }
}

// Container: users
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

// Container: properties
resource propertiesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'properties'
  properties: {
    resource: {
      id: 'properties'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

// Container: manuals
resource manualsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'manuals'
  properties: {
    resource: {
      id: 'manuals'
      partitionKey: {
        paths: ['/propertyId']
        kind: 'Hash'
      }
    }
  }
}

// Container: analytics
resource analyticsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'analytics'
  properties: {
    resource: {
      id: 'analytics'
      partitionKey: {
        paths: ['/propertyId']
        kind: 'Hash'
      }
    }
  }
}

// ============================================================================
// 6. Storage Account + Blob Container (Imagens)
// ============================================================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: allowedOrigins
          allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource imagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'homehost-images'
  properties: {
    publicAccess: 'Blob' // imagens dos manuais públicos acessíveis por leitura
  }
}

// ============================================================================
// 7. Azure Functions (Serverless - Consumption Plan)
// ============================================================================
resource functionStorageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stfunc${projectName}${take(uniqueSuffix, 6)}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
  }
}

resource functionAppPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'asp-func-${projectName}-${environment}'
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false // Windows para evitar conflito com Linux App Service no mesmo Resource Group
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: functionAppPlan.id
    siteConfig: {
      netFrameworkVersion: 'v8.0'
      cors: {
        allowedOrigins: allowedOrigins
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${functionStorageAccount.name};AccountKey=${functionStorageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'AzureWebJobsFeatureFlags'
          value: 'EnableWorkerIndexing'
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDb.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: cosmosDb.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: 'homehostdb'
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'PDF_SERVICE_URL'
          value: 'https://${pdfContainerApp.properties.configuration.ingress.fqdn}'
        }
      ]
    }
    httpsOnly: true
  }
}

// ============================================================================
// 8. Azure Container Registry (imagens Docker — serviço de PDF)
// ============================================================================
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true // simplificação para projeto académico; usado pelo Container App e pelo CI
  }
}

// ============================================================================
// 9. Container Apps Environment (host para o serviço de PDF)
// ============================================================================
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ============================================================================
// 10. Container App — serviço de PDF (Puppeteer)
// Scale-to-zero (min=0); ingress externo HTTPS, só chamado pelo Function App
// ============================================================================
resource pdfContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: pdfContainerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'pdf-service'
          image: pdfContainerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'PUBLIC_BASE_URL'
              value: 'https://${appService.properties.defaultHostName}'
            }
            {
              name: 'PORT'
              value: '8080'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

// ============================================================================
// Outputs
// ============================================================================
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServiceName string = appService.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppName string = functionApp.name
output cosmosDbEndpoint string = cosmosDb.properties.documentEndpoint
output cosmosDbAccountName string = cosmosDb.name
output cosmosDbDatabaseName string = cosmosDatabase.name
output storageAccountName string = storageAccount.name
output containerRegistryName string = containerRegistry.name
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output pdfContainerAppName string = pdfContainerApp.name
output pdfServiceUrl string = 'https://${pdfContainerApp.properties.configuration.ingress.fqdn}'
