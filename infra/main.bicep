targetScope = 'resourceGroup'

@description('Prefix for all resources')
param namePrefix string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Container image to deploy')
param containerImage string

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Container Registry SKU')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('App Service Plan SKU name')
param appServicePlanSkuName string = 'B1'

@description('App Service Plan SKU tier')
param appServicePlanSkuTier string = 'Basic'

@description('Deploy Cosmos DB serverless instance')
param deployCosmosDb bool = false

@description('Cosmos DB database name')
param cosmosDbDatabaseName string = 'triviachallenge'

@description('Cosmos DB containers configuration')
param cosmosDbContainers array = [
  {
    name: 'users'
    paths: [
      '/id'
    ]
  }
  {
    name: 'sessions'
    paths: [
      '/userId'
    ]
  }
  {
    name: 'questions'
    paths: [
      '/id'
    ]
  }
  {
    name: 'telemetry'
    paths: [
      '/sessionId'
    ]
  }
]

// Variables
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = '${namePrefix}acr${uniqueSuffix}'
var appServicePlanName = '${namePrefix}-asp-${environment}'
var appServiceName = '${namePrefix}-api-${environment}'
var cosmosDbAccountName = '${namePrefix}-cosmos-${environment}-${uniqueSuffix}'

// Azure Container Registry using Azure Verified Module
module acr 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'acrDeployment'
  params: {
    name: acrName
    location: location
    acrSku: acrSku
    acrAdminUserEnabled: false // Disabled - using managed identity instead
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
    dataEndpointEnabled: false
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled'
    tags: {
      environment: environment
      project: 'trivia-challenge'
      managedBy: 'bicep'
    }
  }
}

// App Service Plan using Azure Verified Module
module appServicePlan 'br/public:avm/res/web/serverfarm:0.1.0' = {
  name: 'appServicePlanDeployment'
  params: {
    name: appServicePlanName
    location: location
    sku: {
      name: appServicePlanSkuName
      tier: appServicePlanSkuTier
      capacity: 1
    }
    kind: 'Linux'
    reserved: true
    tags: {
      environment: environment
      project: 'trivia-challenge'
      managedBy: 'bicep'
    }
  }
}

// Cosmos DB Serverless using Azure Verified Module (conditional deployment)
module cosmosDb 'br/public:avm/res/document-db/database-account:0.8.1' = if (deployCosmosDb) {
  name: 'cosmosDbDeployment'
  params: {
    name: cosmosDbAccountName
    location: location
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilitiesToAdd: [
      'EnableServerless'
    ]
    sqlDatabases: [
      {
        name: cosmosDbDatabaseName
        containers: cosmosDbContainers
      }
    ]
    managedIdentities: {
      systemAssigned: true
    }
    tags: {
      environment: environment
      project: 'trivia-challenge'
      managedBy: 'bicep'
    }
  }
}

// App Service (Web App for Containers) using Azure Verified Module
module appService 'br/public:avm/res/web/site:0.3.9' = {
  name: 'appServiceDeployment'
  params: {
    name: appServiceName
    location: location
    kind: 'app,linux,container'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: environment == 'prod' ? true : false
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      acrUseManagedIdentityCreds: true
      appSettings: union([
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.outputs.loginServer}'
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'true'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
      ], deployCosmosDb ? [
        {
          name: 'CosmosDb__AccountEndpoint'
          value: cosmosDb.outputs.endpoint
        }
        {
          name: 'CosmosDb__DatabaseName'
          value: cosmosDbDatabaseName
        }
        {
          name: 'CosmosDb__UseIdentity'
          value: 'true'
        }
      ] : [])
    }
    httpsOnly: true
    clientAffinityEnabled: false
    managedIdentities: {
      systemAssigned: true
    }
    tags: {
      environment: environment
      project: 'trivia-challenge'
      managedBy: 'bicep'
    }
  }
}

// Role Assignment: Grant App Service managed identity AcrPull access to Container Registry
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, acrName, appServiceName, 'AcrPull')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull role
    principalId: appService.outputs.systemAssignedMIPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Reference to Cosmos DB account for role assignment
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' existing = if (deployCosmosDb) {
  name: cosmosDbAccountName
}

// Role Assignment: Grant App Service managed identity read/write access to Cosmos DB (conditional)
resource cosmosDbDataContributorRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = if (deployCosmosDb) {
  name: guid(resourceGroup().id, cosmosDbAccountName, appServiceName, 'CosmosDBDataContributor')
  parent: cosmosDbAccount
  properties: {
    roleDefinitionId: resourceId('Microsoft.DocumentDB/databaseAccounts/sqlRoleDefinitions', cosmosDbAccountName, '00000000-0000-0000-0000-000000000002') // Cosmos DB Built-in Data Contributor
    principalId: appService.outputs.systemAssignedMIPrincipalId
    scope: cosmosDbAccount.id
  }
}

// Outputs
@description('The name of the Container Registry')
output acrName string = acr.outputs.name

@description('The login server URL of the Container Registry')
output acrLoginServer string = acr.outputs.loginServer

@description('The resource ID of the Container Registry')
output acrResourceId string = acr.outputs.resourceId

@description('The name of the App Service Plan')
output appServicePlanName string = appServicePlan.outputs.name

@description('The resource ID of the App Service Plan')
output appServicePlanResourceId string = appServicePlan.outputs.resourceId

@description('The name of the App Service')
output appServiceName string = appService.outputs.name

@description('The default hostname of the App Service')
output appServiceHostname string = appService.outputs.defaultHostname

@description('The resource ID of the App Service')
output appServiceResourceId string = appService.outputs.resourceId

@description('The principal ID of the App Service managed identity')
output appServicePrincipalId string = appService.outputs.systemAssignedMIPrincipalId

@description('The name of the Cosmos DB account (only if deployed)')
output cosmosDbAccountName string = deployCosmosDb ? cosmosDb.outputs.name : ''

@description('The endpoint of the Cosmos DB account (only if deployed)')
output cosmosDbEndpoint string = deployCosmosDb ? cosmosDb.outputs.endpoint : ''

@description('The resource ID of the Cosmos DB account (only if deployed)')
output cosmosDbResourceId string = deployCosmosDb ? cosmosDb.outputs.resourceId : ''

@description('The principal ID of the Cosmos DB managed identity (only if deployed)')
output cosmosDbPrincipalId string = deployCosmosDb ? cosmosDb.outputs.systemAssignedMIPrincipalId : ''

@description('Whether Cosmos DB was deployed')
output cosmosDbDeployed bool = deployCosmosDb
