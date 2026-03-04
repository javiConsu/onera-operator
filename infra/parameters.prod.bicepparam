using './main.bicep'

// =============================================================================
// Production parameters for Onera Operator
// =============================================================================
// USAGE:
//   az deployment group create \
//     --resource-group onera-rg \
//     --template-file infra/main.bicep \
//     --parameters infra/parameters.prod.bicepparam \
//     --parameters pgAdminPassword='<YOUR_PG_PASSWORD>' \
//                  aiApiKey='<YOUR_AI_KEY>' \
//                  clerkPublishableKey='<YOUR_CLERK_PK>' \
//                  clerkSecretKey='<YOUR_CLERK_SK>'
// =============================================================================

param appName = 'onera'
param environment = 'prod'
param location = 'eastus'

// PostgreSQL
param pgAdminLogin = 'oneraadmin'
// pgAdminPassword — pass via CLI, don't store here

// AI Configuration
param aiProvider = 'openai'
param aiModel = 'gpt-4o'
param aiBaseUrl = ''
param aiAzureResourceName = ''
param aiAzureDeploymentName = ''
// aiApiKey — pass via CLI, don't store here

// Clerk — pass via CLI, don't store here
// clerkPublishableKey
// clerkSecretKey

// Exa
// exaApiKey — pass via CLI, don't store here
