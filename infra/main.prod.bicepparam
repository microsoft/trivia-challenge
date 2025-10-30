using './main.bicep'

// Load configuration from YAML file
// Usage: az deployment group create --parameters main.prod.bicepparam
var config = loadYamlContent('config.prod.yaml')

param namePrefix = config.namePrefix
param environment = config.environment
param deployCosmosDb = config.deployCosmosDb
param acrSku = config.acrSku
param appServicePlanSkuName = config.appServicePlanSkuName
param appServicePlanSkuTier = config.appServicePlanSkuTier
param containerImage = config.containerImage
