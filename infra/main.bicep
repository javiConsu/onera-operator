// =============================================================================
// Onera Operator — Azure Infrastructure
// =============================================================================
// Frontend : Azure Static Web App (Standard)
// Backend  : Azure Web App (Linux, Node 20, B1)
// Database : Neon PostgreSQL (external)
// Redis    : Azure Cache for Redis — onera-redis (existing, different RG)
// =============================================================================

targetScope = 'resourceGroup'

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Base name for all resources')
param appName string = 'onera'

@description('Azure region')
param location string = resourceGroup().location

@description('Environment (dev | staging | prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@secure()
param databaseUrl string

@secure()
param redisUrl string

@secure()
param aiApiKey string

param aiProvider string = 'azure'
param aiModel string = 'gpt-4o'
param aiBaseUrl string = ''
param aiAzureResourceName string = ''
param aiAzureDeploymentName string = ''

@secure()
param exaApiKey string = ''

@secure()
param clerkPublishableKey string

@secure()
param clerkSecretKey string

param clerkSignInUrl string = '/login'
param clerkAfterSignInUrl string = '/dashboard'
param clerkAfterSignUpUrl string = '/new'
param clerkAfterSignOutUrl string = '/home'

// Custom domains
param frontendCustomDomain string = 'orchestrator.onera.chat'
param backendCustomDomain string = 'orchestrator-api.onera.chat'

// -----------------------------------------------------------------------------
// Variables
// -----------------------------------------------------------------------------

var prefix = '${appName}-${environment}'
var tags = { app: appName, environment: environment, managedBy: 'bicep' }

var frontendUrl = 'https://${frontendCustomDomain}'

// -----------------------------------------------------------------------------
// App Service Plan — Linux B1 (cheapest always-on)
// -----------------------------------------------------------------------------

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true  // required for Linux
  }
}

// -----------------------------------------------------------------------------
// Backend — Azure Web App (Node 20 LTS)
// -----------------------------------------------------------------------------

resource backendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-backend'
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      nodeVersion: '~20'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [frontendUrl, 'https://${prefix}-frontend.azurestaticapps.net']
        supportCredentials: true
      }
      appSettings: [
        { name: 'NODE_ENV',                   value: 'production' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        // Startup command — run migrations then start server
        { name: 'DATABASE_URL',               value: databaseUrl }
        { name: 'REDIS_URL',                  value: redisUrl }
        { name: 'AI_PROVIDER',                value: aiProvider }
        { name: 'AI_MODEL',                   value: aiModel }
        { name: 'AI_API_KEY',                 value: aiApiKey }
        { name: 'AI_BASE_URL',                value: aiBaseUrl }
        { name: 'AI_AZURE_RESOURCE_NAME',     value: aiAzureResourceName }
        { name: 'AI_AZURE_DEPLOYMENT_NAME',   value: aiAzureDeploymentName }
        { name: 'EXA_API_KEY',                value: exaApiKey }
        { name: 'FRONTEND_URL',               value: frontendUrl }
        { name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', value: clerkPublishableKey }
        { name: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',     value: clerkSignInUrl }
        { name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL', value: clerkAfterSignInUrl }
        { name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL', value: clerkAfterSignUpUrl }
        { name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL', value: clerkAfterSignOutUrl }
        { name: 'BACKEND_PORT',               value: '8080' }
        { name: 'PORT',                       value: '8080' }
        { name: 'AGENT_LOOP_INTERVAL_CRON',   value: '0 */4 * * *' }
        { name: 'DAILY_REPORT_CRON',          value: '0 18 * * *' }
        { name: 'CLERK_SECRET_KEY',           value: clerkSecretKey }
        // Health check
        { name: 'WEBSITE_HEALTHCHECK_MAXPINGFAILURES', value: '3' }
      ]
      healthCheckPath: '/api/health'
    }
  }
}

// Backend startup command — set separately so it's easy to update
resource backendConfig 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: backendApp
  name: 'web'
  properties: {
    appCommandLine: 'node packages/backend/dist/index.js'
  }
}

// -----------------------------------------------------------------------------
// Frontend — Azure Static Web App (Standard for custom domain + API proxy)
// -----------------------------------------------------------------------------

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-frontend'
  location: 'eastus2'   // SWA has limited regions; eastus2 is closest to eastus
  tags: tags
  sku: {
    name: 'Standard'    // Standard required for custom domains with SSL
    tier: 'Standard'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output backendAppName     string = backendApp.name
output backendDefaultUrl  string = 'https://${backendApp.properties.defaultHostName}'
output frontendAppName    string = staticWebApp.name
output frontendDefaultUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output appServicePlanName string = appServicePlan.name
// NOTE: Retrieve SWA deploy token after deployment with:
// az staticwebapp secrets list --name <name> --query "properties.apiKey" -o tsv
