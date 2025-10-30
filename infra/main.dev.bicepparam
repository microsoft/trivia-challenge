using './main.bicep'

// Load configuration from YAML file
// Usage: az deployment group create --parameters main.dev.bicepparam
var config = loadYamlContent('config.dev.yaml')

param namePrefix = config.namePrefix
param environment = config.environment
param deployCosmosDb = config.deployCosmosDb
param acrSku = config.acrSku
param appServicePlanSkuName = config.appServicePlanSkuName
param appServicePlanSkuTier = config.appServicePlanSkuTier
param containerImage = config.containerImage
