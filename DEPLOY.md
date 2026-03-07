# Deploying Onera Operator to Azure

This guide covers deploying the full Onera Operator stack to Azure using Container Apps, managed PostgreSQL, managed Redis, and GitHub Actions CI/CD.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │          Azure Container Apps Environment    │
                    │                                             │
  Internet ──────► │  ┌─────────────┐    ┌──────────────────┐   │
                    │  │  Frontend   │    │    Backend        │   │
                    │  │  (Next.js)  │───►│    (Fastify)      │   │
                    │  │  :3000      │    │    :3001          │   │
                    │  └─────────────┘    └──────┬───────────┘   │
                    │                            │               │
                    └────────────────────────────┼───────────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                    ┌─────────▼──────┐  ┌───────▼────────┐  ┌─────▼─────┐
                    │  PostgreSQL    │  │  Redis (Cache)  │  │    ACR    │
                    │  Flexible Srv  │  │  Basic C0       │  │  (Images) │
                    │  B1ms          │  │                 │  │           │
                    └────────────────┘  └────────────────┘  └───────────┘
```

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in
- A GitHub repository with this code pushed
- A Clerk account with API keys
- An AI provider API key (OpenAI, Azure OpenAI, Anthropic, etc.)

## Step 1: Initial Azure Setup

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"

# Create the resource group
az group create --name onera-prod-rg --location eastus
```

## Step 2: Deploy Infrastructure

For the first deployment, run the Bicep template directly:

```bash
az deployment group create \
  --resource-group onera-prod-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.prod.bicepparam \
  --parameters \
    pgAdminPassword='<STRONG_PASSWORD_HERE>' \
    aiApiKey='<YOUR_AI_API_KEY>' \
    clerkPublishableKey='<YOUR_CLERK_PK>' \
    clerkSecretKey='<YOUR_CLERK_SK>'
```

This creates:
- Azure Container Registry (ACR)
- Azure Container Apps Environment + Log Analytics
- PostgreSQL 16 Flexible Server (Burstable B1ms, 32GB)
- Azure Cache for Redis (Basic C0)
- Backend Container App (0.5 vCPU, 1GB RAM, scales 1-3)
- Frontend Container App (0.25 vCPU, 0.5GB RAM, scales 1-5)

After deployment, note the outputs:

```bash
az deployment group show \
  --resource-group onera-prod-rg \
  --name main \
  --query properties.outputs
```

## Step 3: Get ACR Credentials

```bash
# Get ACR login server
ACR_NAME=$(az acr list --resource-group onera-prod-rg --query '[0].name' -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query 'passwords[0].value' -o tsv)

echo "ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER"
echo "ACR_USERNAME=$ACR_USERNAME"
echo "ACR_PASSWORD=$ACR_PASSWORD"
```

## Step 4: Create Azure Service Principal for GitHub Actions

```bash
# Create a service principal with Contributor access to the resource group
az ad sp create-for-rbac \
  --name "onera-github-deploy" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/onera-prod-rg \
  --sdk-auth
```

Save the JSON output — this is your `AZURE_CREDENTIALS` secret.

## Step 5: Configure GitHub Secrets

Go to your repo **Settings > Secrets and variables > Actions** and add:

### Required Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `AZURE_CREDENTIALS` | Service principal JSON from Step 4 | `{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}` |
| `ACR_LOGIN_SERVER` | ACR login server | `oneraprodacr.azurecr.io` |
| `ACR_USERNAME` | ACR admin username | `oneraprodacr` |
| `ACR_PASSWORD` | ACR admin password | From Step 3 |
| `PG_ADMIN_PASSWORD` | PostgreSQL admin password | Strong password |
| `DATABASE_URL` | Full Postgres connection string | `postgresql://oneraadmin:<PG_PASSWORD>@onera-prod-pg.postgres.database.azure.com:5432/onera?sslmode=require` |
| `AI_API_KEY` | AI provider API key | `sk-...` |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_...` |

### Optional Secrets

| Secret | Description | Default |
|--------|-------------|---------|
| `AZURE_LOCATION` | Azure region | `eastus` |
| `AI_PROVIDER` | AI provider | `openai` |
| `AI_MODEL` | AI model name | `gpt-4o` |
| `AI_BASE_URL` | Custom AI endpoint | (empty) |
| `AI_AZURE_RESOURCE_NAME` | Azure OpenAI resource | (empty) |
| `AI_AZURE_DEPLOYMENT_NAME` | Azure OpenAI deployment | (empty) |

## Step 6: Build and Push Initial Images

After secrets are configured, push to `main` to trigger the deployment pipeline. Or run manually:

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push from local machine (first time)
docker build -t $ACR_LOGIN_SERVER/onera-backend:latest -f packages/backend/Dockerfile .
docker push $ACR_LOGIN_SERVER/onera-backend:latest

docker build -t $ACR_LOGIN_SERVER/onera-frontend:latest -f packages/frontend/Dockerfile .
docker push $ACR_LOGIN_SERVER/onera-frontend:latest
```

## Step 7: Run Initial Database Migration

```bash
# Set DATABASE_URL to the Azure PostgreSQL connection string
export DATABASE_URL="postgresql://oneraadmin:<PG_PASSWORD>@onera-prod-pg.postgres.database.azure.com:5432/onera?sslmode=require"

pnpm install
pnpm db:generate
pnpm --filter @onera/database exec prisma migrate deploy
```

Or trigger the **Database Migration** workflow manually from the GitHub Actions tab.

## CI/CD Workflows

### Automatic (on push to `main`)

| Workflow | File | Trigger |
|----------|------|---------|
| **CI** | `.github/workflows/ci.yml` | Push to `main`/`develop`, PRs |
| **Deploy** | `.github/workflows/deploy.yml` | Push to `main` |

### Manual (workflow_dispatch)

| Workflow | File | Purpose |
|----------|------|---------|
| **Deploy** | `.github/workflows/deploy.yml` | Deploy to dev/staging/prod |
| **DB Migration** | `.github/workflows/db-migrate.yml` | Run/check/reset migrations |
| **Infra Preview** | `.github/workflows/infra-preview.yml` | Preview infra changes on PRs |

### Deploy Pipeline Stages

```
Push to main
  │
  ├─► CI (build + type-check)
  │
  └─► Deploy
       ├─► 1. Build & Push (Docker → ACR)
       ├─► 2. Deploy Infrastructure (Bicep)
       ├─► 3. Database Migrations (Prisma)
       ├─► 4. Update Container Apps (new images)
       └─► 5. Smoke Test (health checks)
```

## Cost Estimate (Monthly)

| Resource | SKU | ~Cost/month |
|----------|-----|-------------|
| Container Apps (backend) | 0.5 vCPU, 1GB, 1-3 replicas | $15-45 |
| Container Apps (frontend) | 0.25 vCPU, 0.5GB, 1-5 replicas | $8-40 |
| PostgreSQL Flexible Server | B1ms (1 vCPU, 2GB, 32GB storage) | ~$25 |
| Azure Cache for Redis | Basic C0 (250MB) | ~$16 |
| Container Registry | Basic | ~$5 |
| Log Analytics | Per-GB ingestion | ~$2-5 |
| **Total** | | **~$70-135/month** |

To reduce costs for dev/staging, set `minReplicas: 0` for Container Apps (they scale to zero when idle).

## Scaling

The Bicep template configures auto-scaling:
- **Backend:** 1-3 replicas, scales at 50 concurrent requests
- **Frontend:** 1-5 replicas, scales at 100 concurrent requests

To adjust, modify the `scale` blocks in `infra/main.bicep`.

## Troubleshooting

```bash
# View backend logs
az containerapp logs show \
  --name onera-prod-backend \
  --resource-group onera-prod-rg \
  --type console \
  --follow

# View frontend logs
az containerapp logs show \
  --name onera-prod-frontend \
  --resource-group onera-prod-rg \
  --type console \
  --follow

# Check backend health
curl https://<BACKEND_FQDN>/api/health

# Restart a container app
az containerapp revision restart \
  --name onera-prod-backend \
  --resource-group onera-prod-rg \
  --revision <REVISION_NAME>

# View all revisions
az containerapp revision list \
  --name onera-prod-backend \
  --resource-group onera-prod-rg \
  -o table
```
